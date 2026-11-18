import type { FastifyInstance } from 'fastify';
import {
  getInvites,
  getUserById,
  listHostedInvites,
  listSellerListings,
  listUserOffers,
  listUserRsvps,
  listUserTickets,
  type Listing,
  type Offer,
  type Ticket,
} from '../db';
import { displayName, initials, inviteBody, listPendingInviteCards, rsvpBody } from './invites';

const isPastTicket = (ticket: Ticket, nowMs: number) =>
  ticket.status === 'USED' ||
  ticket.status === 'REFUNDED' ||
  ticket.status === 'TRANSFERRED' ||
  ticket.status === 'VOID' ||
  Date.parse(ticket.eventStartsAt) <= nowMs;

function groupByEvent(tickets: Ticket[]) {
  const byEvent = new Map<string, Ticket[]>();
  for (const ticket of tickets) {
    const list = byEvent.get(ticket.eventId) ?? [];
    list.push(ticket);
    byEvent.set(ticket.eventId, list);
  }
  return [...byEvent.entries()].map(([eventId, group]) => ({
    event: {
      id: eventId,
      title: group[0].eventTitle,
      startsAt: group[0].eventStartsAt,
      starts_at: group[0].eventStartsAt,
      location: group[0].eventLocation,
    },
    tickets: group,
    count: group.length,
  }));
}

function watchBody(offer: Offer) {
  return {
    ...offer,
    id: offer.id,
    event_id: offer.eventId,
    tier_name: offer.tierName,
    max_each_minor: offer.maxPriceCents,
    qty: offer.quantity,
    status: offer.status === 'MATCHED' ? 'matched' : 'active',
  };
}

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

  // GET /me/plans (I10) — tickets, RSVPs (Going/Maybe/Requested) and hosted
  // invites in one list sorted by start; unanswered invites sit above it.
  app.get('/me/plans', { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.sub;
    const [ticketsResult, offersResult, rsvps, hosted] = await Promise.all([
      listUserTickets(userId, { limit: 400 }),
      listUserOffers(userId, { limit: 200 }),
      listUserRsvps(userId),
      listHostedInvites(userId),
    ]);
    const nowMs = Date.now();
    type PlanItem = { kind: 'ticket' | 'rsvp' | 'hosting'; starts_at: string | null; [k: string]: unknown };
    const upcoming: PlanItem[] = [];
    const past: PlanItem[] = [];
    const isPastAt = (iso?: string | null) => Boolean(iso) && Date.parse(iso!) <= nowMs;

    const tickets = ticketsResult.items;
    for (const g of groupByEvent(tickets.filter((t) => !isPastTicket(t, nowMs)))) {
      upcoming.push({ kind: 'ticket', starts_at: g.event.starts_at, ...g });
    }
    for (const g of groupByEvent(tickets.filter((t) => isPastTicket(t, nowMs)))) {
      past.push({ kind: 'ticket', starts_at: g.event.starts_at, ...g });
    }

    const active = rsvps.filter((r) => r.status === 'going' || r.status === 'maybe' || r.status === 'requested');
    const invites = new Map((await getInvites(active.map((r) => r.inviteId))).map((i) => [i.id, i]));
    const hosts = new Map(
      (await Promise.all([...new Set([...invites.values()].map((i) => i.hostUserId))].map((id) => getUserById(id))))
        .filter((u): u is NonNullable<typeof u> => Boolean(u))
        .map((u) => [u.id, u])
    );
    for (const r of active) {
      const invite = invites.get(r.inviteId);
      if (!invite || invite.status !== 'active') continue;
      const name = displayName(hosts.get(invite.hostUserId));
      const item: PlanItem = {
        kind: 'rsvp',
        starts_at: invite.startsAt ?? null,
        invite: { ...inviteBody(invite, { isHost: false, myStatus: r.status }), host: { name, initials: initials(name) } },
        rsvp: rsvpBody(r),
      };
      (isPastAt(invite.startsAt) ? past : upcoming).push(item);
    }
    for (const invite of hosted) {
      if (invite.status !== 'active') continue;
      const item: PlanItem = {
        kind: 'hosting',
        starts_at: invite.startsAt ?? null,
        invite: inviteBody(invite, { isHost: true }),
        going_with_plus_ones: invite.goingSeats ?? 0,
      };
      (isPastAt(invite.startsAt) ? past : upcoming).push(item);
    }

    const key = (i: PlanItem) => i.starts_at ?? '9999';
    upcoming.sort((a, b) => key(a).localeCompare(key(b)));
    past.sort((a, b) => key(b).localeCompare(key(a)));

    return {
      waiting_on_you: await listPendingInviteCards(userId, rsvps),
      upcoming,
      waiting: offersResult.items
        .filter((offer) => offer.status === 'ACTIVE' || offer.status === 'MATCHED')
        .map(watchBody),
      past,
    };
  });
}
