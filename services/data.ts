// Mock data layer mirroring the entities used in the Flutter app.
// Replace these with real API calls once the backend endpoints are available.

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
}

export const EVENTS: Event[] = [
  {
    id: '1',
    title: 'DJ MaksMellow Orignawa',
    category: 'Music Concert',
    date: 'April 20, 2024',
    time: '8:00 PM',
    location: 'Madison Square Garden, New York',
    description:
      'South Korean girl group Blackpink have embarked on two headlining concert tours. In July 2017, the group held their debut showcase in Japan.',
    price: 405,
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
    organizer: 'Cloud Music Events',
    coordinates: { lat: 40.7505, lng: -73.9934 },
  },
  {
    id: '2',
    title: 'NBA Finals: Game 4',
    category: 'Sports',
    date: 'Sunday, October 26',
    time: '7:30 PM',
    location: 'Crypto.com Arena, Los Angeles',
    description: 'The biggest basketball event of the year.',
    price: 220,
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
    organizer: 'NBA',
  },
  {
    id: '3',
    title: 'Hamilton',
    category: 'Theater',
    date: 'Monday, October 27',
    time: '7:00 PM',
    location: 'Richard Rodgers Theatre, New York',
    description: 'The story of America then, told by America now.',
    price: 150,
    image: 'https://images.unsplash.com/photo-1503095392237-fc63a94e9cc8?w=800&q=80',
    organizer: 'Broadway League',
  },
  {
    id: '4',
    title: 'Comedy Night Live',
    category: 'Comedy',
    date: 'Friday, October 31',
    time: '9:00 PM',
    location: 'The Laugh Factory, Chicago',
    description: 'A night of laughter with top stand-up comedians.',
    price: 45,
    image: 'https://images.unsplash.com/photo-1527224857830-43a7acc95260?w=800&q=80',
    organizer: 'Laugh Factory',
  },
];

export const CATEGORIES = ['Music', 'Sports', 'Theater', 'Comedy', 'Festivals'];
export const EVENT_CATEGORIES = ['Music', 'Sports', 'Theater', 'Comedy', 'Festivals', 'Conference'];


export const POPULAR_SEARCHES = ['DJ Night', 'Basketball', 'Comedy Show', 'Broadway', 'Festival'];

export const RECENT_SEARCHES = ['Rock N Roll', 'Cyberpunk', 'Epic Bass'];

export interface Ticket {
  id: string;
  eventId: string;
  eventTitle: string;
  date: string;
  location: string;
  image: string;
  type: 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
  price: number;
  qrCode: string;
  used: boolean;
}

export const MY_TICKETS: Ticket[] = [
  {
    id: 't1',
    eventId: '1',
    eventTitle: 'DJ MaksMellow Orignawa',
    date: 'April 20, 2024',
    location: 'Madison Square Garden',
    image: EVENTS[0].image,
    type: 'Platinum',
    price: 405,
    qrCode: 'BT-1-PLT-2024',
    used: false,
  },
  {
    id: 't2',
    eventId: '2',
    eventTitle: 'NBA Finals: Game 4',
    date: 'October 26, 2024',
    location: 'Crypto.com Arena',
    image: EVENTS[1].image,
    type: 'Gold',
    price: 220,
    qrCode: 'BT-2-GLD-2024',
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
  { id: '1', title: 'Ticket Purchase', amount: -405, date: 'Oct 20, 2024', type: 'debit' },
  { id: '2', title: 'Refund - NBA Game', amount: 120, date: 'Oct 18, 2024', type: 'credit' },
  { id: '3', title: 'Wallet Deposit', amount: 2000, date: 'Oct 15, 2024', type: 'credit' },
  { id: '4', title: 'Ticket Resale', amount: 110, date: 'Oct 12, 2024', type: 'credit' },
];

export const USER_PROFILE = {
  name: '123 Clouds Music',
  role: 'User',
  bio: 'Dubai event creator who hosts the best DJ sets and parties in the Middle East.',
  website: 'cloudmusic.com',
  followers: 37,
  following: 41000,
  avatar: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400&q=80',
};

export const ANALYTICS = {
  totalSales: 12450,
  ticketsSold: 348,
  eventsLive: 6,
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
  { id: 'm2', eventId: '2', sellerName: 'Sarah L.', tier: 'VIP', quantity: 1, price: 135, faceValue: 150, listedAt: '5h ago', sellerRating: 4.8 },
  { id: 'm3', eventId: '3', sellerName: 'Mike J.', tier: 'Orchestra', quantity: 2, price: 175, faceValue: 150, listedAt: '1d ago', sellerRating: 4.7 },
  { id: 'm4', eventId: '1', sellerName: 'DJ Fan 99', tier: 'Backstage Pass', quantity: 1, price: 320, faceValue: 295, listedAt: '1d ago', sellerRating: 5.0 },
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
  { id: 'u1', eventId: '2', tier: 'VIP', quantity: 1, price: 140, status: 'active', type: 'ask' },
  { id: 'u2', eventId: '1', tier: 'General Admission', quantity: 2, price: 90, status: 'sold', type: 'ask' },
];
