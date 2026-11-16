import type { FastifyInstance } from 'fastify';
import { createPromo, deletePromo, listPromos, updatePromo, type PromoCode } from '../db';

function promoDiscountFields(body: {
  kind?: 'PERCENT' | 'FIXED';
  value?: number;
  percentOff?: number;
  amountOffCents?: number;
}) {
  if (body.percentOff !== undefined) return { percentOff: body.percentOff, amountOffCents: undefined };
  if (body.amountOffCents !== undefined) return { amountOffCents: body.amountOffCents, percentOff: undefined };
  if (body.kind === 'PERCENT' && body.value !== undefined) {
    return { percentOff: body.value, amountOffCents: undefined };
  }
  if (body.kind === 'FIXED' && body.value !== undefined) {
    return { amountOffCents: body.value, percentOff: undefined };
  }
  return {};
}

export async function promoRoutes(app: FastifyInstance) {
  const canManage = (role: string) => role === 'CREATOR' || role === 'ADMIN';

  app.get('/promos', { preHandler: app.authenticate }, async (request, reply) => {
    if (!canManage(request.user.role)) return reply.status(403).send({ message: 'Creator access required' });
    const promos = request.user.role === 'ADMIN' ? await listPromos() : await listPromos(request.user.sub);
    return { promos };
  });

  app.post('/promos', { preHandler: app.authenticate }, async (request, reply) => {
    if (!canManage(request.user.role)) return reply.status(403).send({ message: 'Creator access required' });
    const body = request.body as Partial<PromoCode> & { code?: string; value?: number };
    if (!body.code?.trim()) return reply.status(400).send({ message: 'Code is required' });
    const discount = promoDiscountFields(body);
    if (discount.percentOff === undefined && discount.amountOffCents === undefined && body.percentOff === undefined && body.amountOffCents === undefined) {
      return reply.status(400).send({ message: 'Discount is required' });
    }
    try {
      const promo = await createPromo({
        code: body.code,
        creatorId: request.user.sub,
        eventId: body.eventId,
        tierId: body.tierId,
        tierName: body.tierName,
        scope: body.scope,
        kind: body.kind,
        value: body.value,
        ...discount,
        maxUses: body.maxUses,
        maxUsesPerUser: body.maxUsesPerUser,
        startsAt: body.startsAt,
        expiresAt: body.endsAt ?? body.expiresAt,
        endsAt: body.endsAt,
        validOnResale: body.validOnResale,
        usedCount: 0,
        active: body.active ?? true,
      });
      return reply.status(201).send({ promo });
    } catch (e) {
      if ((e as { name?: string }).name === 'ConditionalCheckFailedException') {
        return reply.status(409).send({ message: 'Promo code already exists' });
      }
      throw e;
    }
  });

  app.patch('/promos/:code', { preHandler: app.authenticate }, async (request, reply) => {
    if (!canManage(request.user.role)) return reply.status(403).send({ message: 'Creator access required' });
    const { code } = request.params as { code: string };
    const body = request.body as Partial<PromoCode> & { value?: number };
    const discount = promoDiscountFields(body);
    const promo = await updatePromo(code, {
      eventId: body.eventId,
      tierId: body.tierId,
      tierName: body.tierName,
      scope: body.scope,
      kind: body.kind,
      value: body.value,
      ...discount,
      maxUses: body.maxUses,
      maxUsesPerUser: body.maxUsesPerUser,
      startsAt: body.startsAt,
      expiresAt: body.endsAt ?? body.expiresAt,
      endsAt: body.endsAt,
      validOnResale: body.validOnResale,
      active: body.active,
    });
    if (!promo) return reply.status(404).send({ message: 'Promo code not found' });
    if (promo.creatorId && promo.creatorId !== request.user.sub && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ message: 'Not your promo code' });
    }
    return { promo };
  });

  app.delete('/promos/:code', { preHandler: app.authenticate }, async (request, reply) => {
    if (!canManage(request.user.role)) return reply.status(403).send({ message: 'Creator access required' });
    const { code } = request.params as { code: string };
    const { listPromos: list } = await import('../db');
    const promos = await list(request.user.role === 'ADMIN' ? undefined : request.user.sub);
    const existing = promos.find((promo) => promo.code.toUpperCase() === code.toUpperCase());
    if (existing && request.user.role !== 'ADMIN' && existing.creatorId !== request.user.sub) {
      return reply.status(403).send({ message: 'Not your promo code' });
    }
    const deleted = await deletePromo(code);
    if (!deleted) return reply.status(404).send({ message: 'Promo code not found' });
    return { ok: true };
  });
}
