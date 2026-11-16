import type { FastifyInstance } from 'fastify';
import {
    ConditionFailedError,
    createEventWithTiers,
    getEvent,
    listCreatorEvents,
    listPublishedEvents,
    listSections,
    publishEvent,
    setVenueLayout,
    type VenueLayout,
} from '../db';

export async function eventRoutes(app: FastifyInstance) {
  // GET /events — published events, optional ?category= & ?q=
  app.get('/events', async (request) => {
    const { category, q, limit } = request.query as {
      category?: string;
      q?: string;
      limit?: string;
    };
    const results = await listPublishedEvents({
      category,
      q,
      limit: limit ? Math.min(parseInt(limit, 10) || 50, 100) : 50,
    });
    return {
      events: results.map(({ event, tiers }) => ({
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

  // GET /events/mine — events created by the current user (any status)
  app.get('/events/mine', { preHandler: app.authenticate }, async (request) => {
    const events = await listCreatorEvents(request.user.sub);
    return { events };
  });

  // GET /events/:id — event detail with tiers (+ venue sections when the
  // organizer configured a layout)
  app.get('/events/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getEvent(id);
    if (!result) return reply.status(404).send({ message: 'Event not found' });
    const sections = result.event.venueLayout
      ? await listSections(id)
      : [];
    const sectionById = new Map(sections.map((s) => [s.sectionId, s]));
    return {
      event: {
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
    };
  });

  // PATCH /events/:id — creator updates venue layout (seated events).
  app.patch(
    '/events/:id',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          properties: {
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
      const { venueLayout } = request.body as { venueLayout?: VenueLayout };
      if (!venueLayout) {
        return reply.status(400).send({ message: 'venueLayout is required' });
      }
      try {
        const event = await setVenueLayout(id, request.user.sub, request.user.role, venueLayout);
        if (!event) return reply.status(404).send({ message: 'Event not found' });
        return { event };
      } catch (e) {
        if (e instanceof ConditionFailedError) {
          return reply.status(403).send({ message: e.message });
        }
        throw e;
      }
    }
  );

  // POST /events — creator creates an event (starts as DRAFT)
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
      const body = request.body as {
        title: string;
        description: string;
        category: string;
        startsAt: string;
        endsAt?: string;
        location: string;
        address?: string;
        imageUrl?: string;
        tiers?: { name: string; description?: string; priceCents: number; quantity: number }[];
      };

      const { event, tiers } = await createEventWithTiers({
        creatorId: request.user.sub,
        title: body.title,
        description: body.description,
        category: body.category,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        location: body.location,
        address: body.address,
        imageUrl: body.imageUrl,
        tiers: body.tiers ?? [],
      });

      return reply.status(201).send({ event: { ...event, tiers } });
    }
  );

  // POST /events/:id/publish — creator publishes a draft event
  app.post('/events/:id/publish', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const event = await publishEvent(id, request.user.sub, request.user.role);
      if (!event) return reply.status(404).send({ message: 'Event not found' });
      return { event };
    } catch (e) {
      if (e instanceof ConditionFailedError) {
        return reply.status(e.message === 'Not the event creator' ? 403 : 400).send({
          message: e.message,
        });
      }
      throw e;
    }
  });
}
