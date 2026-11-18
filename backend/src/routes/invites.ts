import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  bumpDailyCounter,
  createEventWithTiers,
  createInvite,
  createInviteReport,
  createInviteRsvp,
  createInviteUpdate,
  flagInviteForReview,
  getInvite,
  getInviteRsvp,
  getMembership,
  getInvites,
  getUserById,
  InviteError,
  issueCompTickets,
  linkEventToOrg,
  listInviteRsvps,
  listInviteUpdates,
  listUserRsvps,
  markInviteSeen,
  putInviteRsvp,
  resolveInvite,
  rsvpSeats,
  setEventHost,
  setInviteStatus,
  setRsvpCheckIn,
  updateInviteFields,
  type Invite,
  type InviteRsvp,
  type InviteRsvpStatus,
  type User,
} from '../db';
import { env } from '../env';
import { specError } from '../errors';
import { notifyUser } from '../notify';

// Personal invites (I1–I10): free, link-only, owned by a person. Never
// listed, searched or shown in Explore. Routes take the invite id or its code.

export function displayName(u: User | null | undefined): string {
  if (!u) return 'Guest';
  return (u.name ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`).trim() || 'Guest';
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

export const inviteLink = (code: string) => `${env.publicWebUrl}/i/${code}`;

// I6: with hide-address on, the place only goes to the host and Going guests.
export function inviteBody(invite: Invite, viewer: { isHost: boolean; myStatus?: InviteRsvpStatus | null }) {
  const placeVisible =
    !invite.hideAddressUntilGoing || viewer.isHost || viewer.myStatus === 'going';
  return {
    id: invite.id,
    code: invite.code,
    link: inviteLink(invite.code),
    title: invite.title,
    starts_at: invite.startsAt ?? null,
    tz: invite.tz ?? null,
    ...(placeVisible ? { place_text: invite.placeText } : {}),
    place_hidden: !placeVisible,
    area: invite.area ?? null,
    cover: invite.cover ?? null,
    note: invite.note ?? null,
    approve_guests: invite.approveGuests,
    allow_plus_ones: invite.allowPlusOnes,
    guest_cap: invite.guestCap ?? null,
    show_guest_list: invite.showGuestList,
    hide_address_until_going: invite.hideAddressUntilGoing,
    spots_left: invite.guestCap != null ? Math.max(0, invite.guestCap - (invite.goingSeats ?? 0)) : null,
    status: invite.status,
    moved_to_event_id: invite.movedToEventId ?? null,
    is_host: viewer.isHost,
    created_at: invite.createdAt,
  };
}

export function rsvpBody(r: InviteRsvp) {
  return {
    invite_id: r.inviteId,
    user_id: r.userId,
    status: r.status,
    plus_ones: r.plusOnes ?? 0,
    checked_in: Boolean(r.checkedInAt),
    checked_in_at: r.checkedInAt ?? null,
    decided_at: r.decidedAt ?? null,
    updated_at: r.updatedAt,
  };
}

const replied = (r: InviteRsvp) => r.status !== 'seen';

function inviteErr(reply: FastifyReply, e: unknown) {
  if (e instanceof InviteError) return specError(reply, e.status, e.code, e.message);
  throw e;
}

async function usersById(ids: string[]): Promise<Map<string, User>> {
  const users = await Promise.all([...new Set(ids)].map((id) => getUserById(id)));
  return new Map(users.filter((u): u is User => Boolean(u)).map((u) => [u.id, u]));
}

const inviteFieldsSchema = {
  title: { type: 'string', maxLength: 120 },
  starts_at: { type: ['string', 'null'] },
  tz: { type: 'string', maxLength: 64 },
  place_text: { type: 'string', maxLength: 300 },
  area: { type: ['string', 'null'], maxLength: 120 },
  // {tone} | {image_url} | tone string | null — validated in normCover.
  cover: {},
  note: { type: ['string', 'null'], maxLength: 2000 },
  approve_guests: { type: 'boolean' },
  allow_plus_ones: { type: 'boolean' },
  guest_cap: { type: ['integer', 'null'], minimum: 1, maximum: 10000 },
  show_guest_list: { type: 'boolean' },
  hide_address_until_going: { type: 'boolean' },
};

type InviteFieldsBody = {
  title?: string;
  starts_at?: string | null;
  tz?: string;
  place_text?: string;
  area?: string | null;
  cover?: { tone?: string; image_url?: string } | string | null;
  note?: string | null;
  approve_guests?: boolean;
  allow_plus_ones?: boolean;
  guest_cap?: number | null;
  show_guest_list?: boolean;
  hide_address_until_going?: boolean;
};

const normCover = (c: InviteFieldsBody['cover']) => {
  if (c === undefined || c === null) return c;
  if (typeof c === 'string') return { tone: c.slice(0, 40) };
  if (typeof c !== 'object') return undefined;
  return {
    ...(typeof c.tone === 'string' ? { tone: c.tone.slice(0, 40) } : {}),
    ...(typeof c.image_url === 'string' ? { image_url: c.image_url.slice(0, 1000) } : {}),
  };
};

export async function inviteRoutes(app: FastifyInstance) {
  // Loads the invite named in :id and checks the caller hosts it.
  const hostInvite = async (id: string, userId: string, reply: FastifyReply): Promise<Invite | null> => {
    const invite = await resolveInvite(id);
    if (!invite) {
      specError(reply, 404, 'not_found', 'Invite not found');
      return null;
    }
    if (invite.hostUserId !== userId) {
      specError(reply, 403, 'not_host', 'Only the host can do this');
      return null;
    }
    return invite;
  };

  // ---------- POST /invites ----------
  app.post(
    '/invites',
    {
      preHandler: app.authenticate,
      schema: { body: { type: 'object', properties: inviteFieldsSchema } },
    },
    async (request, reply) => {
      const b = (request.body ?? {}) as InviteFieldsBody;
      if (!b.title?.trim()) return specError(reply, 400, 'title_required', 'Give it a name', 'title');
      if (!b.place_text?.trim()) return specError(reply, 400, 'place_required', 'Add a place', 'place_text');
      if (b.starts_at && Number.isNaN(Date.parse(b.starts_at))) {
        return specError(reply, 400, 'starts_at_invalid', 'Pick a valid date and time', 'starts_at');
      }
      // TODO(decision-20): max INVITES_PER_DAY new invites per host per day.
      if (!(await bumpDailyCounter(`INVITE#${request.user.sub}`, env.invitesPerDay))) {
        return specError(reply, 429, 'rate_limited', `You can create up to ${env.invitesPerDay} invites a day`);
      }
      const invite = await createInvite({
        hostUserId: request.user.sub,
        title: b.title.trim(),
        startsAt: b.starts_at ? new Date(b.starts_at).toISOString() : undefined,
        tz: b.tz,
        placeText: b.place_text.trim(),
        area: b.area ?? undefined,
        cover: normCover(b.cover) ?? undefined,
        note: b.note ?? undefined,
        approveGuests: b.approve_guests ?? false,
        allowPlusOnes: b.allow_plus_ones ?? false,
        guestCap: b.guest_cap ?? null,
        showGuestList: b.show_guest_list ?? true,
        hideAddressUntilGoing: b.hide_address_until_going ?? false,
      });
      return reply.status(201).send({ invite: inviteBody(invite, { isHost: true }), link: inviteLink(invite.code) });
    }
  );

  // ---------- GET /invites/:code (public) ----------
  app.get('/invites/:code', { preHandler: app.authenticateOptional }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const invite = await resolveInvite(code);
    if (!invite) return specError(reply, 404, 'not_found', 'Invite not found');
    if (invite.status === 'cancelled') {
      return specError(reply, 410, 'cancelled', 'The host cancelled this', undefined, {
        invite: { id: invite.id, code: invite.code, title: invite.title, status: invite.status },
      });
    }
    const viewerId = request.user?.sub;
    const isHost = viewerId === invite.hostUserId;
    const [rsvps, updates, host] = await Promise.all([
      listInviteRsvps(invite.id),
      listInviteUpdates(invite.id),
      getUserById(invite.hostUserId),
    ]);
    const mine = viewerId ? rsvps.find((r) => r.userId === viewerId) ?? null : null;
    if (viewerId && !isHost && !mine && invite.status === 'active') {
      await markInviteSeen(invite, viewerId); // "Waiting on you" marker
    }
    const by = (s: InviteRsvpStatus) => rsvps.filter((r) => r.status === s);
    const going = by('going');
    let faces: { user_id: string; name: string; initials: string }[] | undefined;
    if (invite.showGuestList || isHost) {
      const users = await usersById(going.slice(0, 12).map((r) => r.userId));
      faces = going.slice(0, 12).map((r) => {
        const name = displayName(users.get(r.userId)).split(' ')[0];
        return { user_id: r.userId, name, initials: initials(displayName(users.get(r.userId))) };
      });
    }
    const hostName = displayName(host);
    return {
      invite: inviteBody(invite, { isHost, myStatus: mine?.status }),
      host: { id: invite.hostUserId, name: hostName, initials: initials(hostName) },
      counts: {
        going: going.length,
        going_with_plus_ones: invite.goingSeats ?? 0,
        maybe: by('maybe').length,
        requested: by('requested').length,
        no: by('no').length,
      },
      ...(faces ? { faces } : {}),
      updates: updates.map((u) => ({ id: u.id, body: u.body, sent_at: u.sentAt })),
      my_rsvp: mine && replied(mine) ? rsvpBody(mine) : null,
    };
  });

  // ---------- POST /invites/:id/rsvp {status, plus_ones} ----------
  app.post(
    '/invites/:id/rsvp',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['going', 'maybe', 'no'] },
            plus_ones: { type: 'integer', minimum: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { status: 'going' | 'maybe' | 'no'; plus_ones?: number };
      const userId = request.user.sub;
      const invite = await resolveInvite(id);
      if (!invite) return specError(reply, 404, 'not_found', 'Invite not found');
      if (invite.status === 'cancelled') return specError(reply, 410, 'cancelled', 'The host cancelled this');
      if (invite.status === 'moved') {
        return specError(reply, 409, 'already_moved', 'This is now a ticketed event', undefined, {
          event_id: invite.movedToEventId,
        });
      }
      if (invite.hostUserId === userId) return specError(reply, 403, 'host_cannot_rsvp', "You're the host");

      // I5: 0–2 plus-ones, only when allowed and only while Going.
      const plusOnes = body.plus_ones ?? 0;
      if (plusOnes > 0 && (!invite.allowPlusOnes || body.status !== 'going' || plusOnes > env.inviteMaxPlusOnes)) {
        return specError(reply, 400, 'plus_ones_not_allowed', 'Plus-ones are not allowed here', 'plus_ones');
      }

      const prev = await getInviteRsvp(invite.id, userId);
      // I3: with approval on, Going becomes Requested until the host approves.
      // An approved guest stays Going; a declined guest stays declined
      // (except switching to Can't go).
      let status: InviteRsvpStatus = body.status;
      if (prev?.status === 'declined' && body.status !== 'no') status = 'declined';
      else if (body.status === 'going' && invite.approveGuests && prev?.status !== 'going') status = 'requested';

      // I4: friendly pre-check; the write re-checks atomically.
      if (invite.guestCap != null && (status === 'going' || status === 'requested')) {
        const after = (invite.goingSeats ?? 0) - rsvpSeats(prev) + (status === 'going' ? 1 + plusOnes : 0);
        const fullNow = (invite.goingSeats ?? 0) - rsvpSeats(prev) >= invite.guestCap;
        if (after > invite.guestCap || fullNow) return specError(reply, 409, 'full', "It's full");
      }

      let rsvp: InviteRsvp;
      try {
        rsvp = prev
          ? await putInviteRsvp(invite, prev, { status, plusOnes })
          : await createInviteRsvp(invite, userId, { status, plusOnes });
      } catch (e) {
        return inviteErr(reply, e);
      }

      // rsvp.requested -> host notification.
      if (status === 'requested' && prev?.status !== 'requested') {
        const guest = await getUserById(userId);
        await notifyUser(invite.hostUserId, {
          type: 'rsvp.requested',
          title: 'Someone asked to join',
          body: `${displayName(guest)} asked to join ${invite.title}`,
          link: `/i/${invite.code}`,
        }).catch((e) => request.log.warn(e, 'rsvp.requested notify failed'));
      }
      const seats = (invite.goingSeats ?? 0) - rsvpSeats(prev) + rsvpSeats(rsvp);
      if (seats > env.inviteReviewGuests) await flagInviteForReview({ ...invite, goingSeats: seats });
      return { rsvp: rsvpBody(rsvp) };
    }
  );

  // ---------- host view ----------
  app.get('/invites/:id/guests', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const invite = await hostInvite(id, request.user.sub, reply);
    if (!invite) return reply;
    const rsvps = (await listInviteRsvps(invite.id)).filter(replied);
    const users = await usersById(rsvps.map((r) => r.userId));
    const guest = (r: InviteRsvp) => {
      const u = users.get(r.userId);
      const name = displayName(u);
      return { ...rsvpBody(r), name, initials: initials(name), phone: u?.phone ?? null, email: u?.email ?? null };
    };
    const list = (s: InviteRsvpStatus) => rsvps.filter((r) => r.status === s).map(guest);
    return {
      going: list('going'),
      maybe: list('maybe'),
      requested: list('requested'),
      no: list('no'),
      declined: list('declined'),
      checked_in: rsvps.filter((r) => r.status === 'going' && r.checkedInAt).length,
      going_with_plus_ones: invite.goingSeats ?? 0,
      guest_cap: invite.guestCap ?? null,
    };
  });

  app.post(
    '/invites/:id/rsvps/:user/decision',
    {
      preHandler: app.authenticate,
      schema: { body: { type: 'object', required: ['approve'], properties: { approve: { type: 'boolean' } } } },
    },
    async (request, reply) => {
      const { id, user } = request.params as { id: string; user: string };
      const { approve } = request.body as { approve: boolean };
      const invite = await hostInvite(id, request.user.sub, reply);
      if (!invite) return reply;
      if (invite.status !== 'active') return specError(reply, 409, invite.status, 'This invite is no longer active');
      const prev = await getInviteRsvp(invite.id, user);
      if (!prev || prev.status !== 'requested') {
        return specError(reply, 409, 'not_requested', 'This guest has not asked to join');
      }
      const decidedAt = new Date().toISOString();
      let rsvp: InviteRsvp;
      try {
        rsvp = await putInviteRsvp(invite, prev, {
          status: approve ? 'going' : 'declined',
          plusOnes: prev.plusOnes ?? 0,
          decidedBy: request.user.sub,
          decidedAt,
        });
      } catch (e) {
        return inviteErr(reply, e);
      }
      // rsvp.decided -> guest push/SMS. I3: declined guests aren't told why.
      await notifyUser(
        user,
        approve
          ? { type: 'rsvp.decided', title: "You're in", body: `You're going to ${invite.title}`, link: `/i/${invite.code}` }
          : { type: 'rsvp.decided', title: invite.title, body: "The host couldn't fit you in this time", link: `/i/${invite.code}` },
        { sms: true }
      ).catch((e) => request.log.warn(e, 'rsvp.decided notify failed'));
      return { rsvp: rsvpBody(rsvp) };
    }
  );

  const checkIn = (on: boolean) => async (request: { params: unknown; user: { sub: string } }, reply: FastifyReply) => {
    const { id, user } = request.params as { id: string; user: string };
    const invite = await hostInvite(id, request.user.sub, reply);
    if (!invite) return reply;
    if (!(await setRsvpCheckIn(invite.id, user, on))) {
      return specError(reply, 409, 'not_going', 'Only Going guests can be checked in');
    }
    return reply.status(204).send();
  };
  app.post('/invites/:id/rsvps/:user/check-in', { preHandler: app.authenticate }, checkIn(true));
  app.delete('/invites/:id/rsvps/:user/check-in', { preHandler: app.authenticate }, checkIn(false));

  // ---------- POST /invites/:id/updates {body} (I8) ----------
  app.post(
    '/invites/:id/updates',
    {
      preHandler: app.authenticate,
      schema: { body: { type: 'object', required: ['body'], properties: { body: { type: 'string' } } } },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const text = (request.body as { body: string }).body.trim();
      const invite = await hostInvite(id, request.user.sub, reply);
      if (!invite) return reply;
      if (invite.status !== 'active') return specError(reply, 409, invite.status, 'This invite is no longer active');
      if (!text) return specError(reply, 400, 'body_required', 'Write a message', 'body');
      if (text.length > 240) return specError(reply, 400, 'body_too_long', 'Keep it under 240 characters', 'body');
      const recipients = (await listInviteRsvps(invite.id)).filter((r) => r.status === 'going' || r.status === 'maybe');
      if (recipients.length === 0) return specError(reply, 409, 'no_recipients', 'Nobody has replied Going or Maybe yet');
      // TODO(decision-20): max INVITE_UPDATES_PER_DAY messages per invite per day.
      if (!(await bumpDailyCounter(`INVUPD#${invite.id}`, env.inviteUpdatesPerDay))) {
        return specError(reply, 429, 'limit_reached', `You can send ${env.inviteUpdatesPerDay} messages a day`);
      }
      const channels = new Set<string>();
      for (const r of recipients) {
        const { channel } = await notifyUser(
          r.userId,
          { type: 'invite.update', title: invite.title, body: text, link: `/i/${invite.code}` },
          { sms: true } // decision-20: SMS only to people who replied — recipients all replied
        ).catch(() => ({ channel: 'none' as const }));
        if (channel !== 'none') channels.add(channel);
      }
      const update = await createInviteUpdate(invite.id, text, recipients.length, [...channels]);
      return { recipients: recipients.length, channels: update.channels, update: { id: update.id, body: update.body, sent_at: update.sentAt } };
    }
  );

  // ---------- PATCH /invites/:id ----------
  app.patch(
    '/invites/:id',
    {
      preHandler: app.authenticate,
      schema: { body: { type: 'object', properties: inviteFieldsSchema } },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const b = (request.body ?? {}) as InviteFieldsBody;
      const invite = await hostInvite(id, request.user.sub, reply);
      if (!invite) return reply;
      if (b.title !== undefined && !b.title.trim()) return specError(reply, 400, 'title_required', 'Give it a name', 'title');
      if (b.place_text !== undefined && !b.place_text.trim()) {
        return specError(reply, 400, 'place_required', 'Add a place', 'place_text');
      }
      if (b.starts_at && Number.isNaN(Date.parse(b.starts_at))) {
        return specError(reply, 400, 'starts_at_invalid', 'Pick a valid date and time', 'starts_at');
      }
      try {
        const updated = await updateInviteFields(invite.id, {
          title: b.title?.trim(),
          startsAt: b.starts_at ? new Date(b.starts_at).toISOString() : undefined,
          tz: b.tz,
          placeText: b.place_text?.trim(),
          area: b.area,
          cover: normCover(b.cover),
          note: b.note,
          approveGuests: b.approve_guests,
          allowPlusOnes: b.allow_plus_ones,
          guestCap: b.guest_cap,
          showGuestList: b.show_guest_list,
          hideAddressUntilGoing: b.hide_address_until_going,
        });
        return { invite: inviteBody(updated ?? invite, { isHost: true }) };
      } catch (e) {
        if (e instanceof InviteError) return specError(reply, 409, invite.status, 'This invite can no longer be edited');
        throw e;
      }
    }
  );

  // ---------- POST /invites/:id/cancel (I9) ----------
  app.post('/invites/:id/cancel', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const invite = await hostInvite(id, request.user.sub, reply);
    if (!invite) return reply;
    if (invite.status === 'moved') return specError(reply, 409, 'already_moved', 'This is now a ticketed event');
    if (invite.status === 'cancelled') return { invite: inviteBody(invite, { isHost: true }), notified: 0 };
    if (!(await setInviteStatus(invite.id, 'cancelled'))) {
      return specError(reply, 409, 'conflict', 'This invite changed, reload and try again');
    }
    // I9: everyone who replied, except Can't go.
    const notify = (await listInviteRsvps(invite.id)).filter((r) => replied(r) && r.status !== 'no');
    for (const r of notify) {
      await notifyUser(
        r.userId,
        { type: 'invite.cancelled', title: invite.title, body: 'The host cancelled this', link: `/i/${invite.code}` },
        { sms: true }
      ).catch(() => undefined);
    }
    const fresh = (await getInvite(invite.id)) ?? invite;
    return { invite: inviteBody(fresh, { isHost: true }), notified: notify.length };
  });

  // ---------- POST /invites/:id/move {org_id} (I7) ----------
  // `/convert` is an alias used by buyer-web. The invite stays readable
  // (status 'moved', guests kept); Going guests get comp tickets.
  const moveOpts = {
    preHandler: app.authenticate,
    schema: { body: { type: 'object', required: ['org_id'], properties: { org_id: { type: 'string' } } } },
  };
  const moveHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { org_id: orgId } = request.body as { org_id: string };
    const invite = await hostInvite(id, request.user.sub, reply);
    if (!invite) return reply;
    if (invite.status === 'moved') {
      return specError(reply, 409, 'already_moved', 'Already moved', undefined, {
        event_id: invite.movedToEventId,
        studio_path: `/events/${invite.movedToEventId}`,
      });
    }
    if (invite.status === 'cancelled') return specError(reply, 410, 'cancelled', 'This invite was cancelled');
    const membership = await getMembership(request.user.sub, orgId);
    if (!membership || membership.role !== 'admin') {
      return specError(reply, 403, 'not_admin', 'You need to be an admin of that organisation');
    }
    if (!invite.startsAt) return specError(reply, 400, 'starts_at_required', 'Set a date before selling tickets', 'starts_at');

    const going = (await listInviteRsvps(invite.id)).filter((r) => r.status === 'going');
    const compSeats = going.reduce((n, r) => n + rsvpSeats(r), 0);
    const { event, tiers } = await createEventWithTiers({
      creatorId: request.user.sub,
      ownerOrgId: orgId,
      title: invite.title,
      description: invite.note ?? '',
      category: 'Social',
      startsAt: invite.startsAt,
      location: invite.placeText,
      address: invite.area,
      venueTimezone: invite.tz,
      imageUrl: invite.cover?.image_url,
      currency: 'aed',
      // Comp tier for existing Going guests; the organiser adds paid tiers in Studio.
      tiers: [{ name: 'Guest list', description: 'Free spots kept from the invite', priceCents: 0, quantity: Math.max(compSeats, 1) }],
    });
    await linkEventToOrg(event.id, orgId);
    await setEventHost({ eventId: event.id, orgId, role: 'owner', splitBps: 10000 });
    // Issue comp tickets BEFORE marking the invite moved: if issuance fails,
    // the invite stays active and the move can be retried instead of stranding
    // guests under `already_moved`.
    const comp = await issueCompTickets(
      event,
      tiers[0],
      going.map((r) => ({ userId: r.userId, qty: rsvpSeats(r) })),
      invite.id
    );
    if (!(await setInviteStatus(invite.id, 'moved', { movedToEventId: event.id, movedToOrgId: orgId }))) {
      const fresh = await getInvite(invite.id);
      return specError(reply, 409, 'already_moved', 'Already moved', undefined, { event_id: fresh?.movedToEventId });
    }
    for (const r of going) {
      await notifyUser(r.userId, {
        type: 'invite.moved',
        title: invite.title,
        body: 'This is now a ticketed event. Your free spot is in your Plans.',
        link: `/events/${event.id}`,
      }).catch(() => undefined);
    }
    return reply.status(201).send({
      event_id: event.id,
      org_id: orgId,
      studio_path: `/events/${event.id}`,
      comp_tickets: comp,
    });
  };
  app.post('/invites/:id/move', moveOpts, moveHandler);
  app.post('/invites/:id/convert', moveOpts, moveHandler);

  // ---------- POST /invites/:id/report (decision-20) ----------
  app.post(
    '/invites/:id/report',
    {
      preHandler: app.authenticateOptional,
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: { body: { type: ['object', 'null'], properties: { reason: { type: 'string', maxLength: 500 } } } },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const invite = await resolveInvite(id);
      if (!invite) return specError(reply, 404, 'not_found', 'Invite not found');
      const reason = ((request.body ?? {}) as { reason?: string }).reason ?? '';
      await createInviteReport(invite.id, request.user?.sub, reason);
      return reply.status(202).send({ ok: true });
    }
  );
}

// "Waiting on you": invites the user opened while signed in but hasn't
// answered ('seen' marker), still active and not yet started.
export async function listPendingInviteCards(userId: string, rsvps?: InviteRsvp[]) {
  const mine = rsvps ?? (await listUserRsvps(userId));
  const seen = mine.filter((r) => r.status === 'seen');
  const invites = await getInvites(seen.map((r) => r.inviteId));
  const nowMs = Date.now();
  const live = invites.filter(
    (i) => i.status === 'active' && (!i.startsAt || Date.parse(i.startsAt) > nowMs)
  );
  const hosts = await usersById(live.map((i) => i.hostUserId));
  return live
    .map((i) => {
      const name = displayName(hosts.get(i.hostUserId));
      return { ...inviteBody(i, { isHost: false }), host: { id: i.hostUserId, name, initials: initials(name) } };
    })
    .sort((a, b) => (a.starts_at ?? '9999').localeCompare(b.starts_at ?? '9999'));
}
