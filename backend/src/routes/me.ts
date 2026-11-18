import type { FastifyInstance } from 'fastify';
import {
  listSellerListings,
  listUserOffers,
  listUserTickets,
  type Listing,
  type Offer,
  type Ticket,
} from '../db';

// Spec /me/* endpoints (fan-facing account area). Legacy /tickets,
// /offers/mine, /listings/mine keep working — these group them into the
// shapes the spec screens consume.
export async function meRoutes(app: FastifyInstance) {
  // GET /me/tickets → {upcoming:[{event,tickets[]}], past[], waiting, selling}
  app.get('/me/tickets', { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.sub;
    const [ticketsResult, listingsResult, offersResult] = await Promise.all([
      listUserTickets(userId, { limit: 400 }),
      listSellerListings(userId, { limit: 200 }),
      listUserOffers(userId, { limit: 200 }),
    ]);
    const nowMs = Date.now();

    const upcomingTickets: Ticket[] = [];
    const pastTickets: Ticket[] = [];
    for (const ticket of ticketsResult.items) {
      const isPast =
        ticket.status === 'USED' ||
        ticket.status === 'REFUNDED' ||
        ticket.status === 'TRANSFERRED' ||
        Date.parse(ticket.eventStartsAt) <= nowMs;
      if (isPast) pastTickets.push(ticket);
      else upcomingTickets.push(ticket);
    }

    // Group upcoming tickets by event for the wallet cards.
    const byEvent = new Map<string, Ticket[]>();
    for (const ticket of upcomingTickets) {
      const list = byEvent.get(ticket.eventId) ?? [];
      list.push(ticket);
      byEvent.set(ticket.eventId, list);
    }
    const upcoming = [...byEvent.entries()]
      .map(([eventId, tickets]) => ({
        event: {
          id: eventId,
          title: tickets[0].eventTitle,
          startsAt: tickets[0].eventStartsAt,
          starts_at: tickets[0].eventStartsAt,
          location: tickets[0].eventLocation,
        },
        tickets,
        count: tickets.length,
      }))
      .sort((a, b) => a.event.startsAt.localeCompare(b.event.startsAt));

    const pastByEvent = new Map<string, Ticket[]>();
    for (const ticket of pastTickets) {
      const list = pastByEvent.get(ticket.eventId) ?? [];
      list.push(ticket);
      pastByEvent.set(ticket.eventId, list);
    }
    const past = [...pastByEvent.entries()]
      .map(([eventId, tickets]) => ({
        event: {
          id: eventId,
          title: tickets[0].eventTitle,
          startsAt: tickets[0].eventStartsAt,
          starts_at: tickets[0].eventStartsAt,
          location: tickets[0].eventLocation,
        },
        tickets,
        count: tickets.length,
      }))
      .sort((a, b) => b.event.startsAt.localeCompare(a.event.startsAt));

    // "waiting" = active price watches; "selling" = live listings.
    const waiting = offersResult.items
      .filter((offer: Offer) => offer.status === 'ACTIVE' || offer.status === 'MATCHED')
      .map((offer) => ({
        ...offer,
        id: offer.id,
        event_id: offer.eventId,
        tier_name: offer.tierName,
        max_each_minor: offer.maxPriceCents,
        qty: offer.quantity,
        status: offer.status === 'MATCHED' ? 'matched' : 'active',
      }));

    const selling = listingsResult.items
      .filter((listing: Listing) => listing.status === 'ACTIVE' || listing.status === 'CHECKOUT')
      .map((listing) => ({
        ...listing,
        id: listing.groupId ?? listing.ticketCode,
        ticket_code: listing.ticketCode,
        event_id: listing.eventId,
        price_each_minor: listing.priceCents,
        split_rule: listing.splitRule ?? 'any',
        status: listing.status === 'CHECKOUT' ? 'checkout' : 'active',
      }));

    return { upcoming, past, waiting, selling };
  });
}
