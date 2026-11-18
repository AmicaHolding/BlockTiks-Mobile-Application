import type { FastifyInstance } from 'fastify';
import {
    canManageEvent,
    ConditionFailedError,
    createEventWithTiers,
    ensureSectionSeats,
    eventLifecycleState,
    getEvent,
    getEventMeta,
    getMembership,
    getReminder,
    getSection,
    getTier,
    linkEventToOrg,
    listActiveListings,
    listActiveListingsForTier,
    listCreatorEvents,
    listPublishedEvents,
    listSectionSeats,
    listSections,
    listUserOffers,
    listUserTickets,
    OrgError,
    publishEvent,
    setEventHost,
    setVenueLayout,
    updateEventFields,
    type VenueLayout,
} from '../db';
import { specError } from '../errors';

// Per-tier resale summary: {from_price,count} of ACTIVE listings in the tier.
function resaleSummaryForTier(
  tierId: string,
  tierName: string,
  listings: { tierId?: string; tierName: string; priceCents: number }[]
) {
  const inTier = listings.filter((l) =>
    l.tierId ? l.tierId === tierId : l.tierName === tierName
  );
  if (inTier.length === 0) return { from_price: null, fromPriceCents: null, count: 0 };
  const min = Math.min(...inTier.map((l) => l.priceCents));
  return { from_price: min, fromPriceCents: min, count: inTier.length };
}

export async function eventRoutes(app: FastifyInstance) {
  // GET /events, published events, optional ?category=, ?q=, ?cursor=, ?limit=
  app.get('/events', async (request) => {
    const { category, q, limit, cursor } = request.query as {
      category?: string;
      q?: string;
      limit?: string;
      cursor?: string;
    };
    const results = await listPublishedEvents({
      category,
      q,
      limit: limit ? Math.min(parseInt(limit, 10) || 50, 100) : 50,
      cursor,
    });
    return {
      nextCursor: results.nextCursor,
      events: results.items.map(({ event, tiers }) => ({
        ...event,
        tiers: tiers.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          priceCents: t.priceCents,
          price: t.priceCents / 100, // convenience dollars for the app
          quantity: t.quantity,
          sold: t.sold,
          available: t.available ?? t.quantity - t.sold,
          remaining: Math.max(0, t.available ?? t.quantity - t.sold),
        })),
      })),
    };
  });

  // GET /events/mine, events created by the current user (any status),
  // enriched with tiers so Studio can compute sales without N+1 detail calls.
  app.get('/events/mine', { preHandler: app.authenticate }, async (request) => {
    const events = await listCreatorEvents(request.user.sub);
    const detailed = await Promise.all(
      events.map(async (event) => {
        const result = await getEvent(event.id);
        if (!result) return null;
        const sections = result.event.venueLayout ? await listSections(event.id) : [];
        return { result, sections };
      })
    );
    return {
      events: detailed
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .map(({ result, sections }) => {
          const sectionById = new Map(sections.map((section) => [section.sectionId, section]));
          return {
            ...result.event,
            tiers: result.tiers.map((t) => ({
              id: t.id,
              name: t.name,
              description: t.description,
              priceCents: t.priceCents,
              price: t.priceCents / 100,
              quantity: t.quantity,
              sold: t.sold,
              available: t.available ?? t.quantity - t.sold,
              remaining: Math.max(0, t.available ?? t.quantity - t.sold),
            })),
            venueSections: (result.event.venueLayout?.sections ?? []).map((section) => {
              const inventory = sectionById.get(section.id);
              return {
                ...section,
                sold: inventory?.sold ?? 0,
                available: inventory?.available ?? section.capacity,
                remaining: Math.max(0, inventory?.available ?? section.capacity),
              };
            }),
          };
        }),
    };
  });

  // GET /events/:id, event detail with tiers (+ venue sections when the
  // organizer configured a layout). Optionally authed: `my` carries the
  // caller's tickets / reminder / price watch for this event.
  app.get('/events/:id', { preHandler: app.authenticateOptional }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getEvent(id);
    if (!result) return reply.status(404).send({ message: 'Event not found' });
    const sections = result.event.venueLayout
      ? await listSections(id)
      : [];
    const sectionById = new Map(sections.map((s) => [s.sectionId, s]));
    const listings = await listActiveListings(id).catch(() => []);

    // `my`: caller-specific state on the event page.
    let my: unknown;
    if (request.user?.sub) {
      const userId = request.user.sub;
      const [ticketsResult, reminder, offersResult] = await Promise.all([
        listUserTickets(userId, { limit: 200 }),
        getReminder(userId, id),
        listUserOffers(userId, { limit: 200 }),
      ]);
      const myTickets = ticketsResult.items.filter((t) => t.eventId === id);
      const myWatch = offersResult.items.find(
        (o) => o.eventId === id && o.status === 'ACTIVE'
      );
      my = {
        tickets: myTickets.map((t) => ({ code: t.code, tierName: t.tierName, status: t.status })),
        ticket_count: myTickets.length,
        reminder: Boolean(reminder),
        watch: myWatch ?? null,
      };
    }

    return {
      event: {
        ...result.event,
        // E1 derived lifecycle state (additive — `status` is unchanged).
        state: eventLifecycleState(result.event, result.tiers),
        tiers: result.tiers.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          priceCents: t.priceCents,
          price: t.priceCents / 100,
          quantity: t.quantity,
          sold: t.sold,
          available: t.available ?? t.quantity - t.sold,
          remaining: Math.max(0, t.available ?? t.quantity - t.sold),
          // R7: resale summary inside the tier on the event page.
          resale: resaleSummaryForTier(t.id, t.name, listings),
        })),
        // Live availability per venue section, merged onto the layout.
        venueSections: (result.event.venueLayout?.sections ?? []).map((s) => {
          const inv = sectionById.get(s.id);
          return {
            ...s,
            sold: inv?.sold ?? 0,
            available: inv?.available ?? s.capacity,
            remaining: Math.max(0, inv?.available ?? s.capacity),
          };
        }),
      },
      ...(my ? { my } : {}),
    };
  });

  // GET /events/:id/tiers/:tier/listings — resale listings inside a tier,
  // cheapest first (R7), excluding the caller's own listings.
  app.get(
    '/events/:id/tiers/:tier/listings',
    { preHandler: app.authenticateOptional },
    async (request, reply) => {
      const { id, tier } = request.params as { id: string; tier: string };
      const tierRow = await getTier(tier, id);
      if (!tierRow) return specError(reply, 404, 'not_found', 'Tier not found');
      const listings = await listActiveListingsForTier(id, tier, tierRow.name);
      const visible = listings.filter((l) => l.sellerId !== request.user?.sub);
      return {
        listings: visible.map((l) => ({
          listing_id: l.groupId ?? l.ticketCode,
          ticket_code: l.ticketCode,
          price_each: l.priceCents,
          price_each_minor: l.priceCents,
          currency: l.currency,
          qty: 1,
          split_rule: l.splitRule ?? 'any',
          tier_id: l.tierId,
          tier_name: l.tierName,
          // legacy clients read these:
          ...l,
        })),
      };
    }
  );

  // GET /events/:id/seats?sectionId=, seat-level availability for a venue
  // section. Materializes seat rows lazily on first access.
  app.get('/events/:id/seats', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sectionId } = request.query as { sectionId?: string };
    if (!sectionId) return reply.status(400).send({ message: 'sectionId is required' });
    const result = await getEvent(id);
    if (!result) return reply.status(404).send({ message: 'Event not found' });
    if (result.event.status !== 'PUBLISHED') {
      return reply.status(400).send({ message: 'Event is not on sale' });
    }
    const layoutSection = result.event.venueLayout?.sections.find((s) => s.id === sectionId);
    if (!layoutSection) return reply.status(404).send({ message: 'Section not found' });
    const section = await getSection(id, sectionId);
    if (!section) return reply.status(404).send({ message: 'Section not found' });
    await ensureSectionSeats(id, { ...layoutSection, priceCents: section.priceCents, capacity: section.capacity });
    const seats = await listSectionSeats(id, sectionId);
    return { sectionId, seats, currency: result.event.currency ?? 'usd' };
  });

  // PATCH /events/:id — venue layout (seated events) plus general Studio
  // field edits. E3 guards (date/venue locked after first sale) live inside
  // updateEventFields; org-owned events route through canManageEvent.
  app.patch(
    '/events/:id',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            category: { type: 'string' },
            startsAt: { type: 'string' },
            starts_at: { type: 'string' },
            endsAt: { type: 'string' },
            doorsAt: { type: 'string' },
            location: { type: 'string' },
            address: { type: 'string' },
            imageUrl: { type: 'string' },
            venueLayout: {
              type: 'object',
              required: ['sections'],
              properties: {
                sections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['id', 'name', 'priceCents', 'capacity'],
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      priceCents: { type: 'integer', minimum: 0 },
                      capacity: { type: 'integer', minimum: 1 },
                      rows: { type: 'integer', minimum: 0 },
                      seatsPerRow: { type: 'integer', minimum: 0 },
                      accessibleCount: { type: 'integer', minimum: 0 },
                      heldCount: { type: 'integer', minimum: 0 },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        venueLayout?: VenueLayout;
        title?: string;
        description?: string;
        category?: string;
        startsAt?: string;
        starts_at?: string;
        endsAt?: string;
        doorsAt?: string;
        location?: string;
        address?: string;
        imageUrl?: string;
      };
      const event = await getEventMeta(id);
      if (!event) return reply.status(404).send({ message: 'Event not found' });
      if (!(await canManageEvent(event, request.user.sub, request.user.role))) {
        return specError(reply, 403, 'forbidden', 'You cannot manage this event');
      }
      try {
        if (body.venueLayout) {
          const updated = await setVenueLayout(id, request.user.sub, request.user.role, body.venueLayout);
          if (!updated) return reply.status(404).send({ message: 'Event not found' });
          return { event: updated };
        }
        const updated = await updateEventFields(id, {
          title: body.title,
          description: body.description,
          category: body.category,
          startsAt: body.startsAt ?? body.starts_at,
          endsAt: body.endsAt,
          doorsAt: body.doorsAt,
          location: body.location,
          address: body.address,
          imageUrl: body.imageUrl,
        });
        return { event: updated };
      } catch (e) {
        if (e instanceof ConditionFailedError) {
          return reply.status(403).send({ message: e.message });
        }
        if (e instanceof OrgError) {
          return specError(reply, e.code === 'has_sales' ? 409 : 400, e.code, e.message);
        }
        throw e;
      }
    }
  );

  // POST /events, creator creates an event (starts as DRAFT)
  app.post(
    '/events',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['title', 'description', 'category', 'startsAt', 'location'],
          properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            category: { type: 'string' },
            startsAt: { type: 'string' },
            endsAt: { type: 'string' },
            location: { type: 'string' },
            address: { type: 'string' },
            imageUrl: { type: 'string' },
            currency: { type: 'string', pattern: '^[a-zA-Z]{3}$' },
            tiers: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'priceCents', 'quantity'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  priceCents: { type: 'integer', minimum: 0 },
                  quantity: { type: 'integer', minimum: 1 },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // Studio creates events under an org (X-Org-Id + active admin/cohost
      // membership). Without the header the legacy creator flow applies.
      const orgIdHeader = request.headers['x-org-id'];
      let ownerOrgId: string | undefined;
      if (orgIdHeader && typeof orgIdHeader === 'string') {
        const membership = await getMembership(request.user.sub, orgIdHeader);
        if (!membership) {
          return specError(reply, 403, 'not_member', 'You are not a member of this organisation');
        }
        if (membership.role === 'gate') {
          return specError(reply, 403, 'forbidden', 'Gate staff cannot create events');
        }
        ownerOrgId = orgIdHeader;
      } else if (request.user.role !== 'CREATOR' && request.user.role !== 'ADMIN') {
        return reply.status(403).send({ message: 'Creator access required' });
      }
      const body = request.body as {
        title: string;
        description: string;
        category: string;
        startsAt: string;
        endsAt?: string;
        location: string;
        address?: string;
        imageUrl?: string;
        currency?: string;
        tiers?: { name: string; description?: string; priceCents: number; quantity: number }[];
      };

      const { event, tiers } = await createEventWithTiers({
        creatorId: request.user.sub,
        ownerOrgId,
        title: body.title,
        description: body.description,
        category: body.category,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        location: body.location,
        address: body.address,
        imageUrl: body.imageUrl,
        currency: body.currency,
        tiers: body.tiers ?? [],
      });
      if (ownerOrgId) {
        // Org event pointer (GET /orgs/{id}/events) + the owner split row
        // (100% until co-hosts are added).
        await linkEventToOrg(event.id, ownerOrgId);
        await setEventHost({ eventId: event.id, orgId: ownerOrgId, role: 'owner', splitBps: 10000 });
      }

      return reply.status(201).send({ event: { ...event, tiers } });
    }
  );

  // POST /events/:id/publish — creator or org admin/cohost publishes a draft.
  // publishEvent enforces canManageEvent + org gates (org_unverified, no_tiers,
  // splits_not_accepted).
  app.post('/events/:id/publish', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const event = await publishEvent(id, request.user.sub, request.user.role);
      if (!event) return reply.status(404).send({ message: 'Event not found' });
      return { event };
    } catch (e) {
      if (e instanceof ConditionFailedError) {
        const specCodes = new Set(['no_tiers', 'org_unverified', 'splits_not_accepted']);
        if (specCodes.has(e.message)) {
          return specError(reply, e.message === 'splits_not_accepted' ? 409 : 400, e.message, {
            no_tiers: 'Event needs at least one ticket tier',
            org_unverified: 'Organisation must be verified before publishing',
            splits_not_accepted: 'All co-hosts must accept their splits before publishing',
          }[e.message]!);
        }
        return reply.status(e.message === 'Not the event creator' ? 403 : 400).send({
          message: e.message,
        });
      }
      throw e;
    }
  });
}
