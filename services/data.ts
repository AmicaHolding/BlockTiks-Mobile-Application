// Mock data layer mirroring the entities used in the Flutter app.
// Replace these with real API calls once the backend endpoints are available.

export interface TicketTier {
  id: string;
  name: string;
  description: string;
  price: number;
  remaining: number;
}

export interface Event {
  id: string;
  title: string;
  category: string;
  date: string;
  time: string;
  location: string;
  description: string;
  price: number;
  image: string;
  organizer: string;
  coordinates?: { lat: number; lng: number };
  lineup?: string[];
  going?: number;
  tiers?: TicketTier[];
}

const DEFAULT_TIERS: TicketTier[] = [
  { id: 'ga', name: 'General Admission', description: 'Standard entry', price: 0, remaining: 120 },
  { id: 'vip', name: 'VIP', description: 'Priority entry + lounge access', price: 0, remaining: 24 },
];

export const EVENTS: Event[] = [
  {
    id: '1',
    title: 'Midnight Frequencies — Live Electronic Night',
    category: 'Music',
    date: 'Saturday, Nov 22',
    time: '10:00 PM',
    location: 'Brooklyn Mirage, New York',
    description:
      'Three rooms, one night. Resident selectors and international headliners take over Brooklyn Mirage for a late-set electronic marathon.',
    price: 65,
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
    organizer: 'Cloud Music Events',
    coordinates: { lat: 40.7207, lng: -73.9512 },
    lineup: ['DJ Nova', 'Cassian', 'Yuna Waves', 'Special guest TBA'],
    going: 342,
    tiers: [
      { id: 'ga', name: 'General Admission', description: 'Standing room, main floor', price: 65, remaining: 118 },
      { id: 'vip', name: 'VIP Balcony', description: 'Raised deck + dedicated bar', price: 140, remaining: 22 },
      { id: 'backstage', name: 'Backstage Experience', description: 'Artist meet & greet + afterparty', price: 295, remaining: 6 },
    ],
  },
  {
    id: '2',
    title: 'NBA Finals: Game 4',
    category: 'Sports',
    date: 'Sunday, Nov 16',
    time: '7:30 PM',
    location: 'Crypto.com Arena, Los Angeles',
    description: 'The biggest basketball event of the year. Courtside energy, sold-out crowd.',
    price: 220,
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
    organizer: 'NBA',
    going: 18900,
    tiers: [
      { id: 'lower', name: 'Lower Bowl', description: 'Sections 100–120', price: 180, remaining: 240 },
      { id: 'upper', name: 'Upper Bowl', description: 'Sections 200–220', price: 95, remaining: 890 },
      { id: 'courtside', name: 'Courtside', description: 'Floor level, closest to action', price: 2400, remaining: 8 },
    ],
  },
  {
    id: '3',
    title: 'Hamilton',
    category: 'Theater',
    date: 'Monday, Nov 24',
    time: '7:00 PM',
    location: 'Richard Rodgers Theatre, New York',
    description: 'The story of America then, told by America now. Eight Tony Awards. One legendary show.',
    price: 150,
    image: 'https://images.unsplash.com/photo-1503095392237-fc63a94e9cc8?w=800&q=80',
    organizer: 'Broadway League',
    going: 64,
    tiers: [
      { id: 'orchestra', name: 'Orchestra', description: 'Rows A–J, center orchestra', price: 189, remaining: 45 },
      { id: 'mezzanine', name: 'Mezzanine', description: 'First & second mezzanine', price: 129, remaining: 78 },
      { id: 'balcony', name: 'Balcony', description: 'Rear balcony seating', price: 79, remaining: 132 },
    ],
  },
  {
    id: '4',
    title: 'Comedy Night Live',
    category: 'Comedy',
    date: 'Friday, Nov 21',
    time: '9:00 PM',
    location: 'The Laugh Factory, Chicago',
    description: 'A night of laughter with top stand-up comedians. Two shows, one lineup.',
    price: 45,
    image: 'https://images.unsplash.com/photo-1527224857830-43a7acc95260?w=800&q=80',
    organizer: 'Laugh Factory',
    going: 87,
    tiers: [
      { id: 'ga', name: 'General Admission', description: 'Standard seating', price: 45, remaining: 64 },
      { id: 'vip', name: 'VIP Front Row', description: 'First two rows + meet & greet', price: 95, remaining: 10 },
    ],
  },
  {
    id: '5',
    title: 'Design Systems Conf 2026',
    category: 'Conference',
    date: 'Wednesday, Nov 19',
    time: '9:00 AM',
    location: 'Pier 36, San Francisco',
    description: 'A full day of talks on design tokens, motion, and shipping product at scale.',
    price: 120,
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    organizer: 'Design Systems Guild',
    going: 210,
    tiers: [
      { id: 'ga', name: 'General Pass', description: 'All talks + expo hall', price: 120, remaining: 140 },
      { id: 'workshop', name: 'Workshop Pass', description: 'All talks + hands-on workshop', price: 260, remaining: 30 },
    ],
  },
  {
    id: '6',
    title: 'Neon Nights Festival',
    category: 'Festivals',
    date: 'Saturday, Dec 6',
    time: '4:00 PM',
    location: 'Empire Polo Club, Indio',
    description: 'Two stages, immersive art installations, and a closing fireworks set.',
    price: 180,
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80',
    organizer: 'Neon Nights',
    going: 5400,
    tiers: [
      { id: 'ga', name: '3-Day Pass', description: 'Full festival access', price: 380, remaining: 900 },
      { id: 'vip', name: 'VIP', description: 'VIP decks + lounge + parking', price: 780, remaining: 120 },
    ],
  },
];

export const CATEGORIES = ['Music', 'Sports', 'Theater', 'Comedy', 'Festivals', 'Conference'];
export const EVENT_CATEGORIES = CATEGORIES;

export const FEED_FILTERS = ['For You', 'Music', 'Sports', 'Theater', 'Comedy', 'Festivals', 'Conference'];

export function eventsForFilter(filter: string): Event[] {
  if (filter === 'For You') return EVENTS;
  return EVENTS.filter((e) => e.category === filter);
}

export const POPULAR_SEARCHES = ['DJ Night', 'Basketball', 'Comedy Show', 'Broadway', 'Festival'];

export const RECENT_SEARCHES = ['Rock N Roll', 'Cyberpunk', 'Epic Bass'];

export interface Ticket {
  id: string;
  eventId: string;
  eventTitle: string;
  date: string;
  location: string;
  image: string;
  type: 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | string;
  price: number;
  qrCode: string;
  used: boolean;
}

export const MY_TICKETS: Ticket[] = [
  {
    id: 't1',
    eventId: '1',
    eventTitle: 'Midnight Frequencies — Live Electronic Night',
    date: 'November 22, 2026',
    location: 'Brooklyn Mirage, New York',
    image: EVENTS[0].image,
    type: 'VIP Balcony',
    price: 140,
    qrCode: 'BT-1-VIP-2026',
    used: false,
  },
  {
    id: 't2',
    eventId: '3',
    eventTitle: 'Hamilton',
    date: 'November 24, 2026',
    location: 'Richard Rodgers Theatre, New York',
    image: EVENTS[2].image,
    type: 'Orchestra',
    price: 189,
    qrCode: 'BT-3-ORC-2026',
    used: false,
  },
];

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  type: 'credit' | 'debit';
}

export const TRANSACTIONS: Transaction[] = [
  { id: '1', title: 'Ticket Purchase — Midnight Frequencies', amount: -164, date: 'Nov 10, 2026', type: 'debit' },
  { id: '2', title: 'Resale — NBA Finals upper bowl', amount: 85, date: 'Nov 8, 2026', type: 'credit' },
  { id: '3', title: 'Wallet Deposit', amount: 200, date: 'Nov 5, 2026', type: 'credit' },
  { id: '4', title: 'Ticket Purchase — Comedy Night Live', amount: -49, date: 'Nov 2, 2026', type: 'debit' },
];

export const USER_PROFILE = {
  name: 'Alex Rivera',
  role: 'User',
  bio: 'Concert regular. Reselling my extra tickets since 2024.',
  website: 'alexr.co',
  followers: 128,
  following: 342,
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&q=80',
};

export const ANALYTICS = {
  totalSales: 12450,
  ticketsSold: 348,
  eventsLive: 2,
  revenue: 9820,
};

export interface MarketListing {
  id: string;
  eventId: string;
  sellerName: string;
  tier: string;
  quantity: number;
  price: number;
  faceValue: number;
  listedAt: string;
  sellerRating: number;
}

export const MARKET_LISTINGS: MarketListing[] = [
  { id: 'm1', eventId: '1', sellerName: 'Alex M.', tier: 'General Admission', quantity: 2, price: 95, faceValue: 85, listedAt: '2h ago', sellerRating: 4.9 },
  { id: 'm2', eventId: '2', sellerName: 'Sarah L.', tier: 'Courtside', quantity: 1, price: 2200, faceValue: 2400, listedAt: '5h ago', sellerRating: 4.8 },
  { id: 'm3', eventId: '3', sellerName: 'Mike J.', tier: 'Orchestra', quantity: 2, price: 175, faceValue: 189, listedAt: '1d ago', sellerRating: 4.7 },
  { id: 'm4', eventId: '1', sellerName: 'DJ Fan 99', tier: 'Backstage Pass', quantity: 1, price: 320, faceValue: 295, listedAt: '1d ago', sellerRating: 5.0 },
  { id: 'm5', eventId: '4', sellerName: 'Priya K.', tier: 'VIP Front Row', quantity: 1, price: 88, faceValue: 95, listedAt: '2d ago', sellerRating: 4.9 },
];

export interface UserListing {
  id: string;
  eventId: string;
  tier: string;
  quantity: number;
  price: number;
  status: 'active' | 'sold' | 'pending';
  type: 'ask' | 'bid';
}

export const USER_LISTINGS: UserListing[] = [
  { id: 'u1', eventId: '2', tier: 'Lower Bowl', quantity: 1, price: 170, status: 'active', type: 'ask' },
  { id: 'u2', eventId: '1', tier: 'General Admission', quantity: 1, price: 72, status: 'sold', type: 'ask' },
];

export { DEFAULT_TIERS };
