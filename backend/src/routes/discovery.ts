import type { FastifyInstance } from 'fastify';
import {
  deleteReminder,
  eventLifecycleState,
  getEvent,
  getEventMeta,
  getReminder,
  getUserById,
  listPublishedEvents,
  putReminder,
  type EventItem,
  type TicketTier,
} from '../db';
import { specError } from '../errors';

function eventCard(event: EventItem, tiers: TicketTier[]) {
  return {
    id: event.id,
    title: event.title,
    category: event.category,
    startsAt: event.startsAt,
    starts_at: event.startsAt,
    endsAt: event.endsAt,
    location: event.location,
    address: event.address,
    imageUrl: event.imageUrl,
    currency: event.currency ?? 'usd',
    state: eventLifecycleState(event, tiers),
    fromPriceCents: tiers.length ? Math.min(...tiers.map((t) => t.priceCents)) : null,
  };
}

export async function discoveryRoutes(app: FastifyInstance) {
  // GET /feed?city= — For You sections (spec: {sections:[{title,events[]}]}).
  app.get('/feed', { preHandler: app.authenticateOptional }, async (request) => {
    const { city } = request.query as { city?: string };
    const user = request.user?.sub ? await getUserById(request.user.sub) : null;
    const { items } = await listPublishedEvents({ limit: 100 });
    const nowMs = Date.now();
    const weekMs = nowMs + 7 * 24 * 3600_000;
    const cityNeedle = (city ?? user?.city)?.trim().toLowerCase();

    const sections: { key: string; title: string; events: unknown[] }[] = [];

    const thisWeek = items.filter(({ event }) => {
      const start = Date.parse(event.startsAt);
      return start >= nowMs && start <= weekMs;
    });
    if (thisWeek.length > 0) {
      sections.push({
        key: 'this_week',
        title: 'Happening this week',
        events: thisWeek.map(({ event, tiers }) => eventCard(event, tiers)),
      });
    }

    if (cityNeedle) {
      const inCity = items.filter(({ event }) =>
        `${event.location} ${event.address ?? ''}`.toLowerCase().includes(cityNeedle)
      );
      if (inCity.length > 0) {
        sections.push({
          key: 'in_city',
          title: `In ${city ?? user?.city}`,
          events: inCity.map(({ event, tiers }) => eventCard(event, tiers)),
        });
      }
    }

    if (user?.interests?.length) {
      const interests = new Set(user.interests.map((i) => i.toLowerCase()));
      const forYou = items.filter(({ event }) => interests.has(event.category.toLowerCase()));
      if (forYou.length > 0) {
        sections.push({
          key: 'for_you',
          title: 'For you',
          events: forYou.map(({ event, tiers }) => eventCard(event, tiers)),
        });
      }
    }

    // Remaining categories as their own sections.
    const seen = new Set(sections.flatMap((s) => (s.events as { id: string }[]).map((e) => e.id)));
    const byCategory = new Map<string, typeof items>();
    for (const item of items) {
      const list = byCategory.get(item.event.category) ?? [];
      if (list.every((i) => i.event.id !== item.event.id)) list.push(item);
      byCategory.set(item.event.category, list);
    }
    for (const [category, catItems] of byCategory) {
      const fresh = catItems.filter(({ event }) => !seen.has(event.id));
      const source = fresh.length >= 2 ? fresh : catItems;
      if (source.length === 0) continue;
      sections.push({
        key: `category_${category.toLowerCase().replace(/\s+/g, '_')}`,
        title: category,
        events: source.map(({ event, tiers }) => eventCard(event, tiers)),
      });
    }

    return { sections };
  });

  // GET /search?q=&type=events|venues|artists
  app.get('/search', async (request) => {
    const { q, type } = request.query as { q?: string; type?: string };
    const needle = q?.trim().toLowerCase() ?? '';
    const want = (t: string) => !type || type === t;

    const result: { events?: unknown[]; venues?: unknown[]; artists?: unknown[] } = {};
    if (!needle) return { events: [], venues: [], artists: [] };

    const { items } = await listPublishedEvents({ limit: 100, q: needle });

    if (want('events')) {
      // Match title + location + category (listPublishedEvents' q covers the
      // first two; category is matched here).
      const events = items.filter(({ event }) => {
        const hay = `${event.title} ${event.location} ${event.category}`.toLowerCase();
        return hay.includes(needle);
      });
      result.events = events.map(({ event, tiers }) => eventCard(event, tiers));
    }
    if (want('venues')) {
      // TODO(api-gap): venues aren't first-class entities yet — derive
      // distinct venue cards from event location/address pairs.
      const venues = new Map<string, { name: string; address?: string; event_count: number }>();
      for (const { event } of items) {
        if (!event.location.toLowerCase().includes(needle)) continue;
        const key = event.location.toLowerCase();
        const v = venues.get(key) ?? { name: event.location, address: event.address, event_count: 0 };
        v.event_count++;
        venues.set(key, v);
      }
      result.venues = [...venues.values()];
    }
    if (want('artists')) {
      // TODO(api-gap): no Artist entity — org search lands with package G.
      result.artists = [];
    }
    return result;
  });

  // PUT/DELETE /events/:id/reminder — E4 "Remind me".
  app.put('/events/:id/reminder', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await getEventMeta(id);
    if (!event) return specError(reply, 404, 'not_found', 'Event not found');
    await putReminder(request.user.sub, id);
    return reply.status(204).send();
  });

  app.delete('/events/:id/reminder', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteReminder(request.user.sub, id);
    return reply.status(204).send();
  });
}
