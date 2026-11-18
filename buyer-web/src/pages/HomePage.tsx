import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { SahraEvent } from '../lib/api';
import { fetchAvailableEvents } from '../lib/events';
import { useAuth } from '../lib/auth';
import { STUDIO_URL } from '../lib/config';
import { formatEventDate, formatMoney, isThisWeekend } from '../lib/format';
import EventCard, { eventSoldOut, lowestPrice } from '../components/EventCard';
import { EmptyState, Spinner } from '../components/ui';
import { SearchIcon, TicketIcon } from '../components/icons';

const CITY_CHIPS = ['Dubai', 'Abu Dhabi', 'Riyadh', 'Doha'];
const CITY_KEY = 'sahra_home_city';
const DEFAULT_CATEGORIES = ['Concerts', 'Comedy', 'Festivals', 'Football', 'Theatre', 'Nightlife', 'Arts'];
// data-rise stagger from the prototype: 80 + i*90 ms
const RISE = [80, 170, 260, 350];

function calm(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function HomePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [events, setEvents] = useState<SahraEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLElement>(null);
  const [bandRevealed, setBandRevealed] = useState(false);
  // First mount → weekend section rises at 520ms; later city changes → 450ms slide.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  const category = params.get('category') ?? 'All';
  const q = (params.get('q') ?? '').trim();
  const [heroInput, setHeroInput] = useState(q);

  // fcity, city chips are defined-but-unrendered in the prototype model;
  // we render them alongside the category chips in the all-events header.
  const [citySel, setCitySel] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CITY_KEY);
    } catch {
      return null;
    }
  });
  const city = citySel ?? user?.city ?? 'Dubai';
  const noCityEvents = city !== 'Dubai';

  function pickCity(name: string) {
    setCitySel(name);
    try {
      localStorage.setItem(CITY_KEY, name);
    } catch {
      /* best effort */
    }
  }

  useEffect(() => setHeroInput(q), [q]);

  useEffect(() => {
    let active = true;
    fetchAvailableEvents({ limit: 100 })
      .then((events) => {
        if (active) setEvents(events);
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

  // IntersectionObserver reveal on the hosting band (threshold .25, proto watchBand).
  useEffect(() => {
    const el = bandRef.current;
    if (!el || calm() || !('IntersectionObserver' in window)) {
      setBandRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setBandRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    for (const e of events) if (e.category) set.add(e.category);
    return ['All', ...set];
  }, [events]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return events.filter(
      (e) =>
        (category === 'All' || e.category === category) &&
        (!needle || `${e.title} ${e.category} ${e.location}`.toLowerCase().includes(needle))
    );
  }, [events, category, q]);

  // "This weekend in {city}" · Dubai only, no query, All category.
  // Up to 3 in-stock weekend events, leaving at least one in the grid.
  const weekend = useMemo(() => {
    if (city !== 'Dubai' || q || category !== 'All') return [];
    const pool = filtered.filter((e) => !eventSoldOut(e) && isThisWeekend(e.startsAt));
    return pool.slice(0, Math.max(0, Math.min(3, filtered.length - 1)));
  }, [filtered, city, q, category]);

  const weekendIds = useMemo(() => new Set(weekend.map((e) => e.id)), [weekend]);
  const gridEvents = filtered.filter((e) => !weekendIds.has(e.id));
  const allTitle = q ? 'Results' : weekend.length ? 'More events' : 'All events';

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value == null || value === '' || value === 'All') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  function heroSearch() {
    setParam('q', heroInput.trim() || null);
    allRef.current?.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'start' });
  }

  return (
    <div className="flex flex-col pb-0">
      {/* hero */}
      <section className="relative isolate overflow-hidden border-b border-night-surface px-6 pb-14 pt-[72px] text-center lg:px-8">
        <div className="mx-auto flex max-w-[760px] flex-col items-center gap-[22px]">
          <span
            className="sahra-rise text-xs font-semibold uppercase tracking-[0.16em] text-gold"
            style={{ '--rise-delay': `${RISE[0]}ms` } as CSSProperties}
          >
            Tickets across the Gulf
          </span>
          <h1
            className="sahra-rise font-display text-[40px] font-extrabold leading-[1.02] tracking-[-0.035em] text-sand sm:text-[56px]"
            style={{ '--rise-delay': `${RISE[1]}ms` } as CSSProperties}
          >
            Every night out, in one place.
          </h1>
          <p
            className="sahra-rise max-w-[520px] text-lg leading-relaxed text-night-subtle"
            style={{ '--rise-delay': `${RISE[2]}ms` } as CSSProperties}
          >
            Concerts, comedy, nightlife and sport across {city}. Buy, send and resell tickets safely.
          </p>
          <form
            className="sahra-rise flex w-full max-w-[620px] items-center gap-2 rounded-full bg-night-surface py-1.5 pl-5 pr-1.5"
            style={{ '--rise-delay': `${RISE[3]}ms` } as CSSProperties}
            onSubmit={(e) => {
              e.preventDefault();
              heroSearch();
            }}
          >
            <SearchIcon size={17} className="shrink-0 text-night-muted" />
            <input
              value={heroInput}
              onChange={(e) => {
                setHeroInput(e.target.value);
                setParam('q', e.target.value.trim() || null);
              }}
              placeholder={`Search events in ${city}`}
              className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-sand outline-none placeholder:text-night-muted"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-gold px-[22px] py-3 text-[15px] font-semibold text-night transition hover:brightness-95"
            >
              Find events
            </button>
          </form>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1440px]">
        {/* this weekend */}
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner />
          </div>
        ) : error ? (
          <div className="px-6 py-24 text-center lg:px-8">
            <EmptyState title="Couldn’t load events">{error}</EmptyState>
          </div>
        ) : (
          <>
            {weekend.length > 0 ? (
              <div key={city} className={mounted.current ? 'sahra-city-change' : ''}>
                <section
                  className={`flex flex-col gap-5 px-6 pb-2 pt-10 lg:px-8 ${
                    mounted.current ? '' : 'sahra-city-in'
                  }`}
                >
                  <h2 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-sand">
                    This weekend in {city}
                  </h2>
                  <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
                    {weekend.map((event) => (
                      <WeekendCard key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {/* all events */}
            <section ref={allRef} className="flex scroll-mt-4 flex-col gap-6 px-6 pb-10 pt-10 lg:px-8">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-sand">{allTitle}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {CITY_CHIPS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => pickCity(c)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        city === c
                          ? 'bg-gold text-night'
                          : 'border border-night-border bg-transparent text-sand hover:bg-night-surface'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                  <span className="mx-1 hidden h-6 w-px bg-night-border sm:block" aria-hidden />
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setParam('category', cat === 'All' ? null : cat)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        category === cat ? 'bg-gold text-night' : 'bg-night-surface text-sand hover:bg-night-elevated'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {noCityEvents ? (
                <div className="flex items-center gap-4 rounded-card border-2 border-dashed border-night-border px-8 py-10 text-night-muted">
                  <TicketIcon size={28} className="shrink-0 text-night-muted" />
                  <span>
                    Nothing on in {city} yet, your city’s sahra is coming.{' '}
                    <button type="button" onClick={() => pickCity('Dubai')} className="font-semibold text-gold hover:underline">
                      See what’s on in Dubai
                    </button>
                  </span>
                </div>
              ) : gridEvents.length === 0 ? (
                <div className="flex items-center gap-4 rounded-card border-2 border-dashed border-night-border px-8 py-10 text-night-muted">
                  <TicketIcon size={28} className="shrink-0 text-night-muted" />
                  <span>
                    {events.length === 0
                      ? 'No events yet · Sahra is almost ready. Check back soon for nights out across the region.'
                      : 'Nothing matches. Try another search or category.'}
                  </span>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {gridEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* hosting band */}
        <section
          ref={bandRef}
          style={!bandRevealed ? { opacity: 0 } : undefined}
          className={`mx-6 mb-10 flex flex-wrap items-center justify-between gap-6 rounded-[22px] bg-gold px-8 py-7 text-night lg:mx-8 lg:px-9 ${
            bandRevealed && !calm() ? 'sahra-band-in' : ''
          }`}
        >
          <div className="flex max-w-[560px] flex-col gap-2">
            <strong className="font-display text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em]">
              Hosting events?
            </strong>
            <span className="text-[15px] leading-relaxed">
              Sell tickets, control resale and run your door from the same Sahra account.
            </span>
          </div>
          <a
            href={STUDIO_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-night px-6 py-3 text-[15px] font-semibold text-gold transition hover:brightness-125"
          >
            Start hosting
          </a>
        </section>
      </div>
    </div>
  );
}

/* weekend card: 240px, striped cover, bottom gradient overlay */
function WeekendCard({ event }: { event: SahraEvent }) {
  const price = lowestPrice(event.tiers);
  return (
    <Link
      to={`/events/${event.id}`}
      style={{ '--lift': '-6px' } as CSSProperties}
      className="sahra-card sahra-card-lg group relative block h-72 overflow-hidden rounded-[20px] text-left"
    >
      {event.imageUrl ? (
        <img src={event.imageUrl} alt={event.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className={`absolute inset-0 ${STRIPE_BG}`} />
      )}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-[#16263bf2] via-[#16263bf2]/60 to-transparent p-5 pt-14">
        <strong className="font-display text-2xl font-bold tracking-[-0.02em] text-sand group-hover:text-gold">
          {event.title}
        </strong>
        <span className="text-[15px] text-night-subtle">
          {formatEventDate(event.startsAt)} · {event.location}
        </span>
        <span className="tnum text-[15px] font-semibold text-gold">
          {price != null ? (price === 0 ? 'Free' : `From ${formatMoney(price, event.currency)}`) : 'Tickets'}
        </span>
      </div>
    </Link>
  );
}

// Diagonal stripe texture on the Night surface scale (prototype cover treatment).
const STRIPE_BG =
  'bg-[repeating-linear-gradient(135deg,#22344d_0_16px,#2a3b52_16px_32px)]';
