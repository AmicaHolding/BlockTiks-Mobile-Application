const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:4000';
const TOKEN_KEY = 'sahra_studio_token';

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

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  role: 'user' | 'creator' | string;
}

export interface Tier {
  id?: string;
  name: string;
  description?: string;
  priceCents: number;
  price?: number;
  quantity: number;
  sold?: number;
  available?: number;
  remaining?: number;
}

export interface VenueSection {
  id: string;
  name: string;
  priceCents: number;
  price?: number;
  capacity: number;
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
  status?: string;
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

export const api = {
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
  myEvents() {
    return request<{ events: StudioEvent[] }>('/events/mine');
  },
  event(id: string) {
    return request<{ event: StudioEvent }>(`/events/${id}`);
  },
  createEvent(payload: CreateEventPayload) {
    return request<{ event: StudioEvent }>('/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  publishEvent(id: string) {
    return request<{ event: StudioEvent }>(`/events/${id}/publish`, {
      method: 'POST',
    });
  },
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
          })),
        },
      }),
    });
  },
  eventGuests(id: string) {
    return request<EventGuestsResponse>(`/events/${id}/guests`);
  },
  eventOrders(id: string) {
    return request<EventOrdersResponse>(`/events/${id}/orders`);
  },
};
