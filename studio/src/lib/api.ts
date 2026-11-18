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
  createOrg as storeCreateOrg,
  devApproveVerification,
  ensureOwnerHost,
  getEventMetaLocal,
  getOrg,
  getVenue,
  inviteMember,
  listMembers,
  listOrgs,
  listPayouts,
  listVenues,
  markOrderRefunded,
  recordPayout,
  refundedOrderIds,
  removeMember,
  saveHosts,
  savePayoutAccount,
  saveVenue,
  setEventMetaLocal,
  submitVerification,
  updateMember,
  upsertVenueFromEvent,
  type LocalEventHost,
  type LocalEventMeta,
  type LocalMember,
  type LocalOrg,
  type LocalPayout,
  type LocalVenue,
  type OrgRole,
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
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  role: 'user' | 'creator' | 'admin' | string;
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
  // ---- auth (real) --------------------------------------------------------
  login(email: string, password: string) {
    return request<{ token: string; refreshToken?: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  signup(input: {
    firstName: string;
    lastName?: string;
    email: string;
    password: string;
    role?: 'creator';
  }) {
    return request<{ token: string; refreshToken?: string; user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  me() {
    return request<{ user: User }>('/auth/me');
  },
  logout() {
    return request<{ ok: boolean }>('/auth/logout', { method: 'POST', body: '{}' }).catch(
      () => ({ ok: false }),
    );
  },

  // ---- organisations & memberships ----------------------------------------
  // TODO(api-gap): GET /me/memberships, returns [{org,role,event_scope,
  // verification_status}]. Locally, every org the user created lists them as
  // Admin (rule O1: org creator becomes admin).
  memberships(userId: string): { org: LocalOrg; role: OrgRole }[] {
    return listOrgs(userId).map((org) => ({ org, role: 'admin' as const }));
  },

  org(orgId: string | null): LocalOrg | null {
    return getOrg(orgId);
  },

  // TODO(api-gap): POST /orgs {name,type,city}, error name_exists_for_you.
  createOrg(input: {
    ownerUserId: string;
    ownerEmail: string;
    ownerName: string;
    name: string;
    type: string;
    city: string;
  }): LocalOrg | { error: 'name_exists_for_you' } {
    const existing = listOrgs(input.ownerUserId);
    if (existing.some((o) => o.name.trim().toLowerCase() === input.name.trim().toLowerCase())) {
      return { error: 'name_exists_for_you' };
    }
    return storeCreateOrg(input);
  },

  // TODO(api-gap): POST /orgs/{id}/verification {legal_name,licence_no,docs[]}
  //, errors licence_invalid. Doc upload needs an uploads endpoint too.
  submitVerification(orgId: string, input: { legalName: string; licenceNo: string }) {
    return submitVerification(orgId, input);
  },

  /** Dev-only helper: simulates verification.approved (ops action). */
  devApproveVerification(orgId: string) {
    return devApproveVerification(orgId);
  },

  // TODO(api-gap): PUT /orgs/{id}/payout-account {iban,holder}, errors
  // iban_invalid, name_mismatch (holder must equal legal_name, rule O4).
  savePayoutAccount(orgId: string, input: { iban: string; holder: string }) {
    const org = getOrg(orgId);
    if (!org) return null;
    if (org.legalName && input.holder.trim().toLowerCase() !== org.legalName.trim().toLowerCase()) {
      return { error: 'name_mismatch' as const };
    }
    return savePayoutAccount(orgId, input);
  },

  // ---- team ---------------------------------------------------------------
  // TODO(api-gap): GET/POST/PATCH/DELETE /orgs/{id}/members, errors
  // org_unverified, last_admin, already_member.
  members(orgId: string): LocalMember[] {
    return listMembers(orgId);
  },
  inviteMember(orgId: string, input: { email: string; role: OrgRole; eventScope: string[] | null }) {
    return inviteMember(orgId, input);
  },
  updateMember(orgId: string, memberId: string, patch: { role?: OrgRole; eventScope?: string[] | null }) {
    return updateMember(orgId, memberId, patch);
  },
  removeMember(orgId: string, memberId: string) {
    return removeMember(orgId, memberId);
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
    // TODO(api-gap): GET /orgs/{id}/events with X-Org-Id scoping + gate
    // event_scope filtering. Today it is user-scoped /events/mine.
    return request<{ events: StudioEvent[] }>('/events/mine');
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
  // TODO(api-gap): POST/PATCH/DELETE /events/{id}/tiers, errors
  // capacity_exceeds_venue, tier_has_sales (E3).
  // TODO(api-gap): POST /events/{id}/cancel + /postpone {new_starts_at},   // behaviour per decision-2 default (full refund incl. fees; auto-rollover
  // with a 14-day refund window).
  setEventPaused(eventId: string, paused: boolean) {
    return setEventMetaLocal(eventId, { paused });
  },
  cancelEvent(eventId: string) {
    return setEventMetaLocal(eventId, { cancelled: true });
  },
  postponeEvent(eventId: string, newStartsAt: string) {
    return setEventMetaLocal(eventId, { postponed: { newStartsAt, at: new Date().toISOString() } });
  },
  eventMeta(eventId: string): LocalEventMeta {
    return getEventMetaLocal(eventId);
  },
  setEventMeta(eventId: string, patch: Partial<LocalEventMeta>) {
    return setEventMetaLocal(eventId, patch);
  },

  // ---- co-host splits -------------------------------------------------------
  // TODO(api-gap): POST /events/{id}/hosts {org_id,split_bps} +
  // POST /events/{id}/hosts/{org}/accept, errors org_unverified,
  // splits_must_total_100, locked. Splits sum to 10000 bps; decision-5 default
  // locks at first sale.
  eventHosts(eventId: string, orgId: string, orgName: string): LocalEventHost[] {
    return ensureOwnerHost(eventId, orgId, orgName);
  },
  saveEventHosts(eventId: string, hosts: LocalEventHost[]) {
    saveHosts(eventId, hosts);
  },

  // ---- orders (real) --------------------------------------------------------
  eventOrders(id: string) {
    return request<EventOrdersResponse>(`/events/${id}/orders`);
  },
  eventGuests(id: string) {
    return request<EventGuestsResponse>(`/events/${id}/guests`);
  },
  // TODO(api-gap): POST /orders/{id}/refunds {amount?,reason}, errors
  // already_refunded, insufficient_balance. Until then refunds are marked
  // locally so the ledger/balance maths stay honest.
  refundOrder(orderId: string, _reason?: string) {
    markOrderRefunded(orderId);
    return Promise.resolve({ ok: true, stubbed: true });
  },
  refundedOrderIds,

  // ---- payouts --------------------------------------------------------------
  // TODO(api-gap): GET/POST /orgs/{id}/payouts, errors no_bank, unverified,
  // negative_balance. History persists locally; available balance is derived
  // client-side from the order feed until the ledger endpoint exists.
  orgPayouts(orgId: string): LocalPayout[] {
    return listPayouts(orgId);
  },
  requestPayout(orgId: string, amountMinor: number, currency: string, bankLabel: string) {
    // Idempotency on money POSTs: the local stub records a unique payout row;
    // the real call must send Idempotency-Key (added above for real requests).
    return recordPayout({ orgId, amountMinor, currency, status: 'in_transit', bankLabel });
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
