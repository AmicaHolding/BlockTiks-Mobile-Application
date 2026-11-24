const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:4000';
const TOKEN_KEY = 'sahra_buyer_token';
const REFRESH_KEY = 'sahra_buyer_refresh';
const REFERRAL_KEY = 'sahra_referral_code';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string | null): void {
  if (token) localStorage.setItem(REFRESH_KEY, token);
  else localStorage.removeItem(REFRESH_KEY);
}

export function getStoredReferralCode(): string | null {
  return localStorage.getItem(REFERRAL_KEY);
}

export function setStoredReferralCode(code: string | null): void {
  if (code) localStorage.setItem(REFERRAL_KEY, code.toUpperCase());
  else localStorage.removeItem(REFERRAL_KEY);
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Spec (02-api): every POST that moves money or inventory requires an
// `Idempotency-Key`. Callers that can be retried (checkout) should generate
// one key per user intent and reuse it across retries.
export function newIdempotencyKey(): string {
  return `web-${crypto.randomUUID()}`;
}

function idempotencyHeaders(key?: string): HeadersInit {
  return { 'Idempotency-Key': key ?? newIdempotencyKey() };
}

interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as AuthResponse;
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    // Access token expired? Try the refresh token once, then retry.
    if (res.status === 401 && !retried && !path.startsWith('/auth/refresh')) {
      refreshPromise ??= tryRefresh().finally(() => {
        refreshPromise = null;
      });
      if (await refreshPromise) {
        return request<T>(path, options, true);
      }
      setToken(null);
      setRefreshToken(null);
    }
    const message =
      data && typeof data === 'object' && 'message' in data
        ? String((data as { message?: unknown }).message)
        : `Request failed (${res.status})`;
    const code =
      data && typeof data === 'object' && 'code' in data
        ? String((data as { code?: unknown }).code)
        : undefined;
    throw new ApiError(res.status, message, code);
  }
  return data as T;
}

// ---- Types mirroring backend/src/db.ts + route responses ----

export interface User {
  id: string;
  // v2 (02-api): contact is email OR phone; name is the only required field.
  email?: string | null;
  name?: string;
  intent?: Intent[];
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  firstNameAr?: string;
  city?: string;
  interests?: string[];
  dateOfBirth?: string;
  emailVerified?: boolean;
  notificationPrefs?: { push?: boolean; email?: boolean; sms?: boolean };
  referralCode?: string;
  referredByCode?: string;
  referralCount?: number;
  role?: 'fan' | 'creator' | 'admin' | string;
}

export interface Tier {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  price?: number;
  quantity: number;
  sold: number;
  available?: number;
  remaining?: number;
  saleStartsAt?: string; // spec: tier sale window (E4 drives "Remind me")
  saleEndsAt?: string;
}

export interface VenueSection {
  id: string;
  name: string;
  priceCents: number;
  capacity: number;
  rows?: number;
  seatsPerRow?: number;
  accessibleCount?: number;
  heldCount?: number;
  sold?: number;
  available?: number;
  remaining?: number;
}

export interface Seat {
  label: string;
  accessible: boolean;
  held: boolean;
  status: 'AVAILABLE' | 'HELD' | 'SOLD' | string;
}

export interface SahraEvent {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  category: string;
  startsAt: string;
  endsAt?: string;
  location: string;
  address?: string;
  imageUrl?: string;
  currency?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED' | string;
  // TODO(api-gap): spec Event carries on_sale_at (drives "Remind me" per E4),
  // resale_enabled, resale_cap_pct (default 10) and venue IANA timezone,   // the backend EventItem has none of these yet.
  onSaleAt?: string;
  resaleEnabled?: boolean;
  resaleCapPct?: number;
  venueTimezone?: string;
  venueLayout?: { sections: VenueSection[] };
  tiers?: Tier[];
  venueSections?: VenueSection[];
  createdAt?: string;
}

export interface Listing {
  ticketCode: string;
  sellerId: string;
  // TODO(api-gap): spec Listing carries ticket_ids[], split_rule (any/all/pairs)
  // and face_minor for the R2 cap check, backend lists one ticket code per row
  // and stores no face value or split rule.
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  eventLocation: string;
  tierName: string;
  priceCents: number;
  currency?: string;
  status: 'ACTIVE' | 'CHECKOUT' | 'SOLD' | 'CANCELLED' | string;
  buyerId?: string;
  createdAt: string;
}

export interface Ticket {
  code: string;
  orderId: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  eventLocation: string;
  tierId?: string;
  tierName: string;
  sectionName?: string;
  seatLabel?: string;
  currency?: string;
  userId: string;
  status: 'VALID' | 'USED' | 'TRANSFERRED' | 'REFUNDED' | string;
  checkedInAt?: string;
  transferredFrom?: string;
  transferredTo?: string;
  transferredAt?: string;
  createdAt: string;
}

export interface Offer {
  id: string;
  buyerId: string;
  eventId: string;
  tierName: string;
  tierKey: string;
  sectionName?: string;
  maxPriceCents: number;
  quantity: number;
  matchedCount: number;
  status: 'ACTIVE' | 'MATCHED' | 'CANCELLED' | string;
  lastListingCode?: string;
  lastMatchedAt?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  // TODO(api-gap): spec orders carry a human code `SA-#####`; backend only has
  // the uuid id, the UI renders a short id for now.
  code?: string;
  userId: string;
  eventId: string;
  kind?: 'TICKET' | 'RESALE' | 'SEATED' | string;
  listingCode?: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED' | string;
  subtotalCents: number;
  discountCents: number;
  feesCents: number;
  totalCents: number;
  currency?: string;
  promoCodeText?: string;
  ticketCodes?: string[];
  expiresAt?: string;
  createdAt: string;
  paidAt?: string;
  event?: { title?: string } | null;
  items?: {
    tierName: string;
    sectionName?: string;
    quantity: number;
    unitPriceCents: number;
    seatLabels?: string[];
  }[];
}

export interface OrderIntentResult {
  orderId: string;
  clientSecret: string | null;
  amountCents: number;
  currency?: string;
  subtotalCents: number;
  discountCents: number;
  feesCents: number;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  href: string | null;
}

export interface TransactionRow {
  id: string;
  type: string;
  kind?: string;
  title: string;
  subtitle?: string;
  amountCents: number;
  currency?: string;
  direction: 'in' | 'out' | string;
  status: string;
  createdAt: string;
}

export interface Earnings {
  readyCents: number;
  pendingCents: number;
  lifetimeCents: number;
  withdrawnCents: number;
  availableCents: number;
  sales: {
    id: string;
    title: string;
    subtitle: string;
    amountCents: number;
    currency?: string;
    status: string;
    createdAt: string;
  }[];
  withdrawals: {
    id: string;
    amountCents: number;
    currency?: string;
    status: string;
    createdAt: string;
  }[];
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
}

export interface Promo {
  code: string;
  kind?: 'PERCENT' | 'FIXED';
  value?: number;
  percentOff?: number;
  amountOffCents?: number;
  scope?: string;
  eventId?: string;
  tierId?: string;
  tierName?: string;
  maxUses?: number;
  usedCount?: number;
  state?: string;
  usedAt?: string;
}

export interface Faq {
  q: string;
  a: string;
}

// ---- API ----

export const api = {
  // auth (v2, rule A1): phone or email + 6-digit code. No passwords.
  otpStart(contact: string) {
    return request<OtpStart>('/auth/otp/start', {
      method: 'POST',
      body: JSON.stringify({ contact }),
    });
  },
  otpVerify(challenge_id: string, code: string) {
    return request<OtpVerify>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ challenge_id, code }),
    });
  },
  // Assumption: the contract has no explicit read-me call; the existing
  // `GET /auth/me` returns `{user}`.
  me() {
    return request<{ user: User }>('/auth/me');
  },
  /** `PATCH /me` returns `user` (02-api). */
  updateProfile(fields: Partial<User> & { name?: string; intent?: Intent[] }) {
    return request<User | { user: User }>('/me', {
      method: 'PATCH',
      body: JSON.stringify(fields),
    }).then(unwrapUser);
  },
  sessions() {
    return request<MeSession[] | { sessions: MeSession[] }>('/me/sessions').then((r) =>
      Array.isArray(r) ? r : r.sessions ?? []
    );
  },
  endSession(id: string) {
    return request<null>(`/me/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async logout() {
    const refreshToken = getRefreshToken();
    setRefreshToken(null);
    try {
      await request<{ ok: boolean }>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
    } catch {
      // best effort
    }
  },

  // events (public)
  // TODO(api-gap): spec discovery calls are `GET /feed?city=` (sectioned feed)
  // and `GET /search?q=&type=events|venues|artists`. The backend only has
  // `/events?q=&category=`, so venue/artist search is not wired.
  events(params: { category?: string; q?: string; limit?: number; cursor?: string } = {}) {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', params.category);
    if (params.q) qs.set('q', params.q);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.cursor) qs.set('cursor', params.cursor);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ events: SahraEvent[]; nextCursor?: string }>(`/events${suffix}`);
  },
  event(id: string) {
    return request<{ event: SahraEvent }>(`/events/${id}`);
  },
  seats(eventId: string, sectionId: string) {
    return request<{ sectionId: string; seats: Seat[]; currency?: string }>(
      `/events/${encodeURIComponent(eventId)}/seats?sectionId=${encodeURIComponent(sectionId)}`
    );
  },
  listings(eventId?: string) {
    const suffix = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
    return request<{ listings: Listing[] }>(`/listings${suffix}`);
  },

  // orders / checkout
  // TODO(api-gap): spec checkout is `POST /holds {event_id, lines[]}` then
  // `POST /orders {hold_id, payment_method_id}`. The backend accepts ONE line
  // per intent ({tierId|sectionId|listingCode, quantity}), so multi-tier carts
  // are constrained to a single line in the UI for now.
  orderIntent(input: {
    eventId?: string;
    tierId?: string;
    sectionId?: string;
    listingCode?: string;
    quantity?: number;
    promoCode?: string;
    seats?: string[];
    idempotencyKey?: string;
  }) {
    const { idempotencyKey, ...body } = input;
    return request<OrderIntentResult>('/orders/intent', {
      method: 'POST',
      headers: idempotencyHeaders(idempotencyKey),
      body: JSON.stringify(body),
    });
  },
  // TODO(api-gap): spec has `GET /holds/{id}/quote?promo=` for live promo
  // validation. Backend only validates the promo inside /orders/intent, so
  // promo feedback appears when the intent is created.
  quoteHold() {
    return Promise.reject(new ApiError(501, 'Hold quoting is not supported by this backend'));
  },
  // TODO(api-gap): spec "Remind me" is `PUT/DELETE /events/{id}/reminder`.
  // No backend route exists, kept in localStorage so the UI behaves
  // correctly and swaps to the real call when it lands.
  reminder(eventId: string, on: boolean) {
    try {
      const raw = localStorage.getItem('sahra_reminders') ?? '[]';
      const set = new Set(JSON.parse(raw) as string[]);
      if (on) set.add(eventId);
      else set.delete(eventId);
      localStorage.setItem('sahra_reminders', JSON.stringify([...set]));
    } catch {
      // storage unavailable, reminders stay best-effort
    }
    return Promise.resolve({ ok: true });
  },
  reminders(): string[] {
    try {
      return JSON.parse(localStorage.getItem('sahra_reminders') ?? '[]') as string[];
    } catch {
      return [];
    }
  },
  // TODO(api-gap): spec `GET /tickets/{id}/credential` returns
  // {qr_payload, version, rotates_at} with rotation per decision-1. Backend
  // issues no credential resource; the QR encodes the ticket code directly.
  ticketCredential(code: string) {
    return Promise.resolve({ qrPayload: code, version: 1, rotatesAt: null as string | null });
  },
  // TODO(api-gap): spec `POST /me/promos {code}` redeems a code into the
  // account. The backend only exposes creator-side promo management and
  // /account/promos (read), so redemption is not wired.
  redeemPromo(_code: string) {
    return Promise.reject(
      new ApiError(501, 'Adding promo codes to your account is not supported yet')
    );
  },
  // TODO(api-gap): spec transfers are claim-based (`POST /transfers`,
  // `POST /transfers/{id}/claim`, 48h return per decision-14). The backend
  // moves the ticket directly to an existing account by email, transfers to
  // phone numbers or non-members are not wired.
  claimTransfer(_id: string) {
    return Promise.reject(new ApiError(501, 'Transfer claims are not supported yet'));
  },
  deleteAccount() {
    // TODO(api-gap): rule A6 requires the server to reject deletion while the
    // user has upcoming tickets, active listings, price watches, a balance,
    // or is sole admin, the backend deletes unconditionally. The UI
    // pre-checks client-side before calling this.
    return request<{ ok: boolean }>('/auth/me', { method: 'DELETE' });
  },
  order(id: string) {
    return request<{ order: Order }>(`/orders/${id}`);
  },

  // tickets / resale / offers
  tickets(params: { cursor?: string; limit?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.cursor) qs.set('cursor', params.cursor);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ tickets: Ticket[]; nextCursor?: string }>(`/tickets${suffix}`);
  },
  sellableTickets() {
    return request<{ tickets: Ticket[] }>('/tickets/sellable');
  },
  transferTicket(code: string, recipientEmail: string) {
    return request<{ ticket: Ticket; recipient: { email: string; firstName: string } }>(
      `/tickets/${encodeURIComponent(code)}/transfer`,
      {
        method: 'POST',
        headers: idempotencyHeaders(),
        body: JSON.stringify({ recipientEmail }),
      }
    );
  },
  listTicket(code: string, priceCents: number) {
    return request<{ listing: Listing; matchedOffers?: Offer[] }>(
      `/tickets/${encodeURIComponent(code)}/list`,
      {
        method: 'POST',
        headers: idempotencyHeaders(),
        body: JSON.stringify({ priceCents }),
      }
    );
  },
  myListings(params: { cursor?: string; limit?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.cursor) qs.set('cursor', params.cursor);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ listings: Listing[]; nextCursor?: string }>(`/listings/mine${suffix}`);
  },
  cancelListing(code: string) {
    return request<{ cancelled: boolean }>(`/listings/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    });
  },
  myOffers(params: { cursor?: string; limit?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.cursor) qs.set('cursor', params.cursor);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ offers: Offer[]; nextCursor?: string }>(`/offers/mine${suffix}`);
  },
  createOffer(input: {
    eventId: string;
    tierName: string;
    sectionName?: string;
    maxPriceCents: number;
    quantity: number;
  }) {
    return request<{ offer: Offer }>('/offers', {
      method: 'POST',
      headers: idempotencyHeaders(),
      body: JSON.stringify(input),
    });
  },
  cancelOffer(id: string) {
    return request<{ cancelled: boolean }>(`/offers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // account
  notifications() {
    return request<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications');
  },
  notificationsRead() {
    return request<{ ok: boolean }>('/notifications/read', { method: 'POST' });
  },
  transactions() {
    return request<{ transactions: TransactionRow[] }>('/transactions');
  },
  earnings() {
    return request<Earnings>('/account/earnings');
  },
  withdraw(amountCents: number, currency = 'usd') {
    return request<{ ok: boolean; withdrawalId: string; status: string }>('/account/withdraw', {
      method: 'POST',
      headers: idempotencyHeaders(),
      body: JSON.stringify({ amountCents, currency }),
    });
  },
  payoutsOnboardingLink() {
    return request<{ url: string }>('/account/payouts/onboarding-link', { method: 'POST' });
  },
  payouts() {
    return request<{
      connected: boolean;
      detailsSubmitted?: boolean;
      chargesEnabled?: boolean;
      payoutsEnabled?: boolean;
      dashboardUrl?: string;
    }>('/account/payouts');
  },
  payoutsRefresh() {
    return request<{ connected: boolean; payoutsEnabled?: boolean }>('/account/payouts/refresh', {
      method: 'POST',
    });
  },
  paymentMethods() {
    return request<{ paymentMethods: PaymentMethod[]; stripeReady: boolean }>('/account/payment-methods');
  },
  paymentMethodSetupIntent() {
    return request<{ clientSecret: string }>('/account/payment-methods/setup-intent', {
      method: 'POST',
    });
  },
  detachPaymentMethod(id: string) {
    return request<{ ok: boolean }>(`/account/payment-methods/${encodeURIComponent(id)}/detach`, {
      method: 'POST',
    });
  },
  accountPromos() {
    return request<{ ready: Promo[]; used: Promo[] }>('/account/promos');
  },
  referrals() {
    return request<{
      code: string;
      shareUrl: string;
      earnedCents: number;
      bonusCents?: number;
      referredByCode?: string;
      friendCount?: number;
      friends: { id: string; joinedAt: string }[];
    }>('/account/referrals');
  },
  applyReferral(code: string) {
    return request<{ ok: boolean }>('/account/referrals/apply', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },
  faqs() {
    return request<{ categories: { name: string; faqs: Faq[] }[] }>('/faqs');
  },

  // ---- v2 discovery / invites / plans (02-api) ----
  home(city?: string) {
    const qs = city ? `?city=${encodeURIComponent(city)}` : '';
    return request<HomeResponse>(`/home${qs}`);
  },
  invite(code: string) {
    return request<InvitePageResponse>(`/invites/${encodeURIComponent(code)}`);
  },
  createInvite(body: NewInviteBody) {
    return request<{ invite: Invite; link: string }>('/invites', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  rsvp(inviteId: string, status: RsvpStatus, plus_ones = 0) {
    // Capacity-bound (I4), so treated as an inventory POST.
    return request<{ rsvp: InviteRsvp }>(`/invites/${encodeURIComponent(inviteId)}/rsvp`, {
      method: 'POST',
      headers: idempotencyHeaders(),
      body: JSON.stringify({ status, plus_ones }),
    });
  },
  inviteGuests(inviteId: string) {
    return request<InviteGuests>(`/invites/${encodeURIComponent(inviteId)}/guests`);
  },
  decideRsvp(inviteId: string, userId: string, approve: boolean) {
    return request<InviteRsvp>(
      `/invites/${encodeURIComponent(inviteId)}/rsvps/${encodeURIComponent(userId)}/decision`,
      { method: 'POST', headers: idempotencyHeaders(), body: JSON.stringify({ approve }) }
    );
  },
  messageGuests(inviteId: string, body: string) {
    return request<{ recipients: number }>(`/invites/${encodeURIComponent(inviteId)}/updates`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },
  memberships() {
    return request<Membership[] | { memberships: Membership[] }>('/me/memberships').then((r) =>
      Array.isArray(r) ? r : r.memberships ?? []
    );
  },
  /** I7 "Sell tickets instead": draft event in the org; Going guests become
   *  comp tickets, so it is an inventory POST. */
  moveInvite(inviteId: string, org_id: string) {
    return request<{ event_id: string }>(`/invites/${encodeURIComponent(inviteId)}/move`, {
      method: 'POST',
      headers: { ...idempotencyHeaders(), 'X-Org-Id': org_id },
      body: JSON.stringify({ org_id }),
    });
  },
  cancelInvite(inviteId: string) {
    return request<Invite>(`/invites/${encodeURIComponent(inviteId)}/cancel`, { method: 'POST' });
  },
  // TODO(decision-20): report button on every invite page. Not in 02-api yet;
  // the brief names `POST /invites/{id}/report`.
  reportInvite(inviteId: string, reason?: string) {
    return request<null>(`/invites/${encodeURIComponent(inviteId)}/report`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    });
  },
  plans() {
    return request<PlansResponse>('/me/plans');
  },

  // ---- v3 (handoff/05 trust & money + 06 personal events) ----

  /** W1: wallet balances — cash / pending / credits. */
  wallet() {
    return request<{ wallet: Wallet }>('/wallet');
  },
  walletActivity() {
    return request<{ rows: WalletActivity[] }>('/wallet/activity');
  },
  walletWithdraw(amountMinor: number, instant = false) {
    return request<{ ok: boolean; feeMinor: number }>('/wallet/withdraw', {
      method: 'POST',
      headers: idempotencyHeaders(),
      body: JSON.stringify({ amountMinor, instant }),
    });
  },
  /** Q1-Q3: rotating live-QR payload for a ticket (unlocks 24h pre-doors). */
  ticketQr(code: string) {
    return request<{ payload: string; window: number; refreshInSeconds: number }>(
      `/tickets/${encodeURIComponent(code)}/qr`
    );
  },
  /** B4-B8: waiting-room join / status / leave. */
  joinWaitingRoom(eventId: string, deviceId?: string) {
    return request<{ entry: WaitingRoomEntry }>(`/events/${encodeURIComponent(eventId)}/waiting-room`, {
      method: 'POST',
      body: JSON.stringify(deviceId ? { deviceId } : {}),
    });
  },
  waitingRoomStatus(eventId: string) {
    return request<{ entry: WaitingRoomEntry | null; mode: 'queue' | 'draw'; open?: boolean }>(
      `/events/${encodeURIComponent(eventId)}/waiting-room`
    );
  },
  leaveWaitingRoom(eventId: string) {
    return request<{ ok: boolean }>(`/events/${encodeURIComponent(eventId)}/waiting-room/leave`, {
      method: 'POST',
    });
  },
  /** G1-G5: group-pay shares on an order. */
  listShares(orderId: string) {
    return request<{ shares: OrderShare[] }>(`/orders/${encodeURIComponent(orderId)}/shares`);
  },
  shareAction(orderId: string, shareId: string, action: 'pay' | 'cover' | 'release') {
    return request<{ ok: boolean }>(
      `/orders/${encodeURIComponent(orderId)}/shares/${encodeURIComponent(shareId)}/${action}`,
      { method: 'POST' }
    );
  },
  /** PE2: vote on date-poll options; host locks the final date. */
  voteInvitePoll(inviteId: string, option_ids: string[]) {
    return request<null>(`/invites/${encodeURIComponent(inviteId)}/poll/votes`, {
      method: 'PUT',
      body: JSON.stringify({ option_ids }),
    });
  },
  lockInvitePoll(inviteId: string, option_id: string) {
    return request<{ ok: boolean }>(`/invites/${encodeURIComponent(inviteId)}/poll/lock`, {
      method: 'POST',
      body: JSON.stringify({ option_id }),
    });
  },
  /** PE5: activity feed (comments, likes, one-level replies). */
  inviteActivity(inviteId: string) {
    return request<{ posts: InvitePost[] }>(`/invites/${encodeURIComponent(inviteId)}/activity`);
  },
  postInviteActivity(inviteId: string, body: string, parent_id?: string) {
    return request<{ post: InvitePost }>(`/invites/${encodeURIComponent(inviteId)}/activity`, {
      method: 'POST',
      body: JSON.stringify(parent_id ? { body, parent_id } : { body }),
    });
  },
  likeInviteActivity(inviteId: string, postId: string) {
    return request<null>(`/invites/${encodeURIComponent(inviteId)}/activity/${encodeURIComponent(postId)}/like`, {
      method: 'POST',
    });
  },
  /** PE6: photo album (200/invite). */
  invitePhotos(inviteId: string) {
    return request<{ photos: { id: string; url: string }[]; album_link?: string }>(
      `/invites/${encodeURIComponent(inviteId)}/photos`
    );
  },
  addInvitePhotos(inviteId: string, urls: string[]) {
    return request<{ added: number }>(`/invites/${encodeURIComponent(inviteId)}/photos`, {
      method: 'POST',
      body: JSON.stringify({ urls }),
    });
  },
};

export interface Wallet {
  cashMinor: number;
  pendingMinor: number;
  creditsMinor: number;
  credits?: { id: string; remainingMinor: number; expiresAt?: string }[];
}

export interface WalletActivity {
  kind: 'credit' | 'pending' | 'cash_in' | 'withdraw' | 'spend';
  label: string;
  amountMinor: number;
  at: string;
}

export interface WaitingRoomEntry {
  eventId: string;
  userId: string;
  status: 'waiting' | 'queued' | 'admitted' | 'left' | 'expired' | 'not_selected' | 'done' | 'removed';
  position?: number;
  holdUntil?: string;
  leftAt?: string;
}

export interface OrderShare {
  shareId: string;
  orderId: string;
  amountMinor: number;
  contact?: string;
  status: 'pending' | 'paid' | 'released' | 'covered';
  expiresAt: string;
}

export interface InvitePoll {
  locked?: boolean;
  options?: { id: string; starts_at: string; votes: number; voter_ids?: string[] }[];
  my_option_ids?: string[];
}

export interface InvitePost {
  id: string;
  body: string;
  kind?: 'comment' | 'blast';
  authorName?: string;
  createdAt?: string;
  likeCount?: number;
  liked_by_me?: boolean;
  legacy?: boolean;
  replies?: InvitePost[];
}

// ---- v2 types (designs/handoff/01-data-model.md + 02-api.md) ----

export type Intent = 'going_out' | 'hosting_friends' | 'running_events';

export interface Money {
  amount_minor: number;
  currency: string;
}

export interface Membership {
  org?: { id: string; name: string } | null;
  org_id?: string;
  role: 'admin' | 'cohost' | 'gate' | string;
  event_scope?: string[] | null;
  verification_status?: string;
}

export interface OtpStart {
  challenge_id: string;
  channel: 'sms' | 'whatsapp' | 'email' | string;
  resend_after: number | string;
}

export interface OtpVerify {
  token: string;
  user: User;
  is_new: boolean;
  memberships: Membership[];
  landing: string | { mode?: string; org_id?: string; screen?: string } | null;
  refreshToken?: string;
}

export interface MeSession {
  id: string;
  device?: string;
  created_at?: string;
  last_seen_at?: string;
  current?: boolean;
}

/** `EventCard` as returned by /home and /feed. The contract leaves the card
 *  shape open, so both the v2 snake_case and the current camelCase fields are
 *  read. */
export interface EventCardData {
  id: string;
  title: string;
  category?: string;
  starts_at?: string;
  startsAt?: string;
  tz?: string;
  venue_timezone?: string;
  venueTimezone?: string;
  venue?: { name?: string; timezone?: string } | string | null;
  location?: string;
  about?: string;
  description?: string;
  cover_url?: string;
  imageUrl?: string;
  currency?: string;
  status?: string;
  state?: string;
  from_price?: Money | null;
  fromPriceCents?: number | null;
  left?: number | null;
  sold_out?: boolean;
  tiers?: Tier[];
}

export interface HomeResponse {
  featured: EventCardData[];
  days: { date: string; count: number }[];
  categories: { name: string; count: number }[];
  lineup: EventCardData[];
}

export interface Invite {
  id: string;
  code: string;
  host_user_id?: string;
  title: string;
  starts_at: string;
  tz?: string;
  place_text?: string;
  area?: string;
  cover?: { tone?: string; image_url?: string } | null;
  note?: string;
  approve_guests: boolean;
  allow_plus_ones: boolean;
  guest_cap?: number | null;
  show_guest_list: boolean;
  hide_address_until_going: boolean;
  status: 'active' | 'cancelled' | 'moved' | string;
  moved_to_event_id?: string;
  is_host?: boolean;
  rsvp_labels?: Record<string, string>;
  place_hidden?: boolean;
}

export type RsvpStatus = 'going' | 'maybe' | 'no' | 'requested' | 'declined';

export interface InviteRsvp {
  invite_id?: string;
  user_id?: string;
  name?: string;
  status: RsvpStatus;
  plus_ones: number;
  checked_in_at?: string | null;
}

export interface InvitePageResponse extends Partial<Invite> {
  invite?: Invite;
  host: { name: string; initials: string };
  counts?: Partial<Record<'going' | 'maybe' | 'requested' | 'no', number>> & { going_with_plus_ones?: number };
  faces?: (string | { initials?: string; name?: string })[];
  updates?: { id?: string; body: string; sent_at: string }[];
  my_rsvp?: InviteRsvp | null;
  is_host?: boolean;
}

export interface NewInviteBody {
  title: string;
  starts_at?: string;
  place_text: string;
  cover: { tone?: string; image_url?: string } | null;
  note: string;
  approve_guests: boolean;
  allow_plus_ones: boolean;
  guest_cap: number | null;
  show_guest_list: boolean;
  hide_address_until_going: boolean;
  poll_options?: { starts_at: string }[];
  rsvp_deadline?: 'none' | '1d' | '3d' | '1w';
  rsvp_style?: 'words' | 'emoji' | 'custom';
  rsvp_labels?: { going?: string; maybe?: string; no?: string };
  reminders?: ('1w' | '1d' | '2h')[];
  tz?: string;
}

export interface InviteGuests {
  going: InviteRsvp[];
  maybe: InviteRsvp[];
  requested: InviteRsvp[];
  no: InviteRsvp[];
  checked_in: number | InviteRsvp[];
}

export interface PlanItem {
  kind: 'ticket' | 'rsvp' | 'hosting';
  starts_at: string;
  tz?: string;
  title?: string;
  event_id?: string;
  event?: EventCardData;
  invite?: Partial<Invite>;
  code?: string;
  status?: string;
  qty?: number;
  tier?: string;
  place_text?: string;
  venue?: string;
  counts?: InvitePageResponse['counts'];
}

export interface PriceWatch {
  id: string;
  event_id: string;
  tier_id?: string;
  event?: EventCardData;
  tier?: string;
  qty: number;
  max_each?: Money;
  max_each_minor?: number;
  status: string;
}

export interface PlansResponse {
  waiting_on_you: (Partial<Invite> & { host?: { name: string; initials?: string } })[];
  upcoming: PlanItem[];
  waiting: PriceWatch[];
  past: PlanItem[];
}

function unwrapUser(r: User | { user: User }): User {
  return 'user' in r && r.user ? r.user : (r as User);
}
