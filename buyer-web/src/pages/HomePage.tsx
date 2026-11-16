import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type SahraEvent } from '../lib/api';
import { formatCents, formatEventDate } from '../lib/format';
import EventCard, { EventCardRow, isSellingFast, lowestPrice } from '../components/EventCard';
import { Badge, Button, Spinner } from '../components/ui';
import { CalendarIcon, FireIcon, MapIcon, TicketIcon } from '../components/icons';

const CATEGORIES = ['All', 'Concerts', 'Comedy', 'Football', 'Theatre', 'Family', 'Nightlife', 'Arts'];

function isThisWeekend(startsAt: string): boolean {
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const day = d.getDay();
  const diff = (day - now.getDay() + 7) % 7;
  return diff <= 2 && d.getTime() > now.getTime();
}

export default function HomePage() {
  const [events, setEvents] = useState<SahraEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .events({ limit: 50 })
      .then((res) => {
        if (active) setEvents(res.events);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load events');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const featured = events[0];
  const weekend = useMemo(() => events.filter((e) => isThisWeekend(e.startsAt)), [events]);
  const rest = useMemo(() => events.filter((e) => e.id !== featured?.id), [events]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="font-display text-2xl font-bold text-sand">Couldn’t load events</div>
        <p className="mt-2 text-night-muted">{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <TicketIcon size={40} className="mx-auto text-gold" />
        <div className="mt-4 font-display text-3xl font-extrabold text-sand">No events yet</div>
        <p className="mt-2 text-night-muted">
          Sahra is almost ready — check back soon for nights out across the region.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-12 px-6 pb-20 pt-8 lg:px-12">
      {/* Hero */}
      {featured ? <Hero event={featured} /> : null}

      {/* Categories */}
      <div className="flex flex-wrap gap-2.5">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            to={cat === 'All' ? '/explore' : `/explore?category=${encodeURIComponent(cat)}`}
            className="rounded-full border border-night-border px-4 py-2 text-sm font-semibold text-sand/85 transition hover:border-gold hover:text-gold"
          >
            {cat}
          </Link>
        ))}
      </div>

      <EventCardRow title="This weekend" events={weekend.length > 0 ? weekend : events.slice(0, 6)} to="/explore" />

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-extrabold text-sand">Everything coming up</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rest.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Hero({ event }: { event: SahraEvent }) {
  const price = lowestPrice(event.tiers);
  const fast = isSellingFast(event);
  const gradient = 'from-indigo-600/50 via-purple-800/40 to-night';

  return (
    <section className="relative overflow-hidden rounded-3xl border border-night-border/60 bg-night-surface">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      {event.imageUrl ? (
        <img src={event.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
      ) : null}
      <div className="relative flex flex-col gap-8 p-8 lg:flex-row lg:items-end lg:justify-between lg:p-12">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            {fast ? (
              <Badge tone="gold">
                <FireIcon size={12} /> Selling fast
              </Badge>
            ) : null}
            <Badge tone="muted">{event.category}</Badge>
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm font-semibold text-night-muted">
            <span className="flex items-center gap-1.5">
              <CalendarIcon size={15} /> {formatEventDate(event.startsAt)}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <MapIcon size={15} /> {event.location}
            </span>
          </div>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight text-sand lg:text-5xl">
            {event.title}
          </h1>
          <p className="mt-3 line-clamp-2 max-w-xl text-[15px] leading-relaxed text-sand/80">
            {event.description}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link to={`/events/${event.id}`}>
              <Button variant="primary" className="px-7 py-3 text-base">
                Get tickets{price != null ? ` · from ${formatCents(price)}` : ''}
              </Button>
            </Link>
            {fast ? (
              <span className="text-sm font-semibold text-gold">Only a few tickets left</span>
            ) : null}
          </div>
        </div>
        <Link
          to={`/events/${event.id}`}
          className="hidden w-72 shrink-0 overflow-hidden rounded-2xl border border-night-border/60 lg:block"
        >
          <div className={`h-44 bg-gradient-to-br ${gradient}`}>
            {event.imageUrl ? (
              <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center font-display text-6xl font-extrabold text-sand/15">
                {event.title.charAt(0)}
              </div>
            )}
          </div>
        </Link>
      </div>
    </section>
  );
}
