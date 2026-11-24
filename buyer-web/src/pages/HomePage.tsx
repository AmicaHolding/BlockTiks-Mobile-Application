import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, api, type EventCardData, type HomeResponse } from '../lib/api';
import { useAuth } from '../lib/auth';
import { cardImage, cardPrice, cardStart, cardTz, cardVenue } from '../lib/cards';
import { inTz, venueDateTime, venueDayKey } from '../lib/format';
import { useHost } from '../components/HostFlow';
import { EmptyState, Spinner } from '../components/ui';

const HERO_MS = 6500;

/** Stripe tones for hero/lineup textures (spec: repeating 135deg stripes). */
const TONES = ['#b8323a', '#2f5c58', '#5a3a5e', '#6e5a36', '#2a4a6e'];
const toneOf = (id: string) => TONES[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
const stripes = (tone: string, a = 26, b = '#1d2e45') =>
  `repeating-linear-gradient(135deg, ${tone} 0 ${a}px, ${b} ${a}px ${a * 2}px)`;

const dowMon = (iso: string | undefined, tz: string) =>
  inTz(iso ?? '', tz, { weekday: 'short', month: 'short' }).toUpperCase();
const dayNum = (iso: string | undefined, tz: string) => inTz(iso ?? '', tz, { day: 'numeric' });

function Hero({ featured }: { featured: EventCardData[] }) {
  const navigate = useNavigate();
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
  const tz = cardTz(e) ?? 'UTC';
  const when = venueDateTime(cardStart(e), tz);
  return (
    <section className="relative flex min-h-[660px] flex-col justify-end overflow-hidden" style={{ background: stripes(toneOf(e.id)) }}>
      <div className="absolute inset-0 -z-0" style={{ background: 'linear-gradient(90deg,#16263b 0%,#16263bf2 36%,#16263b99 64%,#16263b33 100%),linear-gradient(0deg,#16263b 0%,rgba(22,38,59,0) 50%)' }} />
      <span aria-hidden="true" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }} className="pointer-events-none absolute -right-8 -top-3 -z-0 select-none text-[320px] font-semibold leading-[1.1] text-gold opacity-[.13]">الليلة</span>
      {cardImage(e) ? <img src={cardImage(e)!} alt="" className="absolute inset-0 -z-0 h-full w-full object-cover opacity-25" /> : null}
      <div className="absolute right-14 top-[72px] hidden flex-col items-end gap-0.5 lg:flex">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">{dowMon(cardStart(e), tz)}</span>
        <strong className="font-display text-[200px] font-extrabold leading-[.82] tracking-[-.06em] text-gold">{dayNum(cardStart(e), tz)}</strong>
      </div>
      <div className="relative z-[1] flex max-w-[820px] flex-col gap-[18px] px-14 pb-9">
        <span className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          <span className="h-2 w-2 rounded-full bg-gold" />
          {e.category ?? 'Featured'} · {cityOf(e)}
        </span>
        <strong className="font-display text-6xl font-extrabold leading-[.9] tracking-[-.05em] text-balance text-sand lg:text-[104px]">{e.title}</strong>
        <span className="max-w-[540px] text-[19px] leading-[1.5] text-[#c9d3df]">{e.about ?? e.description ?? ''}</span>
        <div className="flex flex-wrap items-center gap-4 pt-1.5">
          <button
            type="button"
            onClick={() => navigate(`/events/${e.id}`)}
            className="rounded-full bg-gold px-[30px] py-[17px] text-[17px] font-semibold text-night transition hover:bg-sand"
          >
            Get tickets · {cardPrice(e) ?? 'Free'}
          </button>
          <span className="text-[15px] text-[#c9d3df]">{[cardVenue(e), when].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
      <div className="relative z-[1] grid gap-7 px-14 pb-[84px] sm:grid-cols-3">
        {items.map((it, n) => (
          <button key={it.id} type="button" onClick={() => setI(n)} className={`flex flex-col gap-2.5 text-start ${n === i ? 'text-sand' : 'text-sand/50 hover:text-sand/80'}`}>
            <span className="relative h-[3px] overflow-hidden rounded-sm bg-sand/20">
              <span className="absolute inset-y-0 start-0 bg-gold transition-all" style={{ width: n === i ? '100%' : '0%' }} />
            </span>
            <span className="flex justify-between gap-3 text-sm">
              <strong className="font-semibold">{it.title}</strong>
              <span className="opacity-75">{dowMon(cardStart(it), cardTz(it) ?? 'UTC')}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

const cityOf = (e: EventCardData) => e.location ?? '';

/** v3 front door — matches "Sahra Web Prototype v3" fHome exactly. */
export default function HomePage() {
  const { user } = useAuth();
  const { openHost } = useHost();
  const navigate = useNavigate();
  const [params] = useSearchParams();
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
  const popular = categories.slice(0, 3);

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

  const hasFilter = Boolean(day || category || q.trim());
  const allTitle = day
    ? inTz(`${day}T12:00:00Z`, 'UTC', { weekday: 'long', day: 'numeric', month: 'short' })
    : `The lineup in ${city}`;
  const dayHint = `${days.reduce((a, d) => a + d.count, 0)} events`;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (error) return <div className="px-14 py-16"><EmptyState title="Couldn’t load events">{error}</EmptyState></div>;

  return (
    <div className="flex flex-col">
      <Hero featured={data?.featured ?? []} />

      {/* Floating search bar — overlaps hero bottom */}
      <form
        onSubmit={onSearch}
        className="relative z-[2] mx-4 -mt-11 flex flex-wrap items-center gap-4 rounded-3xl bg-sand px-6 py-2.5 text-ink shadow-[0_30px_70px_rgba(11,20,32,.6)] lg:mx-14 lg:pe-2.5 lg:ps-7"
      >
        <span className="flex min-w-[220px] flex-1 flex-col gap-0.5">
          <span className="text-xs font-semibold tracking-[0.06em] opacity-60">WHAT ARE YOU AFTER?</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="An artist, a venue, a vibe"
            className="border-none bg-transparent py-1 font-sans text-[19px] text-ink outline-none placeholder:text-ink/40"
          />
        </span>
        {popular.length ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] opacity-60">Popular:</span>
            {popular.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setCategory(category === p.name ? null : p.name)}
                className="rounded-full bg-dune px-3.5 py-2 text-[13px] font-semibold text-ink transition hover:bg-[#e3d9c6]"
              >
                {p.name}
              </button>
            ))}
          </span>
        ) : null}
        <button type="submit" className="rounded-2xl bg-night px-7 py-[18px] text-base font-semibold text-gold">
          Find events
        </button>
      </form>

      {/* Pick a night */}
      <section className="flex flex-col gap-5 px-4 pt-16 lg:px-14" aria-labelledby="pick-night">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">The next three weeks</span>
            <h2 id="pick-night" className="font-display text-[44px] font-extrabold leading-none tracking-[-0.035em] text-sand">Pick a night.</h2>
          </div>
          <span className="text-sm text-night-muted">{dayHint}</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-[repeat(21,minmax(0,1fr))]">
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
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-[1.5px] px-0 pb-2.5 pt-3 transition hover:-translate-y-0.5 ${
                  on
                    ? 'border-gold bg-gold text-night'
                    : empty
                      ? 'border-night-border/40 bg-transparent text-night-muted/50'
                      : 'border-night-border bg-transparent text-sand'
                }`}
              >
                <span className="text-[10px] font-semibold tracking-[0.1em]">{inTz(noon, 'UTC', { weekday: 'short' }).toUpperCase()}</span>
                <strong className="text-[21px] tracking-[-0.02em]">{inTz(noon, 'UTC', { day: 'numeric' })}</strong>
                <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-night' : empty ? 'bg-transparent' : 'bg-gold'}`} />
              </button>
            );
          })}
        </div>
        {categories.length ? (
          <div className="grid grid-cols-2 gap-2.5 pt-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
            {categories.map((c) => {
              const on = category === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCategory(on ? null : c.name)}
                  className={`flex h-[110px] flex-col justify-between rounded-2xl border-[1.5px] p-3.5 px-4 text-start transition hover:-translate-y-[3px] ${
                    on ? 'border-gold bg-gold text-night' : 'border-night-border bg-transparent text-sand'
                  }`}
                >
                  <span className={`text-[13px] font-semibold ${on ? 'opacity-75' : 'opacity-75 text-night-muted'}`}>{c.count} events</span>
                  <strong className="text-2xl tracking-[-0.03em]">{c.name}</strong>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      {/* Lineup */}
      <section className="flex flex-col px-4 pb-6 pt-14 lg:px-14" aria-labelledby="lineup">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
          <h2 id="lineup" className="font-display text-[44px] font-extrabold leading-none tracking-[-0.035em] text-sand">{allTitle}</h2>
          {hasFilter ? (
            <button
              type="button"
              onClick={() => { setDay(null); setCategory(null); setQ(''); }}
              className="rounded-full border-[1.5px] border-night-border px-4 py-2.5 text-sm font-semibold text-sand"
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <div>
          {lineup.length ? (
            lineup.map((e) => {
              const tz = cardTz(e) ?? 'UTC';
              const out = e.sold_out || (e.left ?? 1) <= 0;
              const low = !out && (e.left ?? 99) < 20;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => navigate(`/events/${e.id}`)}
                  className="grid w-full grid-cols-[72px_minmax(0,1fr)] items-center gap-7 border-t border-night-border bg-transparent py-[22px] text-start text-sand transition hover:bg-[#1d2e45] hover:ps-6 sm:grid-cols-[110px_minmax(0,1fr)_150px_170px]"
                >
                  <span className="flex flex-col gap-1">
                    <strong className="font-display text-4xl font-extrabold leading-[.85] tracking-[-0.05em] text-gold sm:text-[56px]">{dayNum(cardStart(e), tz)}</strong>
                    <span className="text-[11px] font-semibold tracking-[0.16em] text-night-muted">{dowMon(cardStart(e), tz)}</span>
                  </span>
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <strong className="font-display text-2xl font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[34px]">{e.title}</strong>
                    <span className="text-[15px] text-night-muted">{[cardVenue(e), e.category].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="hidden h-20 rounded-2xl sm:block" style={{ background: cardImage(e) ? undefined : stripes(toneOf(e.id), 10, '#2a3b52') }}>
                    {cardImage(e) ? <img src={cardImage(e)!} alt="" className="h-20 w-full rounded-2xl object-cover" /> : null}
                  </span>
                  <span className="hidden flex-col items-end gap-2 sm:flex">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={out ? { background: '#b8323a33', color: '#e0626a' } : low ? { background: '#f2d9a022', color: '#f2d9a0' } : { background: '#22344d', color: '#9fb0c6' }}
                    >
                      {out ? 'Sold out' : low ? 'Selling fast' : 'On sale'}
                    </span>
                    <strong className="text-[17px]">{cardPrice(e) ?? 'Free'}</strong>
                  </span>
                </button>
              );
            })
          ) : (
            <div className="rounded-2xl border-[1.5px] border-dashed border-night-border p-10 text-center text-[#c9d3df]">
              Nothing matches that. Try another night or clear the filters.
            </div>
          )}
        </div>
      </section>

      {/* Band cards */}
      <section className="mx-4 mb-14 mt-8 grid gap-4 lg:mx-14 lg:grid-cols-2">
        <div className="flex min-h-[260px] flex-col justify-between gap-5 rounded-[26px] bg-gold p-10 text-night">
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">Hosting friends</span>
            <strong className="font-display text-[44px] font-extrabold leading-none tracking-[-0.035em]">Throw something.</strong>
            <span className="max-w-[440px] text-base leading-[1.5]">Dinners, birthdays, run clubs. A private invite with RSVPs and a guest list. Guests reply with just their phone number.</span>
          </div>
          <button type="button" onClick={() => openHost('personal')} className="self-start rounded-full bg-night px-[26px] py-[15px] text-base font-semibold text-gold">
            Create an invite
          </button>
        </div>
        <div className="flex min-h-[260px] flex-col justify-between gap-5 rounded-[26px] border-[1.5px] border-night-border bg-night-surface p-10">
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Selling tickets</span>
            <strong className="font-display text-[44px] font-extrabold leading-none tracking-[-0.035em] text-sand">Run the night.</strong>
            <span className="max-w-[440px] text-base leading-[1.5] text-[#c9d3df]">Promoters, venues and artists. Paid tickets, capped resale, a door team and payouts in Studio.</span>
          </div>
          <button type="button" onClick={() => openHost('public')} className="self-start rounded-full bg-gold px-[26px] py-[15px] text-base font-semibold text-night">
            Open Studio
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-wrap items-end justify-between gap-6 border-t border-night-surface px-4 pb-11 pt-9 lg:px-14">
        <img src="/brand/sahra-logo-gold.png" alt="Sahra" className="w-[150px]" />
        <div className="flex flex-wrap gap-6 text-sm text-night-muted">
          <span>{city}</span>
          <span>Help</span>
          <span>العربية</span>
        </div>
      </footer>
    </div>
  );
}
