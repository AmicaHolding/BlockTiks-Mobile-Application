const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:4000';
const TOKEN_KEY = 'sahra_buyer_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    const message =
      data && typeof data === 'object' && 'message' in data
        ? String((data as { message?: unknown }).message)
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

// ---- Types mirroring backend/src/db.ts + route responses ----

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  firstNameAr?: string;
  city?: string;
  interests?: string[];
  dateOfBirth?: string;
  emailVerified?: boolean;
  notificationPrefs?: { push?: boolean; email?: boolean; sms?: boolean };
  role: 'fan' | 'creator' | 'admin' | string;
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
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED' | string;
  venueLayout?: { sections: VenueSection[] };
  tiers?: Tier[];
  venueSections?: VenueSection[];
  createdAt?: string;
}

export interface Listing {
  ticketCode: string;
  sellerId: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  eventLocation: string;
  tierName: string;
  priceCents: number;
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
  userId: string;
  eventId: string;
  kind?: 'TICKET' | 'RESALE' | 'SEATED' | string;
  listingCode?: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED' | string;
  subtotalCents: number;
  discountCents: number;
  feesCents: number;
  totalCents: number;
  promoCodeText?: string;
  ticketCodes?: string[];
  expiresAt?: string;
  createdAt: string;
  paidAt?: string;
  event?: { title?: string } | null;
  items?: { tierName: string; sectionName?: string; quantity: number; unitPriceCents: number }[];
}

export interface OrderIntentResult {
  orderId: string;
  clientSecret: string | null;
  amountCents: number;
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
  direction: 'in' | 'out' | string;
  status: string;
  createdAt: string;
}

export interface Earnings {
  readyCents: number;
  pendingCents: number;
  lifetimeCents: number;
  sales: {
    id: string;
    title: string;
    subtitle: string;
    amountCents: number;
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
  // auth
  signup(input: { firstName: string; lastName?: string; email: string; phone?: string; password: string }) {
    return request<{ token: string; user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  login(email: string, password: string) {
    return request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  me() {
    return request<{ user: User }>('/auth/me');
  },
  updateProfile(fields: Partial<User>) {
    return request<{ user: User }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });
  },
  changePassword(currentPassword: string, newPassword: string) {
    return request<{ ok?: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
  logout() {
    return request<{ ok: boolean }>('/auth/logout', { method: 'POST' });
  },

  // events (public)
  events(params: { category?: string; q?: string; limit?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', params.category);
    if (params.q) qs.set('q', params.q);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ events: SahraEvent[] }>(`/events${suffix}`);
  },
  event(id: string) {
    return request<{ event: SahraEvent }>(`/events/${id}`);
  },
  listings(eventId?: string) {
    const suffix = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
    return request<{ listings: Listing[] }>(`/listings${suffix}`);
  },

  // orders / checkout
  orderIntent(input: {
    eventId?: string;
    tierId?: string;
    sectionId?: string;
    listingCode?: string;
    quantity?: number;
    promoCode?: string;
  }) {
    return request<OrderIntentResult>('/orders/intent', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  order(id: string) {
    return request<{ order: Order }>(`/orders/${id}`);
  },

  // tickets / resale / offers
  tickets() {
    return request<{ tickets: Ticket[] }>('/tickets');
  },
  sellableTickets() {
    return request<{ tickets: Ticket[] }>('/tickets/sellable');
  },
  transferTicket(code: string, recipientEmail: string) {
    return request<{ ticket: Ticket; recipient: { email: string; firstName: string } }>(
      `/tickets/${encodeURIComponent(code)}/transfer`,
      { method: 'POST', body: JSON.stringify({ recipientEmail }) }
    );
  },
  listTicket(code: string, priceCents: number) {
    return request<{ listing: Listing; matchedOffers?: Offer[] }>(
      `/tickets/${encodeURIComponent(code)}/list`,
      { method: 'POST', body: JSON.stringify({ priceCents }) }
    );
  },
  myListings() {
    return request<{ listings: Listing[] }>('/listings/mine');
  },
  cancelListing(code: string) {
    return request<{ cancelled: boolean }>(`/listings/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    });
  },
  myOffers() {
    return request<{ offers: Offer[] }>('/offers/mine');
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
  withdraw() {
    return request<unknown>('/account/withdraw', { method: 'POST' });
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
    return request<{ code: string; shareUrl: string; earnedCents: number; friends: unknown[]; note?: string }>(
      '/account/referrals'
    );
  },
  faqs() {
    return request<{ categories: { name: string; faqs: Faq[] }[] }>('/faqs');
  },
};
