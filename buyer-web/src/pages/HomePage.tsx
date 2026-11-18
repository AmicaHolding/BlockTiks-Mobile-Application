import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, api, type EventCardData, type HomeResponse } from '../lib/api';
import { useAuth } from '../lib/auth';
import { cardImage, cardPrice, cardStart, cardTz, cardVenue } from '../lib/cards';
import { inTz, venueDateTime, venueDayKey } from '../lib/format';
import { EVENT_MEDIA_GRADIENT } from '../components/EventCard';
import LineupCard from '../components/LineupCard';
import { useHost } from '../components/HostFlow';
import { EmptyState, Spinner } from '../components/ui';
import { SearchIcon } from '../components/icons';

const CITIES = ['Dubai', 'Abu Dhabi', 'Riyadh', 'Jeddah', 'Doha', 'Manama'];
const HERO_MS = 6500;

function Hero({ featured }: { featured: EventCardData[] }) {
  const [i, setI] = useState(0);
  const items = featured.slice(0, 3);
  useEffect(() => {
    if (items.length < 2) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % items.length), HERO_MS);
    return () => window.clearInterval(t);
  }, [items.length]);
  if (!items.length) return null;
  const e = items[Math.min(i, items.length - 1)];
  const img = cardImage(e);
  return (
    <section className="relative overflow-hidden rounded-card bg-night-deep">
      <div className={`absolute inset-0 bg-gradient-to-br ${EVENT_MEDIA_GRADIENT}`}>
        {img ? <img src={img} alt="" className="h-full w-full object-cover opacity-60" /> : null}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-night via-night/60 to-transparent" />
      <div className="relative flex min-h-[380px] flex-col justify-end p-6 sm:min-h-[440px] sm:p-10">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Featured · {e.category}</span>
        <h1 className="mt-2 max-w-2xl font-display text-4xl font-extrabold leading-tight text-sand sm:text-5xl">{e.title}</h1>
        <p className="mt-2 text-sm text-sand/80">
          {[venueDateTime(cardStart(e), cardTz(e)), cardVenue(e)].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link to={`/events/${e.id}`} className="rounded-full bg-gold px-6 py-3 text-sm font-bold text-night hover:brightness-95">
            Get tickets
          </Link>
          {cardPrice(e) ? <span className="text-sm font-semibold text-sand">{cardPrice(e)}</span> : null}
        </div>
        {items.length > 1 ? (
          <div className="mt-6 flex gap-2" role="tablist" aria-label="Featured events">
            {items.map((it, n) => (
              <button
                key={it.id}
                type="button"
                role="tab"
                aria-selected={n === i}
                aria-label={it.title}
                onClick={() => setI(n)}
                className={`h-1.5 rounded-full transition-all ${n === i ? 'w-10 bg-gold' : 'w-5 bg-sand/30 hover:bg-sand/50'}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** v2 front door: `GET /home?city=` (02-api). Works signed out (A8). */
export default function HomePage() {
  const { user } = useAuth();
  const { openHost } = useHost();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const city = params.get('city') ?? user?.city ?? 'Dubai';
  const [data, setData] = useState<HomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    api
      .home(city)
      .then((res) => live && setData(res))
      .catch((e) => live && setError(e instanceof ApiError ? e.message : 'Could not load events'))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [city]);

  const days = data?.days ?? [];
  const categories = (data?.categories ?? []).filter((c) => c.count > 0);

  const lineup = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.lineup ?? []).filter((e) => {
      if (day && venueDayKey(cardStart(e), cardTz(e)) !== day) return false;
      if (category && (e.category ?? '').toLowerCase() !== category.toLowerCase()) return false;
      if (needle && !`${e.title} ${cardVenue(e)} ${e.category ?? ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [data, day, category, q]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" aria-label="City">
          {CITIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === city}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set('city', c);
                setParams(next, { replace: true });
                setDay(null);
                setCategory(null);
              }}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${c === city ? 'bg-gold text-night' : 'bg-night-surface text-sand/80 hover:bg-night-elevated'}`}
            >
              {c}
            </button>
          ))}
        </div>
        <form onSubmit={onSearch} className="relative w-full sm:w-80">
          <SearchIcon className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-night-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events, venues, artists"
            aria-label="Search"
            className="w-full rounded-full border border-night-border bg-night-surface py-2.5 pe-4 ps-10 text-sm text-sand outline-none placeholder:text-night-muted focus:border-gold"
          />
        </form>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <EmptyState title="Couldn’t load events">{error}</EmptyState>
      ) : (
        <>
          <Hero featured={data?.featured ?? []} />

          <section aria-labelledby="pick-night">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-night-muted">The next three weeks</span>
                <h2 id="pick-night" className="font-display text-2xl font-extrabold text-sand sm:text-3xl">Pick a night.</h2>
              </div>
              {day ? (
                <button type="button" onClick={() => setDay(null)} className="text-sm font-semibold text-gold">
                  Any night
                </button>
              ) : null}
            </div>
            <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
              {days.slice(0, 21).map((d) => {
                const on = d.date === day;
                const empty = d.count === 0;
                const noon = `${d.date}T12:00:00Z`;
                return (
                  <button
                    key={d.date}
                    type="button"
                    aria-pressed={on}
                    disabled={empty}
                    onClick={() => setDay(on ? null : d.date)}
                    className={`flex w-16 shrink-0 flex-col items-center rounded-xl border py-2.5 transition ${
                      on
                        ? 'border-gold bg-gold text-night'
                        : empty
                          ? 'border-night-border/40 bg-night-deep text-night-muted/50'
                          : 'border-night-border bg-night-surface text-sand hover:border-gold/50'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase">{inTz(noon, 'UTC', { weekday: 'short' })}</span>
                    <span className="font-display text-xl font-extrabold leading-tight">{inTz(noon, 'UTC', { day: 'numeric' })}</span>
                    <span className={`text-[10px] font-semibold ${on ? 'text-night/70' : 'text-night-muted'}`}>
                      {empty ? '–' : `${d.count}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {categories.length ? (
            <section aria-label="Categories" className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const on = category === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCategory(on ? null : c.name)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${on ? 'bg-sand text-night' : 'bg-night-surface text-sand/80 hover:bg-night-elevated'}`}
                  >
                    {c.name} <span className={on ? 'text-night/60' : 'text-night-muted'}>{c.count}</span>
                  </button>
                );
              })}
            </section>
          ) : null}

          <section aria-labelledby="lineup">
            <h2 id="lineup" className="font-display text-2xl font-extrabold text-sand">
              {day ? `On ${inTz(`${day}T12:00:00Z`, 'UTC', { weekday: 'long', day: 'numeric', month: 'short' })}` : `The lineup in ${city}`}
            </h2>
            <div className="mt-4 space-y-3">
              {lineup.length ? (
                lineup.map((e) => <LineupCard key={e.id} event={e} />)
              ) : (
                <EmptyState title="Nothing matches yet">Try another night or category.</EmptyState>
              )}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => openHost('personal')}
              className="rounded-card border border-night-border bg-night-surface p-6 text-start transition hover:border-gold/50"
            >
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Hosted by you</span>
              <div className="mt-2 font-display text-xl font-extrabold text-sand">Having people over?</div>
              <p className="mt-1 text-sm text-night-muted">Make a free invite, share the link, see who’s coming.</p>
            </button>
            <button
              type="button"
              onClick={() => openHost('public')}
              className="rounded-card border border-night-border bg-night-surface p-6 text-start transition hover:border-gold/50"
            >
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Hosted by an organisation</span>
              <div className="mt-2 font-display text-xl font-extrabold text-sand">Selling tickets?</div>
              <p className="mt-1 text-sm text-night-muted">Open Sahra Studio to build your event and sell tickets.</p>
            </button>
          </section>
        </>
      )}
    </div>
  );
}
