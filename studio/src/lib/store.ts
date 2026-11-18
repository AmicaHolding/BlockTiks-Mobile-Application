// Local persistence for org-scoped surfaces the backend does not expose yet.
// EVERY export in this file is a stand-in for a real endpoint in
// designs/handoff/02-api.md "Studio (web)". When the backend ships the real
// routes, delete the corresponding function here and call the API instead.
// Each stub is tagged where it is consumed with:
//   TODO(api-gap): <endpoint from 02-api.md>

import { FLAGS } from './flags';

const LS_KEY = 'sahra_studio_local_v1';

export type VerificationStatus = 'none' | 'submitted' | 'approved' | 'rejected';
export type OrgRole = 'admin' | 'cohost' | 'gate';
export type MemberStatus = 'active' | 'invited' | 'expired' | 'revoked';

export interface LocalOrg {
  id: string;
  ownerUserId: string;
  name: string;
  type: string; // Promoter | Venue | Artist | Community | …
  city: string;
  country: string;
  verificationStatus: VerificationStatus;
  legalName?: string;
  tradeLicenceNo?: string;
  rejectionReason?: string;
  payoutAccount?: { ibanLast4: string; holder: string };
  currency: string;
  createdAt: string;
}

export interface LocalMember {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: OrgRole;
  status: MemberStatus;
  /** Gate staff can be scoped to specific events (null = all events). */
  eventScope: string[] | null;
  invitedAt: string;
  expiresAt?: string;
  you?: boolean;
}

export interface LocalVenue {
  id: string;
  orgId: string;
  name: string;
  kind: 'ga' | 'seated';
  capacity: number; // GA only; seated derives from sections
  timezone: string;
  sections: VenueSectionDraft[];
  /** set when this venue mirrors an event's real venueLayout */
  sourceEventId?: string;
}

export interface VenueSectionDraft {
  id: string;
  name: string;
  rows: number;
  seatsPerRow: number;
  priceMinor: number;
  accessibleCount?: number;
  heldCount?: number;
}

export type HostStatus = 'proposed' | 'accepted' | 'locked';

export interface LocalEventHost {
  eventId: string;
  orgId: string;
  orgName: string;
  role: 'owner' | 'cohost';
  splitBps: number; // basis points; all hosts sum to 10000
  status: HostStatus;
}

export interface LocalPayout {
  id: string;
  orgId: string;
  amountMinor: number;
  currency: string;
  createdAt: string;
  status: 'scheduled' | 'in_transit' | 'paid' | 'failed';
  bankLabel: string;
}

/** Per-event Studio metadata the backend does not persist yet. */
export interface LocalEventMeta {
  resaleEnabled: boolean;
  resaleCapPct: number;
  paused: boolean;
  /** publish attempted before verification; auto-publishes on approval */
  pendingPublish: boolean;
  postponed?: { newStartsAt: string; at: string };
  cancelled?: boolean;
}

interface StoreShape {
  orgs: LocalOrg[];
  members: LocalMember[];
  venues: LocalVenue[];
  hosts: LocalEventHost[];
  payouts: LocalPayout[];
  eventMeta: Record<string, LocalEventMeta>;
  refundedOrderIds: string[];
}

const EMPTY: StoreShape = {
  orgs: [],
  members: [],
  venues: [],
  hosts: [],
  payouts: [],
  eventMeta: {},
  refundedOrderIds: [],
};

function load(): StoreShape {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<StoreShape>) };
  } catch {
    return { ...EMPTY };
  }
}

function save(s: StoreShape) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// TODO(api-gap): GET /me/memberships → [{org,role,event_scope,verification_status}]
// TODO(api-gap): POST /orgs {name,type,city}
// ---------------------------------------------------------------------------

export function listOrgs(userId: string): LocalOrg[] {
  return load().orgs.filter((o) => o.ownerUserId === userId);
}

export function getOrg(orgId: string | null): LocalOrg | null {
  if (!orgId) return null;
  return load().orgs.find((o) => o.id === orgId) ?? null;
}

export function createOrg(input: {
  ownerUserId: string;
  ownerEmail: string;
  ownerName: string;
  name: string;
  type: string;
  city: string;
}): LocalOrg {
  const s = load();
  const org: LocalOrg = {
    id: uid('org'),
    ownerUserId: input.ownerUserId,
    name: input.name,
    type: input.type,
    city: input.city,
    country: 'AE',
    verificationStatus: 'none',
    currency: FLAGS.decision13_defaultCurrency,
    createdAt: new Date().toISOString(),
  };
  s.orgs.push(org);
  s.members.push({
    id: uid('mem'),
    orgId: org.id,
    email: input.ownerEmail,
    name: input.ownerName,
    role: 'admin',
    status: 'active',
    eventScope: null,
    invitedAt: new Date().toISOString(),
    you: true,
  });
  save(s);
  return org;
}

// ---------------------------------------------------------------------------
// TODO(api-gap): POST /orgs/{id}/verification {legal_name,licence_no,docs[]}
// Status transitions none → submitted → approved/rejected are driven by the
// ops queue server-side; approval cannot happen locally.
// ---------------------------------------------------------------------------

export function submitVerification(
  orgId: string,
  input: { legalName: string; licenceNo: string },
): LocalOrg | null {
  const s = load();
  const org = s.orgs.find((o) => o.id === orgId);
  if (!org) return null;
  org.legalName = input.legalName;
  org.tradeLicenceNo = input.licenceNo;
  org.verificationStatus = 'submitted';
  org.rejectionReason = undefined;
  save(s);
  return org;
}

/** Dev-only: pretend the ops queue approved the org so gated flows can run. */
export function devApproveVerification(orgId: string): LocalOrg | null {
  const s = load();
  const org = s.orgs.find((o) => o.id === orgId);
  if (!org) return null;
  org.verificationStatus = 'approved';
  save(s);
  return org;
}

// ---------------------------------------------------------------------------
// TODO(api-gap): PUT /orgs/{id}/payout-account {iban,holder}
// Rule O4: IBAN must be AE + 21 digits and holder must match legal_name.
// ---------------------------------------------------------------------------

export function savePayoutAccount(
  orgId: string,
  input: { iban: string; holder: string },
): LocalOrg | null {
  const s = load();
  const org = s.orgs.find((o) => o.id === orgId);
  if (!org) return null;
  org.payoutAccount = { ibanLast4: input.iban.slice(-4), holder: input.holder };
  save(s);
  return org;
}

// ---------------------------------------------------------------------------
// TODO(api-gap): GET/POST/PATCH/DELETE /orgs/{id}/members {email,role,event_scope}
// T2: invites expire after 7 days. T3: ≥ 1 active admin always.
// ---------------------------------------------------------------------------

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // TODO(decision-12): 7-day expiry, day-5 reminder, email must match

export function listMembers(orgId: string): LocalMember[] {
  const now = Date.now();
  const s = load();
  let changed = false;
  for (const m of s.members) {
    if (m.orgId === orgId && m.status === 'invited' && m.expiresAt && new Date(m.expiresAt).getTime() < now) {
      m.status = 'expired';
      changed = true;
    }
  }
  if (changed) save(s);
  return s.members.filter((m) => m.orgId === orgId && m.status !== 'revoked');
}

export function inviteMember(
  orgId: string,
  input: { email: string; role: OrgRole; eventScope: string[] | null },
): LocalMember | { error: 'already_member' } {
  const s = load();
  const email = input.email.trim().toLowerCase();
  if (s.members.some((m) => m.orgId === orgId && m.email.toLowerCase() === email && m.status !== 'revoked')) {
    return { error: 'already_member' };
  }
  const member: LocalMember = {
    id: uid('mem'),
    orgId,
    email,
    name: email.split('@')[0],
    role: input.role,
    status: 'invited',
    eventScope: input.eventScope,
    invitedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
  };
  s.members.push(member);
  save(s);
  return member;
}

export function updateMember(
  orgId: string,
  memberId: string,
  patch: { role?: OrgRole; eventScope?: string[] | null },
): LocalMember | { error: 'last_admin' } | null {
  const s = load();
  const member = s.members.find((m) => m.orgId === orgId && m.id === memberId);
  if (!member) return null;
  if (patch.role && member.role === 'admin' && patch.role !== 'admin') {
    const admins = s.members.filter((m) => m.orgId === orgId && m.role === 'admin' && m.status === 'active');
    if (admins.length <= 1 && admins[0]?.id === memberId) return { error: 'last_admin' };
  }
  if (patch.role) member.role = patch.role;
  if (patch.eventScope !== undefined) member.eventScope = patch.eventScope;
  save(s);
  return member;
}

export function removeMember(orgId: string, memberId: string): { ok: true } | { error: 'last_admin' } {
  const s = load();
  const member = s.members.find((m) => m.orgId === orgId && m.id === memberId);
  if (!member) return { ok: true };
  if (member.role === 'admin' && member.status === 'active') {
    const admins = s.members.filter((m) => m.orgId === orgId && m.role === 'admin' && m.status === 'active');
    if (admins.length <= 1) return { error: 'last_admin' }; // T3 / decision-11
  }
  member.status = 'revoked';
  save(s);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// TODO(api-gap): venue entities · GET/PUT /venues/{id}/layout. Today the
// backend only stores venueLayout on an event; we mirror that per venue.
// ---------------------------------------------------------------------------

export function listVenues(orgId: string): LocalVenue[] {
  return load().venues.filter((v) => v.orgId === orgId);
}

export function getVenue(venueId: string): LocalVenue | null {
  return load().venues.find((v) => v.id === venueId) ?? null;
}

export function saveVenue(orgId: string, venue: Omit<LocalVenue, 'orgId'> & { orgId?: string }): LocalVenue {
  const s = load();
  const idx = s.venues.findIndex((v) => v.id === venue.id);
  const full: LocalVenue = { ...venue, orgId };
  if (idx >= 0) s.venues[idx] = full;
  else s.venues.push(full);
  save(s);
  return full;
}

/** Merge venues derived from an event's real venueLayout into the store. */
export function upsertVenueFromEvent(orgId: string, event: {
  id: string;
  location?: string;
  venueLayout?: { sections: Array<{ id: string; name: string; priceCents: number; capacity: number; rows?: number; seatsPerRow?: number; accessibleCount?: number; heldCount?: number }> };
}): LocalVenue | null {
  if (!event.location) return null;
  const s = load();
  let venue = s.venues.find((v) => v.orgId === orgId && v.name === event.location);
  const sections = event.venueLayout?.sections ?? [];
  const seated = sections.length > 0;
  const capacity = seated
    ? sections.reduce((a, x) => a + x.capacity, 0)
    : venue?.capacity ?? 0;
  if (!venue) {
    venue = {
      id: uid('ven'),
      orgId,
      name: event.location,
      kind: seated ? 'seated' : 'ga',
      capacity,
      timezone: 'Asia/Dubai',
      sections: [],
      sourceEventId: event.id,
    };
    s.venues.push(venue);
  }
  if (seated) {
    venue.kind = 'seated';
    venue.capacity = capacity;
    venue.sourceEventId = event.id;
    venue.sections = sections.map((x) => ({
      id: x.id,
      name: x.name,
      rows: x.rows ?? 0,
      seatsPerRow: x.seatsPerRow ?? 0,
      priceMinor: x.priceCents,
      accessibleCount: x.accessibleCount,
      heldCount: x.heldCount,
    }));
  }
  save(s);
  return venue;
}

export function venueSeatedCapacity(venue: LocalVenue): number {
  if (venue.kind !== 'seated') return venue.capacity;
  return venue.sections.reduce((a, x) => a + x.rows * x.seatsPerRow, 0);
}

// ---------------------------------------------------------------------------
// TODO(api-gap): POST /events/{id}/hosts {org_id,split_bps} + accept. Splits
// sum to 10000 bps; decision-5 default locks them at first sale.
// ---------------------------------------------------------------------------

export function listHosts(eventId: string): LocalEventHost[] {
  return load().hosts.filter((h) => h.eventId === eventId);
}

export function saveHosts(eventId: string, hosts: LocalEventHost[]): void {
  const s = load();
  s.hosts = s.hosts.filter((h) => h.eventId !== eventId).concat(hosts);
  save(s);
}

export function ensureOwnerHost(eventId: string, orgId: string, orgName: string): LocalEventHost[] {
  const hosts = listHosts(eventId);
  if (hosts.some((h) => h.role === 'owner')) return hosts;
  const next = [
    ...hosts,
    { eventId, orgId, orgName, role: 'owner' as const, splitBps: 10000, status: 'accepted' as const },
  ];
  saveHosts(eventId, next);
  return next;
}

// ---------------------------------------------------------------------------
// TODO(api-gap): GET/POST /orgs/{id}/payouts, history persisted locally;
// balances remain derived client-side from the order feed until the ledger
// endpoint exists.
// ---------------------------------------------------------------------------

export function listPayouts(orgId: string): LocalPayout[] {
  return load()
    .payouts.filter((p) => p.orgId === orgId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function recordPayout(payout: Omit<LocalPayout, 'id' | 'createdAt'>): LocalPayout {
  const s = load();
  const full: LocalPayout = { ...payout, id: uid('pay'), createdAt: new Date().toISOString() };
  s.payouts.push(full);
  save(s);
  return full;
}

// ---------------------------------------------------------------------------
// Event meta (resale flag/cap, pause, pending-publish, cancel/postpone), // TODO(api-gap): PATCH /events/{id} for resale_enabled/resale_cap_pct/status;
// POST /events/{id}/cancel + /postpone.
// ---------------------------------------------------------------------------

export function getEventMetaLocal(eventId: string): LocalEventMeta {
  return (
    load().eventMeta[eventId] ?? {
      resaleEnabled: true,
      resaleCapPct: FLAGS.decision8_maxResaleCapPct,
      paused: false,
      pendingPublish: false,
    }
  );
}

export function setEventMetaLocal(eventId: string, patch: Partial<LocalEventMeta>): LocalEventMeta {
  const s = load();
  s.eventMeta[eventId] = { ...getEventMetaLocal(eventId), ...patch };
  save(s);
  return s.eventMeta[eventId];
}

// ---------------------------------------------------------------------------
// TODO(api-gap): POST /orders/{id}/refunds, refund state is recorded locally
// until the endpoint exists.
// ---------------------------------------------------------------------------

export function markOrderRefunded(orderId: string): void {
  const s = load();
  if (!s.refundedOrderIds.includes(orderId)) s.refundedOrderIds.push(orderId);
  save(s);
}

export function refundedOrderIds(): string[] {
  return load().refundedOrderIds;
}
