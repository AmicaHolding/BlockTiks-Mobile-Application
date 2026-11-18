import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  acceptEventHost,
  acceptMembership,
  addEventTier,
  canManageEvent,
  cancelEvent,
  ConditionFailedError,
  createOrg,
  deleteEventTier,
  eventLifecycleState,
  getEvent,
  getEventMeta,
  getMembership,
  inviteMember,
  linkEventToOrg,
  listEventHosts,
  listInvitesForEmail,
  listOrgEventIds,
  listOrgMembers,
  listUserMemberships,
  OrgError,
  postponeEvent,
  removeMember,
  setEventHost,
  setOrgPayoutAccount,
  setOrgVerificationStatus,
  submitOrgVerification,
  updateEventFields,
  updateEventTier,
  updateMember,
  updateUser,
  getOrg,
  getUserById,
  type Membership,
} from '../db';
import { env } from '../env';
import { specError } from '../errors';

function orgBody(org: NonNullable<Awaited<ReturnType<typeof getOrg>>>) {
  return {
    id: org.id,
    name: org.name,
    type: org.type,
    city: org.city,
    verification_status: org.verificationStatus,
    verificationStatus: org.verificationStatus,
    legal_name: org.legalName,
    has_payout_account: Boolean(org.payoutAccount),
    payout_account: org.payoutAccount
      ? { iban: org.payoutAccount.iban, holder: org.payoutAccount.holder }
      : null,
    createdAt: org.createdAt,
  };
}

function membershipBody(m: Membership, orgName?: string) {
  return {
    id: m.id,
    org_id: m.orgId,
    orgId: m.orgId,
    org_name: orgName,
    role: m.role,
    event_scope: m.eventScope ?? [],
    status: m.status,
    invite_email: m.inviteEmail || undefined,
    expires_at: m.expiresAt,
    createdAt: m.createdAt,
  };
}

function orgError(reply: FastifyReply, e: OrgError) {
  const status =
    e.code === 'not_found'
      ? 404
      : e.code === 'org_unverified' ||
          e.code === 'iban_invalid' ||
          e.code === 'licence_invalid' ||
          e.code === 'name_mismatch' ||
          e.code === 'validation'
        ? 400
        : 409;
  return specError(reply, status, e.code, e.message);
}

export async function orgRoutes(app: FastifyInstance) {
  // ---------- org create / read ----------

  // POST /orgs {name,type,city} — Studio: create organisation (F role; any
  // signed-in user can form an org and becomes its admin).
  app.post('/orgs', { preHandler: app.authenticate }, async (request, reply) => {
    const body = request.body as { name?: string; type?: string; city?: string };
    if (!body.name?.trim() || !body.type?.trim()) {
      return specError(reply, 400, 'validation', 'name and type are required', 'name');
    }
    try {
      const org = await createOrg({
        name: body.name,
        type: body.type.trim(),
        city: body.city,
        createdByUserId: request.user.sub,
      });
      return reply.status(201).send({ org: orgBody(org) });
    } catch (e) {
      if (e instanceof OrgError) return orgError(reply, e);
      throw e;
    }
  });

  // GET /orgs/:id — member view.
  app.get(
    '/orgs/:id',
    { preHandler: [app.authenticate, app.requireOrgRole(['admin', 'cohost', 'gate'])] },
    async (request, reply) => {
      const org = await getOrg(request.org!.orgId);
      if (!org) return specError(reply, 404, 'not_found', 'Organisation not found');
      return { org: orgBody(org), membership: membershipBody(request.org!.membership, org.name) };
    }
  );

  // ---------- verification + bank ----------

  // POST /orgs/:id/verification — O3 submit legal details. Dev auto-approve
  // keeps local flows unblocked; prod waits for verification.decided.
  app.post(
    '/orgs/:id/verification',
    { preHandler: [app.authenticate, app.requireOrgRole(['admin'])] },
    async (request, reply) => {
      const body = request.body as { legal_name?: string; licence_no?: string; docs?: string[] };
      if (!body.legal_name?.trim()) {
        return specError(reply, 400, 'validation', 'legal_name is required', 'legal_name');
      }
      try {
        let org = await submitOrgVerification(request.org!.orgId, {
          legalName: body.legal_name,
          licenceNo: body.licence_no ?? '',
          docs: body.docs,
        });
        if (env.orgVerifyAutoApprove) {
          await setOrgVerificationStatus(org.id, 'approved');
          org = { ...org, verificationStatus: 'approved' };
        }
        return { org: orgBody(org) };
      } catch (e) {
        if (e instanceof OrgError) return orgError(reply, e);
        throw e;
      }
    }
  );

  // PUT /orgs/:id/payout-account — O4 IBAN + holder-matches-legal-name.
  app.put(
    '/orgs/:id/payout-account',
    { preHandler: [app.authenticate, app.requireOrgRole(['admin'])] },
    async (request, reply) => {
      const body = request.body as { iban?: string; holder?: string };
      if (!body.iban || !body.holder) {
        return specError(reply, 400, 'validation', 'iban and holder are required', 'iban');
      }
      try {
        const org = await setOrgPayoutAccount(request.org!.orgId, {
          iban: body.iban,
          holder: body.holder,
        });
        return { org: orgBody(org) };
      } catch (e) {
        if (e instanceof OrgError) return orgError(reply, e);
        throw e;
      }
    }
  );

  // ---------- org events + team ----------

  // GET /orgs/:id/events — A/C/G; gate staff see only scoped events.
  app.get(
    '/orgs/:id/events',
    { preHandler: [app.authenticate, app.requireOrgRole(['admin', 'cohost', 'gate'])] },
    async (request) => {
      const { orgId, membership } = request.org!;
      const eventIds = await listOrgEventIds(orgId);
      const scoped =
        membership.role === 'gate' && membership.eventScope?.length
          ? eventIds.filter((id) => membership.eventScope!.includes(id))
          : eventIds;
      const events = [];
      for (const eventId of scoped) {
        const result = await getEvent(eventId);
        if (!result) continue;
        events.push({
          ...result.event,
          state: eventLifecycleState(result.event, result.tiers),
          tiers: result.tiers.map((t) => ({
            id: t.id,
            name: t.name,
            priceCents: t.priceCents,
            quantity: t.quantity,
            sold: t.sold,
            remaining: Math.max(0, t.available ?? t.quantity - t.sold),
          })),
        });
      }
      return { events };
    }
  );

  // GET /orgs/:id/members — A.
  app.get(
    '/orgs/:id/members',
    { preHandler: [app.authenticate, app.requireOrgRole(['admin'])] },
    async (request) => {
      const members = await listOrgMembers(request.org!.orgId);
      return { members: members.map((m) => membershipBody(m)) };
    }
  );

  // POST /orgs/:id/members {email,role,event_scope} — T2 invite (7-day expiry).
  app.post(
    '/orgs/:id/members',
    { preHandler: [app.authenticate, app.requireOrgRole(['admin'])] },
    async (request, reply) => {
      const body = request.body as {
        email?: string;
        role?: string;
        event_scope?: string[];
        eventScope?: string[];
      };
      if (!body.email || !['admin', 'cohost', 'gate'].includes(body.role ?? '')) {
        return specError(reply, 400, 'validation', 'email and a valid role are required', 'role');
      }
      try {
        const membership = await inviteMember({
          orgId: request.org!.orgId,
          email: body.email,
          role: body.role as 'admin' | 'cohost' | 'gate',
          eventScope: body.event_scope ?? body.eventScope,
          invitedBy: request.user.sub,
        });
        return reply.status(201).send({ member: membershipBody(membership) });
      } catch (e) {
        if (e instanceof OrgError) return orgError(reply, e);
        throw e;
      }
    }
  );

  // PATCH /orgs/:id/members/:mid {role,event_scope}
  app.patch(
    '/orgs/:id/members/:mid',
    { preHandler: [app.authenticate, app.requireOrgRole(['admin'])] },
    async (request, reply) => {
      const { mid } = request.params as { mid: string };
      const body = request.body as { role?: string; event_scope?: string[] };
      if (body.role && !['admin', 'cohost', 'gate'].includes(body.role)) {
        return specError(reply, 400, 'validation', 'invalid role', 'role');
      }
      try {
        const membership = await updateMember(request.org!.orgId, mid, {
          role: body.role as 'admin' | 'cohost' | 'gate' | undefined,
          eventScope: body.event_scope,
        });
        if (!membership) return specError(reply, 404, 'not_found', 'Member not found');
        return { member: membershipBody(membership) };
      } catch (e) {
        if (e instanceof OrgError) return orgError(reply, e);
        throw e;
      }
    }
  );

  // DELETE /orgs/:id/members/:mid
  app.delete(
    '/orgs/:id/members/:mid',
    { preHandler: [app.authenticate, app.requireOrgRole(['admin'])] },
    async (request, reply) => {
      const { mid } = request.params as { mid: string };
      try {
        await removeMember(request.org!.orgId, mid);
        return reply.status(204).send();
      } catch (e) {
        if (e instanceof OrgError) return orgError(reply, e);
        throw e;
      }
    }
  );

  // ---------- me: memberships, invites, mode ----------

  // GET /me/memberships — active memberships + pending invites (T1/T2).
  app.get('/me/memberships', { preHandler: app.authenticate }, async (request) => {
    const user = request.user;
    const active = await listUserMemberships(user.sub);
    const email = (await getUserById(user.sub))?.email;
    const invites = email ? await listInvitesForEmail(email) : [];
    const inviteOrgs = await Promise.all(invites.map((m) => getOrg(m.orgId)));
    return {
      memberships: active.map(({ membership, org }) => ({
        ...membershipBody(membership, org.name),
        verification_status: org.verificationStatus,
      })),
      invites: invites.map((m, i) => ({
        ...membershipBody(m, inviteOrgs[i]?.name),
        verification_status: inviteOrgs[i]?.verificationStatus,
      })),
    };
  });

  // POST /me/memberships/:id/accept — claim an invite.
  app.post('/me/memberships/:id/accept', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const membership = await acceptMembership(id, request.user.sub);
      const org = await getOrg(membership.orgId);
      return { member: membershipBody(membership, org?.name) };
    } catch (e) {
      if (e instanceof OrgError) return orgError(reply, e);
      throw e;
    }
  });

  // POST /me/memberships/:id/decline — drop an invite.
  app.post(
    '/me/memberships/:id/decline',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const email = (await getUserById(request.user.sub))?.email;
      const invites = email ? await listInvitesForEmail(email) : [];
      const invite = invites.find((m) => m.id === id);
      if (!invite) return specError(reply, 404, 'not_found', 'Invite not found');
      await removeMember(invite.orgId, invite.id);
      return reply.status(204).send();
    }
  );

  // PUT /me/mode {mode,org_id?} — A4 profile switcher. `mode` is 'personal'
  // or an org id; storing it drives `landing` on the next sign-in.
  app.put('/me/mode', { preHandler: app.authenticate }, async (request, reply) => {
    const body = request.body as { mode?: string; org_id?: string; orgId?: string };
    const orgId = body.org_id ?? body.orgId ?? (body.mode === 'personal' ? undefined : body.mode);
    if (body.mode !== 'personal' && !orgId) {
      return specError(reply, 400, 'validation', 'org_id is required when mode is org', 'org_id');
    }
    let landing: { mode: string; org_id?: string; role?: string };
    if (body.mode === 'personal' || !orgId) {
      await updateUser(request.user.sub, { lastMode: 'personal' });
      landing = { mode: 'personal' };
    } else {
      const membership = await getMembership(request.user.sub, orgId);
      if (!membership) {
        return specError(reply, 403, 'not_member', 'You are not a member of this organisation');
      }
      await updateUser(request.user.sub, { lastMode: orgId });
      landing = { mode: 'org', org_id: orgId, role: membership.role };
    }
    return { landing };
  });

  // ---------- event management under org context ----------

  // POST /events/:id/tiers — A/C.
  app.post('/events/:id/tiers', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await getEventMeta(id);
    if (!event) return specError(reply, 404, 'not_found', 'Event not found');
    if (!(await canManageEvent(event, request.user.sub, request.user.role))) {
      return specError(reply, 403, 'forbidden', 'You cannot manage this event');
    }
    const body = request.body as {
      name?: string;
      description?: string;
      price_each?: number;
      priceCents?: number;
      quantity?: number;
      sale_starts_at?: string;
      sale_ends_at?: string;
    };
    const priceCents = body.price_each ?? body.priceCents;
    if (!body.name || priceCents === undefined || !body.quantity) {
      return specError(reply, 400, 'validation', 'name, price_each and quantity are required');
    }
    try {
      const tier = await addEventTier(id, {
        name: body.name,
        description: body.description,
        priceCents,
        quantity: body.quantity,
        saleStartsAt: body.sale_starts_at,
        saleEndsAt: body.sale_ends_at,
      });
      return reply.status(201).send({ tier });
    } catch (e) {
      if (e instanceof OrgError) return orgError(reply, e);
      throw e;
    }
  });

  // PATCH /events/:id/tiers/:tier
  app.patch('/events/:id/tiers/:tier', { preHandler: app.authenticate }, async (request, reply) => {
    const { id, tier } = request.params as { id: string; tier: string };
    const event = await getEventMeta(id);
    if (!event) return specError(reply, 404, 'not_found', 'Event not found');
    if (!(await canManageEvent(event, request.user.sub, request.user.role))) {
      return specError(reply, 403, 'forbidden', 'You cannot manage this event');
    }
    const body = request.body as Record<string, unknown>;
    try {
      const updated = await updateEventTier(id, tier, {
        name: body.name as string | undefined,
        description: body.description as string | undefined,
        priceCents: (body.price_each ?? body.priceCents) as number | undefined,
        quantity: body.quantity as number | undefined,
        saleStartsAt: body.sale_starts_at as string | undefined,
        saleEndsAt: body.sale_ends_at as string | undefined,
      });
      if (!updated) return specError(reply, 404, 'not_found', 'Tier not found');
      return { tier: updated };
    } catch (e) {
      if (e instanceof OrgError) return orgError(reply, e);
      throw e;
    }
  });

  // DELETE /events/:id/tiers/:tier
  app.delete('/events/:id/tiers/:tier', { preHandler: app.authenticate }, async (request, reply) => {
    const { id, tier } = request.params as { id: string; tier: string };
    const event = await getEventMeta(id);
    if (!event) return specError(reply, 404, 'not_found', 'Event not found');
    if (!(await canManageEvent(event, request.user.sub, request.user.role))) {
      return specError(reply, 403, 'forbidden', 'You cannot manage this event');
    }
    try {
      await deleteEventTier(id, tier);
      return reply.status(204).send();
    } catch (e) {
      if (e instanceof OrgError) return orgError(reply, e);
      throw e;
    }
  });

  // PATCH /events/:id — see events.ts (merged with the legacy venueLayout
  // update so one route serves both contract shapes).

  // POST /events/:id/cancel — decision-2: voids all valid tickets.
  app.post('/events/:id/cancel', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await getEventMeta(id);
    if (!event) return specError(reply, 404, 'not_found', 'Event not found');
    if (!(await canManageEvent(event, request.user.sub, request.user.role, ['admin']))) {
      return specError(reply, 403, 'forbidden', 'Only an org admin can cancel this event');
    }
    const cancelled = await cancelEvent(id);
    return { event: cancelled };
  });

  // POST /events/:id/postpone {new_starts_at} — decision-2.
  app.post('/events/:id/postpone', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await getEventMeta(id);
    if (!event) return specError(reply, 404, 'not_found', 'Event not found');
    if (!(await canManageEvent(event, request.user.sub, request.user.role, ['admin']))) {
      return specError(reply, 403, 'forbidden', 'Only an org admin can postpone this event');
    }
    const body = request.body as { new_starts_at?: string; startsAt?: string };
    const newStartsAt = body.new_starts_at ?? body.startsAt;
    if (!newStartsAt || Number.isNaN(Date.parse(newStartsAt))) {
      return specError(reply, 400, 'validation', 'new_starts_at must be an ISO timestamp', 'new_starts_at');
    }
    try {
      const postponed = await postponeEvent(id, newStartsAt);
      return { event: postponed };
    } catch (e) {
      if (e instanceof OrgError) return orgError(reply, e);
      throw e;
    }
  });

  // ---------- co-host splits (decision-11) ----------

  // POST /events/:id/hosts {org_id,split_bps} — invite a co-host org with a
  // payout split. The owner row is created automatically at event creation.
  app.post('/events/:id/hosts', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await getEventMeta(id);
    if (!event) return specError(reply, 404, 'not_found', 'Event not found');
    if (!(await canManageEvent(event, request.user.sub, request.user.role, ['admin']))) {
      return specError(reply, 403, 'forbidden', 'Only an owner admin can manage co-hosts');
    }
    const body = request.body as { org_id?: string; orgId?: string; split_bps?: number };
    const cohostOrgId = body.org_id ?? body.orgId;
    if (!cohostOrgId || body.split_bps === undefined) {
      return specError(reply, 400, 'validation', 'org_id and split_bps are required', 'split_bps');
    }
    if (body.split_bps < 1 || body.split_bps > 9999) {
      return specError(reply, 400, 'splits_must_total_100', 'split_bps must be between 1 and 9999');
    }
    const cohost = await getOrg(cohostOrgId);
    if (!cohost) return specError(reply, 404, 'not_found', 'Co-host organisation not found');
    if (cohost.verificationStatus !== 'approved') {
      return specError(reply, 400, 'org_unverified', 'Co-host organisation must be verified first');
    }
    // decision-11: splits lock at first sale.
    const tiers = (await getEvent(id))?.tiers ?? [];
    if (tiers.some((t) => t.sold > 0)) {
      return specError(reply, 409, 'locked', 'Splits are locked after the first sale');
    }
    const hosts = await listEventHosts(id);
    const total = hosts
      .filter((h) => h.orgId !== cohostOrgId)
      .reduce((sum, h) => sum + h.splitBps, 0);
    if (total + body.split_bps > 10000) {
      return specError(reply, 400, 'splits_must_total_100', 'Splits must total 10000 basis points');
    }
    const host = await setEventHost({
      eventId: id,
      orgId: cohostOrgId,
      role: 'cohost',
      splitBps: body.split_bps,
    });
    return reply.status(201).send({ host });
  });

  // GET /events/:id/hosts — manager view of splits.
  app.get('/events/:id/hosts', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await getEventMeta(id);
    if (!event) return specError(reply, 404, 'not_found', 'Event not found');
    if (!(await canManageEvent(event, request.user.sub, request.user.role))) {
      return specError(reply, 403, 'forbidden', 'You cannot view this event');
    }
    const hosts = await listEventHosts(id);
    return { hosts };
  });

  // POST /events/:id/hosts/accept — the co-host org's admin accepts the split.
  app.post('/events/:id/hosts/accept', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await getEventMeta(id);
    if (!event) return specError(reply, 404, 'not_found', 'Event not found');
    const hosts = await listEventHosts(id);
    // Find a co-host row for an org this user admins.
    const memberships = await listUserMemberships(request.user.sub);
    const myOrgIds = memberships
      .filter(({ membership }) => membership.role === 'admin')
      .map(({ org }) => org.id);
    const pending = hosts.find(
      (h) => h.role === 'cohost' && !h.accepted && myOrgIds.includes(h.orgId)
    );
    if (!pending) return specError(reply, 404, 'not_found', 'No pending co-host invite for your organisations');
    const host = await acceptEventHost(id, pending.orgId);
    return { host };
  });
}
