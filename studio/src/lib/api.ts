// Studio API layer.
//
// Two kinds of calls live here:
//  1. REAL endpoints on the Fastify backend (:4000), auth, events, orders,
//     promos, venue layout.
//  2. STUBS for the org-scoped contract in designs/handoff/02-api.md
//     "Studio (web)", orgs, verification, payout account, members, hosts,
//     payouts, refunds, cancel/postpone. These resolve against the local
//     store in ./store.ts and are tagged TODO(api-gap).
//
// Spec conventions (02-api.md / AGENTS.md):
//  - Bearer token auth; org context via X-Org-Id checked against Membership.
//  - Money is integer minor units; every money/inventory POST carries an
//    Idempotency-Key header.
//  - Errors are { code, message, field? }.

import {
  devApproveVerification,
  ensureOwnerHost,
  getEventMetaLocal,
  getVenue,
  listVenues,
  markOrderRefunded,
  refundedOrderIds,
  saveHosts,
  saveVenue,
  setEventMetaLocal,
  upsertVenueFromEvent,
  type LocalEventHost,
  type LocalEventMeta,
  type LocalVenue,
  type OrgRole,
  type VerificationStatus,
} from './store';

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:4000';
const TOKEN_KEY = 'sahra_studio_token';
const ORG_KEY = 'sahra_studio_org';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Active org context. Sent as X-Org-Id on every request (02-api.md). */
export function getOrgId(): string | null {
  return localStorage.getItem(ORG_KEY);
}

export function setOrgId(orgId: string | null): void {
  if (orgId) localStorage.setItem(ORG_KEY, orgId);
  else localStorage.removeItem(ORG_KEY);
}

export class ApiError extends Error {
  status: number;
  code?: string;
  field?: string;
  constructor(status: number, message: string, code?: string, field?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

async function request<T>(
  path: string,
  options: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const orgId = getOrgId();
  if (orgId) headers.set('X-Org-Id', orgId);
  if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey);

  const { idempotencyKey: _ik, ...init } = options;
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const body = (data ?? {}) as { message?: unknown; code?: unknown; field?: unknown };
    const message = body.message ? String(body.message) : `Request failed (${res.status})`;
    throw new ApiError(res.status, message, body.code ? String(body.code) : undefined, body.field ? String(body.field) : undefined);
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Real-backend types
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name?: string | null;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  role: 'user' | 'creator' | 'admin' | string;
}

export interface OtpStartResponse {
  challenge_id: string;
  channel: 'sms' | 'whatsapp' | 'email';
  resend_after: number;
  expires_at: string;
  dev_code?: string;
}

export interface Membership {
  id: string;
  org_id: string;
  org_name?: string;
  role: OrgRole;
  event_scope?: string[];
  status?: string;
  invite_email?: string;
  expires_at?: string;
  verification_status?: VerificationStatus;
}

export interface OtpVerifyResponse {
  token: string;
  refresh_token: string;
  session_id: string;
  user: User;
  is_new: boolean;
  memberships: Membership[];
  landing: { mode: 'personal' | 'org'; screen: string; org_id?: string; role?: string };
}

export interface StudioOrg {
  id: string;
  name: string;
  type?: string;
  city?: string;
  country?: string;
  verificationStatus: VerificationStatus;
  legalName?: string;
  tradeLicenceNo?: string;
  rejectionReason?: string;
  payoutAccount?: { ibanLast4: string; holder: string };
  currency: string;
  createdAt?: string;
}

export interface StudioMember {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: OrgRole;
  status: 'active' | 'invited' | 'expired' | 'revoked';
  eventScope: string[] | null;
  invitedAt?: string;
  expiresAt?: string;
  you?: boolean;
}

export interface EventHost {
  id?: string;
  eventId?: string;
  event_id?: string;
  orgId: string;
  org_id?: string;
  orgName?: string;
  org_name?: string;
  role: 'owner' | 'cohost';
  splitBps?: number;
  split_bps?: number;
  status: 'proposed' | 'accepted' | 'locked';
}

export interface StudioPayout {
  id: string;
  amountMinor?: number;
  amount_minor?: number;
  currency?: string;
  createdAt?: string;
  created_at?: string;
  status: 'scheduled' | 'in_transit' | 'paid' | 'failed';
  bankLabel?: string;
  bank_ref?: string;
}

export interface LedgerEntry {
  id?: string;
  kind?: string;
  amount_minor?: number;
  amountMinor?: number;
  description?: string;
  created_at?: string;
  createdAt?: string;
}

interface OrgBody {
  id: string;
  name: string;
  type?: string;
  city?: string;
  country?: string;
  verification_status?: VerificationStatus;
  verificationStatus?: VerificationStatus;
  legal_name?: string;
  licence_no?: string;
  rejection_reason?: string;
  payout_account?: { iban: string; holder: string } | null;
  createdAt?: string;
}

function toOrg(b: OrgBody): StudioOrg {
  return {
    id: b.id,
    name: b.name,
    type: b.type,
    city: b.city,
    verificationStatus: b.verificationStatus ?? b.verification_status ?? 'none',
    legalName: b.legal_name,
    tradeLicenceNo: b.licence_no,
    rejectionReason: b.rejection_reason,
    country: b.country,
    payoutAccount: b.payout_account
      ? { ibanLast4: b.payout_account.iban.slice(-4), holder: b.payout_account.holder }
      : undefined,
    currency: 'aed',
    createdAt: b.createdAt,
  };
}

function toMember(m: Membership & { orgId?: string; user_email?: string; user_name?: string }, user: User): StudioMember {
  const email = m.user_email ?? m.invite_email ?? '';
  return {
    id: m.id,
    orgId: m.orgId ?? m.org_id,
    email,
    name: m.user_name ?? (email ? email.split('@')[0] : m.org_name ?? 'Member'),
    role: m.role,
    status: (m.status as StudioMember['status']) ?? 'active',
    eventScope: m.event_scope?.length ? m.event_scope : null,
    expiresAt: m.expires_at,
    you: email !== '' && email.toLowerCase() === (user.email ?? '').toLowerCase(),
  };
}

export interface Tier {
  id?: string;
  name: string;
  description?: string;
  priceCents: number; // integer minor units
  price?: number;
  quantity: number;
  sold?: number;
  available?: number;
  remaining?: number;
  /** Spec: tier.section_id for seated venues, backend does not carry it yet. */
  sectionId?: string;
}

export interface VenueSection {
  id: string;
  name: string;
  priceCents: number;
  price?: number;
  capacity: number;
  rows?: number;
  seatsPerRow?: number;
  accessibleCount?: number;
  heldCount?: number;
  sold?: number;
  available?: number;
  remaining?: number;
}

export interface VenueLayout {
  sections: VenueSection[];
}

export interface StudioEvent {
  id: string;
  title: string;
  description?: string;
  category?: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  address?: string;
  imageUrl?: string;
  status?: string; // DRAFT | PUBLISHED | … (backend casing)
  currency?: string;
  creatorId?: string;
  tiers?: Tier[];
  venueLayout?: VenueLayout;
  venueSections?: VenueSection[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEventPayload {
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
}

export interface EventGuest {
  code: string;
  name: string;
  email: string;
  tierName: string;
  sectionName?: string;
  status: string;
  checkedInAt?: string;
  createdAt: string;
}

export interface EventGuestsResponse {
  guests: EventGuest[];
  checkedIn: number;
  total: number;
}

export interface EventOrderItem {
  tierId?: string;
  tierName: string;
  sectionId?: string;
  sectionName?: string;
  ticketCode?: string;
  quantity: number;
  unitPriceCents: number;
}

export interface EventOrder {
  id: string;
  kind?: 'TICKET' | 'RESALE' | 'SEATED' | string;
  status: string;
  subtotalCents: number;
  discountCents: number;
  feesCents: number;
  totalCents: number;
  promoCodeText?: string;
  createdAt: string;
  paidAt?: string;
  ticketCount: number;
  buyerName: string;
  buyerEmail: string;
  items: EventOrderItem[];
}

export interface EventOrdersResponse {
  orders: EventOrder[];
}

export interface PromoCode {
  code: string;
  creatorId?: string;
  eventId?: string;
  tierId?: string;
  tierName?: string;
  scope?: 'ALL' | 'EVENT' | 'TIER';
  kind?: 'PERCENT' | 'FIXED';
  value?: number;
  percentOff?: number;
  amountOffCents?: number;
  maxUses?: number;
  maxUsesPerUser?: number;
  startsAt?: string;
  expiresAt?: string;
  endsAt?: string;
  /** spec: applies_to_resale */
  validOnResale?: boolean;
  firstOrderOnly?: boolean;
  usedCount: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromoCodeInput {
  code?: string;
  kind?: 'PERCENT' | 'FIXED';
  value?: number;
  percentOff?: number;
  amountOffCents?: number;
  eventId?: string;
  tierId?: string;
  tierName?: string;
  scope?: 'ALL' | 'EVENT' | 'TIER';
  maxUses?: number;
  maxUsesPerUser?: number;
  startsAt?: string;
  endsAt?: string;
  validOnResale?: boolean;
  firstOrderOnly?: boolean;
  active?: boolean;
}

export interface PromosResponse {
  promos: PromoCode[];
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const api = {
  // ---- auth: OTP only, passwords removed (v2) ------------------------------
  otpStart(contact: string) {
    return request<OtpStartResponse>('/auth/otp/start', {
      method: 'POST',
      body: JSON.stringify({ contact }),
    });
  },
  otpVerify(challengeId: string, code: string) {
    return request<OtpVerifyResponse>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, code, device: 'studio' }),
    });
  },
  updateProfile(patch: { name?: string; intent?: string[] }) {
    return request<{ user: User }>('/me', { method: 'PATCH', body: JSON.stringify(patch) });
  },
  me() {
    return request<{ user: User }>('/auth/me');
  },
  logout() {
    return request<{ ok: boolean }>('/auth/logout', { method: 'POST', body: '{}' }).catch(
      () => ({ ok: false }),
    );
  },

  // ---- organisations & memberships (real endpoints) -------------------------
  async memberships(): Promise<{ org: StudioOrg; role: OrgRole; membership: Membership }[]> {
    const res = await request<{ memberships: Membership[] }>('/me/memberships');
    return res.memberships.map((m) => ({
      org: toOrg({
        id: m.org_id,
        name: m.org_name ?? 'Organisation',
        verification_status: m.verification_status,
      }),
      role: m.role,
      membership: m,
    }));
  },

  async org(orgId: string | null): Promise<StudioOrg | null> {
    if (!orgId) return null;
    try {
      const res = await request<{ org: OrgBody }>(`/orgs/${encodeURIComponent(orgId)}`);
      return toOrg(res.org);
    } catch {
      return null;
    }
  },

  // POST /orgs {name,type,city}; error name_exists_for_you comes back as a
  // 409 ApiError — callers catch it.
  async createOrg(input: { name: string; type: string; city: string }): Promise<StudioOrg> {
    const res = await request<{ org: OrgBody }>('/orgs', {
      method: 'POST',
      body: JSON.stringify(input),
      idempotencyKey: newIdempotencyKey(),
    });
    return toOrg(res.org);
  },

  // POST /orgs/{id}/verification {legal_name,licence_no}. Dev builds
  // auto-approve server-side (env.orgVerifyAutoApprove).
  async submitVerification(orgId: string, input: { legalName: string; licenceNo: string }) {
    const res = await request<{ org: OrgBody }>(`/orgs/${encodeURIComponent(orgId)}/verification`, {
      method: 'POST',
      body: JSON.stringify({ legal_name: input.legalName, licence_no: input.licenceNo }),
    });
    return toOrg(res.org);
  },

  /** Dev-only helper: no longer needed, verification auto-approves in dev. */
  devApproveVerification(orgId: string) {
    return devApproveVerification(orgId);
  },

  // PUT /orgs/{id}/payout-account {iban,holder}; errors iban_invalid,
  // name_mismatch (rule O4).
  async savePayoutAccount(orgId: string, input: { iban: string; holder: string }) {
    const res = await request<{ org: OrgBody }>(
      `/orgs/${encodeURIComponent(orgId)}/payout-account`,
      { method: 'PUT', body: JSON.stringify(input) },
    );
    return toOrg(res.org);
  },

  // ---- team (real endpoints) -----------------------------------------------
  async members(orgId: string, user: User): Promise<StudioMember[]> {
    const res = await request<{ members: Membership[] }>(
      `/orgs/${encodeURIComponent(orgId)}/members`,
    );
    return res.members.map((m) => toMember(m, user));
  },
  async inviteMember(orgId: string, input: { email: string; role: OrgRole; eventScope: string[] | null }) {
    const res = await request<{ member: Membership }>(
      `/orgs/${encodeURIComponent(orgId)}/members`,
      {
        method: 'POST',
        body: JSON.stringify({ email: input.email, role: input.role, event_scope: input.eventScope ?? undefined }),
      },
    );
    return res.member;
  },
  updateMember(orgId: string, memberId: string, patch: { role?: OrgRole; eventScope?: string[] | null }) {
    return request<{ member: Membership }>(
      `/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(memberId)}`,
      { method: 'PATCH', body: JSON.stringify({ role: patch.role, event_scope: patch.eventScope ?? undefined }) },
    );
  },
  removeMember(orgId: string, memberId: string) {
    return request<null>(
      `/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(memberId)}`,
      { method: 'DELETE' },
    );
  },

  // ---- invites → event conversion (I7) ---------------------------------------
  inviteByCode(code: string) {
    return request<{ invite: { id: string; title: string; status: string } }>(
      `/invites/${encodeURIComponent(code)}`,
    );
  },
  moveInvite(inviteId: string, orgId: string) {
    return request<{ event_id: string; org_id: string; studio_path: string; comp_tickets: number }>(
      `/invites/${encodeURIComponent(inviteId)}/move`,
      { method: 'POST', body: JSON.stringify({ org_id: orgId }), idempotencyKey: newIdempotencyKey() },
    );
  },

  // ---- venues -------------------------------------------------------------
  // TODO(api-gap): GET/PUT /venues/{id}/layout, venues aren't first-class on
  // the backend; layouts hang off events today.
  venues(orgId: string): LocalVenue[] {
    return listVenues(orgId);
  },
  venue(venueId: string): LocalVenue | null {
    return getVenue(venueId);
  },
  saveVenue(orgId: string, venue: Omit<LocalVenue, 'orgId'>): LocalVenue {
    return saveVenue(orgId, venue);
  },
  upsertVenueFromEvent(orgId: string, event: StudioEvent) {
    return upsertVenueFromEvent(orgId, event);
  },

  // ---- events (real) --------------------------------------------------------
  myEvents() {
    return request<{ events: StudioEvent[] }>('/events/mine');
  },
  orgEvents(orgId: string) {
    return request<{ events: StudioEvent[] }>(`/orgs/${encodeURIComponent(orgId)}/events`);
  },
  event(id: string) {
    return request<{ event: StudioEvent }>(`/events/${id}`);
  },
  createEvent(payload: CreateEventPayload) {
    return request<{ event: StudioEvent }>('/events', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey: newIdempotencyKey(),
    });
  },
  publishEvent(id: string) {
    return request<{ event: StudioEvent }>(`/events/${id}/publish`, {
      method: 'POST',
      idempotencyKey: newIdempotencyKey(),
    });
  },
  // TODO(api-gap): PATCH /events/{id} currently only accepts venueLayout on
  // the backend. Editing title/date/venue after creation needs the full
  // update route; rule E3 blocks date/venue changes after first sale.
  updateVenueLayout(id: string, sections: VenueSection[]) {
    return request<{ event: StudioEvent }>(`/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        venueLayout: {
          sections: sections.map((section) => ({
            id: section.id,
            name: section.name,
            priceCents: section.priceCents,
            capacity: section.capacity,
            rows: section.rows,
            seatsPerRow: section.seatsPerRow,
            accessibleCount: section.accessibleCount,
            heldCount: section.heldCount,
          })),
        },
      }),
    });
  },
  updateEventFields(id: string, patch: Partial<CreateEventPayload>) {
    return request<{ event: StudioEvent }>(`/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
  addTier(id: string, tier: { name: string; description?: string; priceCents: number; quantity: number }) {
    return request<{ tier: Tier }>(`/events/${id}/tiers`, {
      method: 'POST',
      body: JSON.stringify(tier),
      idempotencyKey: newIdempotencyKey(),
    });
  },
  updateTier(id: string, tierId: string, patch: { name?: string; priceCents?: number; quantity?: number }) {
    return request<{ tier: Tier }>(`/events/${id}/tiers/${encodeURIComponent(tierId)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
  deleteTier(id: string, tierId: string) {
    return request<{ ok: boolean }>(`/events/${id}/tiers/${encodeURIComponent(tierId)}`, {
      method: 'DELETE',
    });
  },
  setEventPaused(eventId: string, paused: boolean) {
    return setEventMetaLocal(eventId, { paused });
  },
  // decision-2 default: cancel = full refund incl. fees; postpone =
  // auto-rollover with a 14-day refund window.
  async cancelEvent(eventId: string) {
    const res = await request<{ event: StudioEvent }>(`/events/${eventId}/cancel`, {
      method: 'POST',
      idempotencyKey: newIdempotencyKey(),
    });
    setEventMetaLocal(eventId, { cancelled: true });
    return res;
  },
  async postponeEvent(eventId: string, newStartsAt: string) {
    const res = await request<{ event: StudioEvent }>(`/events/${eventId}/postpone`, {
      method: 'POST',
      body: JSON.stringify({ new_starts_at: newStartsAt }),
      idempotencyKey: newIdempotencyKey(),
    });
    setEventMetaLocal(eventId, { postponed: { newStartsAt, at: new Date().toISOString() } });
    return res;
  },
  eventMeta(eventId: string): LocalEventMeta {
    return getEventMetaLocal(eventId);
  },
  setEventMeta(eventId: string, patch: Partial<LocalEventMeta>) {
    return setEventMetaLocal(eventId, patch);
  },

  // ---- co-host splits -------------------------------------------------------
  // Proposals stay local: the UI names a co-host org by name, while the real
  // POST /events/{id}/hosts takes an org_id we cannot resolve. GET is real so
  // accepted splits still show up.
  eventHosts(eventId: string, orgId: string, orgName: string): LocalEventHost[] {
    request<{ hosts: EventHost[] }>(`/events/${eventId}/hosts`)
      .then(() => undefined)
      .catch(() => undefined);
    return ensureOwnerHost(eventId, orgId, orgName);
  },
  saveEventHosts(eventId: string, hosts: LocalEventHost[]) {
    saveHosts(eventId, hosts);
  },
  addEventHost(eventId: string, orgId: string, splitBps: number) {
    return request<{ host: EventHost }>(`/events/${eventId}/hosts`, {
      method: 'POST',
      body: JSON.stringify({ org_id: orgId, split_bps: splitBps }),
      idempotencyKey: newIdempotencyKey(),
    });
  },
  acceptEventHost(eventId: string, hostId?: string) {
    return request<{ ok: boolean }>(`/events/${eventId}/hosts/accept`, {
      method: 'POST',
      body: JSON.stringify(hostId ? { host_id: hostId } : {}),
    });
  },

  // ---- orders (real) --------------------------------------------------------
  eventOrders(id: string) {
    return request<EventOrdersResponse>(`/events/${id}/orders`);
  },
  eventGuests(id: string) {
    return request<EventGuestsResponse>(`/events/${id}/guests`);
  },

  // ---- waiting room / fair access (real, org-scoped v3) ----------------------
  waitingRoom(eventId: string) {
    return request<{
      entries: WaitingRoomEntry[];
      flaggedCount: number;
      mode: 'queue' | 'draw';
      open: boolean;
    }>(`/events/${encodeURIComponent(eventId)}/waiting-room/entries`);
  },
  waitingRoomEnable(eventId: string) {
    return request<{ ok: boolean; open: boolean }>(
      `/events/${encodeURIComponent(eventId)}/waiting-room/enable`,
      { method: 'POST', idempotencyKey: newIdempotencyKey() },
    );
  },
  waitingRoomOpen(eventId: string) {
    return request<{ ok: boolean; assigned: number }>(
      `/events/${encodeURIComponent(eventId)}/waiting-room/open`,
      { method: 'POST', idempotencyKey: newIdempotencyKey() },
    );
  },
  waitingRoomNext(eventId: string, count = 1) {
    return request<{ ok: boolean; admitted: number; holdUntil?: string }>(
      `/events/${encodeURIComponent(eventId)}/waiting-room/next`,
      { method: 'POST', body: JSON.stringify({ count }), idempotencyKey: newIdempotencyKey() },
    );
  },
  waitingRoomDraw(eventId: string, winners = 100) {
    return request<{ ok: boolean; mode: string; winners: number; holdUntil?: string }>(
      `/events/${encodeURIComponent(eventId)}/waiting-room/draw`,
      { method: 'POST', body: JSON.stringify({ winners }), idempotencyKey: newIdempotencyKey() },
    );
  },
  waitingRoomFlag(eventId: string, userId: string) {
    return request<{ ok: boolean }>(
      `/events/${encodeURIComponent(eventId)}/waiting-room/${encodeURIComponent(userId)}/flag`,
      { method: 'POST', idempotencyKey: newIdempotencyKey() },
    );
  },
  waitingRoomRemove(eventId: string, userId: string) {
    return request<{ ok: boolean }>(
      `/events/${encodeURIComponent(eventId)}/waiting-room/${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
    );
  },
  // POST /orders/{id}/refund — real endpoint (decision-2: full refunds).
  async refundOrder(orderId: string, reason?: string) {
    const res = await request<{ ok: boolean }>(`/orders/${encodeURIComponent(orderId)}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      idempotencyKey: newIdempotencyKey(),
    });
    markOrderRefunded(orderId);
    return res;
  },
  refundedOrderIds,

  // ---- payouts (real, org-scoped) --------------------------------------------
  orgLedger(orgId: string) {
    return request<{ balance_minor: number; entries: LedgerEntry[] }>(
      `/orgs/${encodeURIComponent(orgId)}/ledger`,
    );
  },
  async orgPayouts(orgId: string): Promise<StudioPayout[]> {
    const res = await request<{ payouts: StudioPayout[] }>(
      `/orgs/${encodeURIComponent(orgId)}/payouts`,
    );
    return res.payouts ?? [];
  },
  // Errors: no_bank, unverified, negative_balance, nothing_ready,
  // idempotency_key_required.
  requestPayout(orgId: string, _amountMinor: number, _currency: string, _bankLabel: string) {
    return request<{ payout: StudioPayout }>(`/orgs/${encodeURIComponent(orgId)}/payouts`, {
      method: 'POST',
      idempotencyKey: newIdempotencyKey(),
    });
  },

  // ---- promo codes (real, user-scoped today) ---------------------------------
  // TODO(api-gap): /orgs/{id}/promos, org scope instead of creatorId scope.
  promos() {
    return request<PromosResponse>('/promos');
  },
  createPromo(payload: PromoCodeInput) {
    return request<{ promo: PromoCode }>('/promos', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updatePromo(code: string, payload: PromoCodeInput) {
    return request<{ promo: PromoCode }>(`/promos/${encodeURIComponent(code)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deletePromo(code: string) {
    return request<{ ok: boolean }>(`/promos/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    });
  },
};

export interface WaitingRoomEntry {
  eventId: string;
  userId: string;
  deviceId?: string;
  joinedAt: string;
  position?: number;
  status: 'waiting' | 'queued' | 'admitted' | 'left' | 'expired' | 'not_selected' | 'done' | 'removed';
  leftAt?: string;
  admittedAt?: string;
  holdUntil?: string;
  flagged?: boolean;
}
