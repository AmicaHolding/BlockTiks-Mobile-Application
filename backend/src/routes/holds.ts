import type { FastifyInstance } from 'fastify';
import { allInPrice, feeInsidePrice } from '../db/v3';
import {
  claimListingForCheckout,
  convertHold,
  createHold,
  createPendingOrder,
  ensureSectionSeats,
  eventLifecycleState,
  getEvent,
  getEventMeta,
  getIdempotentResponse,
  getListing,
  getSection,
  getTier,
  getUsableHold,
  getUserById,
  recordIdempotentResponse,
  releaseConvertedHold,
  releaseListingCheckout,
  releaseOrder,
  releaseSeats,
  releaseSectionHold,
  releaseTierHold,
  reserveSeats,
  reserveSectionSeats,
  reserveTickets,
  setOrderPaymentIntent,
  type Hold,
  type HoldLine,
  type Order,
} from '../db';
import { env } from '../env';
import { specError } from '../errors';
import { promoDiscountCents, validatePromoForCheckout } from '../promo';
import { getStripe } from '../stripe';

const MAX_PER_ORDER = 6; // B1

interface QuoteShape {
  subtotal_minor: number;
  fee_minor: number;
  discount_minor: number;
  tax_minor: number;
  total_minor: number;
  currency: string;
}

// P1/P2/P6: total = subtotal + fee − discount, with VAT extracted from the
// all-in subtotal per the event's country (decision-13 default: prices are
// tax-inclusive, so tax_minor is the VAT portion inside subtotal−discount,
// not added on top).
// TODO(decision-13): if the business switches to additive tax, add
// tax_minor to total_minor instead of extracting.
export function computeQuote(input: {
  subtotalCents: number;
  discountCents: number;
  currency: string;
  country?: string;
}): QuoteShape {
  const taxable = Math.max(0, input.subtotalCents - input.discountCents);
  const rate = input.country ? env.taxRates[input.country.toUpperCase()] ?? 0 : 0;
  const taxMinor = rate > 0 ? Math.round((taxable * rate) / (100 + rate)) : 0;
  // v3 all-in pricing (F1/F2): the shown subtotal is what the buyer pays;
  // the 7% fee is inside it. Legacy mode keeps the additive 5% fee.
  const feeMinor = env.allInPricing
    ? feeInsidePrice(taxable)
    : Math.round((input.subtotalCents * env.platformFeePercent) / 100);
  return {
    subtotal_minor: input.subtotalCents,
    fee_minor: feeMinor,
    discount_minor: input.discountCents,
    tax_minor: taxMinor,
    total_minor: env.allInPricing
      ? taxable
      : input.subtotalCents + feeMinor - input.discountCents,
    currency: input.currency,
  };
}

function holdSubtotal(hold: Hold): { subtotalCents: number; hasResale: boolean } {
  let subtotalCents = 0;
  let hasResale = false;
  for (const line of hold.lines) {
    subtotalCents += line.unitPriceCents * line.qty;
    if (line.listingCode) hasResale = true;
  }
  return { subtotalCents, hasResale };
}

export async function holdRoutes(app: FastifyInstance) {
  // POST /holds — reserve inventory for checkout (decision-16: 10-min hold).
  // Accepts the spec's snake_case and the clients' camelCase field names.
  app.post(
    '/holds',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          properties: {
            event_id: { type: 'string' },
            eventId: { type: 'string' },
            age_confirmed: { type: 'boolean' },
            lines: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                properties: {
                  tier_id: { type: 'string' },
                  tierId: { type: 'string' },
                  section_id: { type: 'string' },
                  sectionId: { type: 'string' },
                  listing_id: { type: 'string' },
                  listingCode: { type: 'string' },
                  qty: { type: 'integer', minimum: 1 },
                  quantity: { type: 'integer', minimum: 1 },
                  seat_ids: { type: 'array', items: { type: 'string' }, maxItems: 6 },
                  seatIds: { type: 'array', items: { type: 'string' }, maxItems: 6 },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        event_id?: string;
        eventId?: string;
        age_confirmed?: boolean;
        lines?: {
          tier_id?: string; tierId?: string;
          section_id?: string; sectionId?: string;
          listing_id?: string; listingCode?: string;
          qty?: number; quantity?: number;
          seat_ids?: string[]; seatIds?: string[];
        }[];
      };
      const eventId = body.event_id ?? body.eventId;
      if (!eventId || !body.lines?.length) {
        return specError(reply, 400, 'bad_request', 'event_id and lines are required');
      }
      const eventResult = await getEvent(eventId);
      if (!eventResult) return specError(reply, 404, 'not_found', 'Event not found');
      const event = eventResult.event;
      const state = eventLifecycleState(event, eventResult.tiers);
      if (state === 'scheduled' || event.status !== 'PUBLISHED') {
        return specError(reply, 400, 'not_on_sale', 'Event is not on sale');
      }

      const lines = body.lines.map((l) => ({
        tierId: l.tier_id ?? l.tierId,
        sectionId: l.section_id ?? l.sectionId,
        listingCode: l.listing_id ?? l.listingCode,
        qty: l.qty ?? l.quantity ?? 1,
        seatIds: l.seat_ids ?? l.seatIds,
      }));
      const totalQty = lines.reduce((sum, l) => sum + l.qty, 0);
      if (totalQty > MAX_PER_ORDER) {
        return specError(reply, 400, 'max_per_order', `Maximum ${MAX_PER_ORDER} tickets per order`);
      }

      // decision-15: age-restricted events need a DOB on the account plus a
      // checkout confirmation. TODO(decision-15): ID verification is out of
      // scope — a confirmed flag without a DOB is accepted for now.
      if (event.minAge) {
        const user = await getUserById(request.user.sub);
        const dobMs = user?.dateOfBirth ? Date.parse(user.dateOfBirth) : NaN;
        const ageOk = !Number.isNaN(dobMs)
          ? Math.floor((Date.now() - dobMs) / (365.25 * 24 * 3600_000)) >= event.minAge
          : false;
        if (!ageOk && !body.age_confirmed) {
          return specError(
            reply,
            403,
            'age_restricted',
            `This event is ${event.minAge}+ — confirm your date of birth`,
            'dob'
          );
        }
      }

      // Reserve each line; compensate earlier lines if a later one fails.
      const compensate: (() => Promise<void>)[] = [];
      const holdLines: HoldLine[] = [];
      const fail = async (status: number, code: string, message: string) => {
        for (const undo of compensate.reverse()) await undo().catch(() => undefined);
        return specError(reply, status, code, message);
      };

      for (const line of lines) {
        if (line.listingCode) {
          const listing = await getListing(line.listingCode);
          if (!listing || listing.status !== 'ACTIVE') {
            return fail(410, 'listing_gone', 'That listing is no longer available');
          }
          if (listing.sellerId === request.user.sub) {
            return fail(400, 'own_listing', 'You cannot buy your own listing');
          }
          const claimed = await claimListingForCheckout(line.listingCode);
          if (!claimed) return fail(410, 'listing_gone', 'That listing was just sold');
          compensate.push(() => releaseListingCheckout(line.listingCode!));
          holdLines.push({
            listingCode: line.listingCode,
            qty: 1,
            unitPriceCents: env.allInPricing ? allInPrice(listing.priceCents) : listing.priceCents,
            faceUnitCents: listing.priceCents,
            tierName: listing.tierName,
          });
          continue;
        }

        if (line.sectionId) {
          const section = await getSection(eventId, line.sectionId);
          if (!section) return fail(404, 'not_found', 'Section not found');
          const held = await reserveSectionSeats(eventId, line.sectionId, line.qty);
          if (!held) return fail(409, 'insufficient_inventory', 'Not enough seats remaining');
          compensate.push(() => releaseSectionHold(eventId, line.sectionId!, line.qty));
          const seatIds = line.seatIds?.map((s) => s.trim()).filter(Boolean);
          if (seatIds?.length) {
            if (seatIds.length !== line.qty || new Set(seatIds).size !== seatIds.length) {
              return fail(400, 'seat_taken', 'Seat selection does not match quantity');
            }
            const layoutSection = event.venueLayout?.sections.find((s) => s.id === line.sectionId);
            if (layoutSection) {
              await ensureSectionSeats(eventId, {
                ...layoutSection,
                priceCents: section.priceCents,
                capacity: section.capacity,
              });
            }
            const seatsHeld = await reserveSeats(eventId, line.sectionId, seatIds);
            if (!seatsHeld) return fail(409, 'seat_taken', 'One or more seats are no longer available');
            compensate.push(() => releaseSeats(eventId, line.sectionId!, seatIds));
          }
          holdLines.push({
            sectionId: line.sectionId,
            sectionName: section.name,
            tierName: section.name,
            qty: line.qty,
            unitPriceCents: env.allInPricing ? allInPrice(section.priceCents) : section.priceCents,
            faceUnitCents: section.priceCents,
            seatLabels: seatIds?.length ? seatIds : undefined,
          });
          continue;
        }

        if (line.tierId) {
          const tier: Awaited<ReturnType<typeof getTier>> =
            eventResult.tiers.find((t) => t.id === line.tierId) ??
            (await getTier(line.tierId, eventId));
          if (!tier || tier.eventId !== eventId) {
            return fail(404, 'not_found', 'Ticket tier not found');
          }
          const nowMs = Date.now();
          if (tier.saleStartsAt && Date.parse(tier.saleStartsAt) > nowMs) {
            return fail(400, 'not_on_sale', 'Ticket sales have not started yet');
          }
          if (tier.saleEndsAt && Date.parse(tier.saleEndsAt) <= nowMs) {
            return fail(400, 'not_on_sale', 'Ticket sales for this tier have ended');
          }
          const held = await reserveTickets(eventId, line.tierId, line.qty);
          if (!held) return fail(409, 'insufficient_inventory', 'Not enough tickets remaining');
          compensate.push(() => releaseTierHold(eventId, line.tierId!, line.qty));
          holdLines.push({
            tierId: line.tierId,
            tierName: tier.name,
            qty: line.qty,
            unitPriceCents: env.allInPricing ? allInPrice(tier.priceCents) : tier.priceCents,
            faceUnitCents: tier.priceCents,
          });
          continue;
        }

        return fail(400, 'bad_request', 'Each line needs tier_id, section_id, or listing_id');
      }

      const expiresAt = new Date(Date.now() + env.holdTtlMinutes * 60_000).toISOString();
      const hold = await createHold({
        userId: request.user.sub,
        eventId,
        lines: holdLines,
        expiresAt,
      });
      const { subtotalCents } = holdSubtotal(hold);
      const quote = computeQuote({
        subtotalCents,
        discountCents: 0,
        currency: event.currency ?? 'usd',
        country: event.country,
      });
      return reply.status(201).send({
        hold_id: hold.id,
        id: hold.id,
        status: 'active',
        expires_at: hold.expiresAt,
        lines: hold.lines,
        quote,
      });
    }
  );

  // GET /holds/:id/quote?promo= — price preview incl. promo validation.
  app.get('/holds/:id/quote', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { promo } = request.query as { promo?: string };
    const hold = await getUsableHold(id);
    if (!hold || hold.userId !== request.user.sub) {
      return specError(reply, 404, 'not_found', 'Hold not found');
    }
    if (hold.status !== 'ACTIVE') {
      return specError(reply, 410, 'hold_expired', 'This hold has expired');
    }
    const event = await getEventMeta(hold.eventId);
    const { subtotalCents, hasResale } = holdSubtotal(hold);

    let discountCents = 0;
    let promoResult: { ok: boolean; message: string } = { ok: true, message: '' };
    if (promo?.trim()) {
      const check = await validatePromoForCheckout({
        code: promo.trim(),
        userId: request.user.sub,
        eventId: hold.eventId,
        hasResale,
      });
      if (!check.ok) {
        return specError(reply, 400, check.code, check.message, 'promo');
      }
      discountCents = promoDiscountCents(check.promo, subtotalCents);
      promoResult = { ok: true, message: `Code ${check.promo.code} applied` };
    } else {
      promoResult = { ok: true, message: '' };
    }

    const quote = computeQuote({
      subtotalCents,
      discountCents,
      currency: event?.currency ?? 'usd',
      country: event?.country,
    });
    return { ...quote, promo: promoResult, expires_at: hold.expiresAt };
  });

  // POST /orders — pay for a hold. Idempotent per Idempotency-Key (P4): a
  // retry returns the original order with duplicate:true.
  app.post(
    '/orders',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['hold_id'],
          properties: {
            hold_id: { type: 'string' },
            holdId: { type: 'string' },
            payment_method_id: { type: 'string' },
            paymentMethodId: { type: 'string' },
            promo: { type: 'string' },
            promoCode: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as {
        hold_id?: string;
        holdId?: string;
        payment_method_id?: string;
        paymentMethodId?: string;
        promo?: string;
        promoCode?: string;
      };
      const holdId = body.hold_id ?? body.holdId;
      const paymentMethodId = body.payment_method_id ?? body.paymentMethodId;
      const promoText = (body.promo ?? body.promoCode)?.trim();
      if (!holdId) return specError(reply, 400, 'bad_request', 'hold_id is required', 'hold_id');

      const userId = request.user.sub;
      const idemKey = (request.headers['idempotency-key'] as string | undefined)?.trim();
      if (idemKey) {
        const prior = await getIdempotentResponse(userId, idemKey);
        if (prior) return { ...prior.response, duplicate: true };
      }

      const hold = await getUsableHold(holdId);
      if (!hold || hold.userId !== userId) {
        return specError(reply, 404, 'not_found', 'Hold not found');
      }
      if (hold.status !== 'ACTIVE') {
        return specError(reply, 410, 'hold_expired', 'This hold has expired');
      }

      const event = await getEventMeta(hold.eventId);
      if (!event) return specError(reply, 404, 'not_found', 'Event not found');
      const { subtotalCents, hasResale } = holdSubtotal(hold);

      let discountCents = 0;
      let promoCodeText: string | undefined;
      if (promoText) {
        const check = await validatePromoForCheckout({
          code: promoText,
          userId,
          eventId: hold.eventId,
          hasResale,
          tierId: hold.lines.find((l) => l.tierId)?.tierId,
        });
        if (!check.ok) return specError(reply, 400, check.code, check.message, 'promo');
        discountCents = promoDiscountCents(check.promo, subtotalCents);
        promoCodeText = check.promo.code;
      }

      const quote = computeQuote({
        subtotalCents,
        discountCents,
        currency: event.currency ?? 'usd',
        country: event.country,
      });

      // Convert the hold first: the order then owns the reservation. If the
      // flip fails the hold was concurrently expired/consumed → hold_expired.
      const converted = await convertHold(hold.id);
      if (!converted) return specError(reply, 410, 'hold_expired', 'This hold has expired');

      const orderItems = hold.lines.map((line) => ({
        tierId: line.tierId,
        sectionId: line.sectionId,
        sectionName: line.sectionName,
        ticketCode: line.listingCode,
        seatLabels: line.seatLabels,
        tierName: line.tierName ?? line.sectionName ?? 'Ticket',
        quantity: line.qty,
        unitPriceCents: line.unitPriceCents,
        faceUnitCents: line.faceUnitCents,
      }));
      const kind = hold.lines.some((l) => l.listingCode)
        ? 'RESALE'
        : hold.lines.some((l) => l.sectionId)
          ? 'SEATED'
          : 'TICKET';

      let order: Order | undefined;
      try {
        order = await createPendingOrder({
          userId,
          eventId: hold.eventId,
          kind,
          holdId: hold.id,
          items: orderItems,
          subtotalCents,
          discountCents,
          feesCents: quote.fee_minor,
          taxCents: quote.tax_minor,
          faceSubtotalCents: hold.lines.reduce(
            (s, l) => s + (l.faceUnitCents ?? l.unitPriceCents) * l.qty,
            0
          ),
          totalCents: quote.total_minor,
          promoCodeText,
          currency: quote.currency,
          expiresAt: new Date(Date.now() + env.reservationTtlMinutes * 60_000).toISOString(),
        });
      } catch (err) {
        await releaseConvertedHold(hold.id).catch(() => undefined);
        throw err;
      }

      let paymentIntent;
      try {
        paymentIntent = await getStripe().paymentIntents.create(
          {
            amount: quote.total_minor,
            currency: quote.currency,
            automatic_payment_methods: { enabled: true },
            // A saved method can be attached; the client still confirms via
            // client_secret (3DS etc.).
            ...(paymentMethodId ? { payment_method: paymentMethodId } : {}),
            metadata: { orderId: order.id, userId, eventId: hold.eventId, kind },
          },
          { idempotencyKey: `order-${order.id}` }
        );
      } catch (err) {
        // P4: a decline creates no tickets and the buyer sees "Nothing was
        // charged" — release the order + inventory hold.
        await releaseOrder(order.id, 'FAILED').catch(() => undefined);
        app.log.warn(err, 'payment intent creation failed');
        return specError(reply, 402, 'payment_declined', 'Payment was declined — nothing was charged');
      }

      await setOrderPaymentIntent(order.id, paymentIntent.id);
      const response = {
        order: { ...order, clientSecret: paymentIntent.client_secret },
        client_secret: paymentIntent.client_secret,
        quote,
      };
      if (idemKey) {
        await recordIdempotentResponse(userId, idemKey, order.id, {
          order: response.order,
          client_secret: response.client_secret,
          quote: response.quote,
        });
      }
      return reply.status(201).send(response);
    }
  );
}
