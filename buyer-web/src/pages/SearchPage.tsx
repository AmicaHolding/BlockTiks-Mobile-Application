import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type SahraEvent } from '../lib/api';
import { formatCents, formatShortDateTime } from '../lib/format';
import { Badge, Card, EmptyState, Input, Spinner } from '../components/ui';
import { SearchIcon, TicketIcon } from '../components/icons';
import { lowestPrice } from '../components/EventCard';
import { Link } from 'react-router-dom';

const RECENT_KEY = 'sahra_recent_searches';
const TABS = ['All', 'Events', 'Artists', 'Venues'] as const;

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [input, setInput] = useState(q);
  const [tab, setTab] = useState<(typeof TABS)[number]>('All');
  const [events, setEvents] = useState<SahraEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>(loadRecent);

  useEffect(() => setInput(q), [q]);

  useEffect(() => {
    if (!q.trim()) {
      setEvents([]);
      return;
    }
    let active = true;
    setLoading(true);
    api
      .events({ q: q.trim(), limit: 50 })
      .then((res) => {
        if (active) setEvents(res.events);
      })
      .catch(() => {
        if (active) setEvents([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [q]);

  function submit(term: string) {
    const t = term.trim();
    if (!t) return;
    const next = new URLSearchParams(params);
    next.set('q', t);
    setParams(next, { replace: true });
    const updated = [t, ...recent.filter((r) => r !== t)].slice(0, 6);
    setRecent(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  }

  const showEvents = tab === 'All' || tab === 'Events';
  const artistsCount = 0;
  const venuesCount = 0;

  return (
    <div className="mx-auto max-w-[1100px] px-6 pb-20 pt-8 lg:px-12">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex gap-3"
      >
        <div className="relative flex-1">
          <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-night-muted" />
          <Input
            tone="dark"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Artists, venues, events"
            className="h-14 rounded-full pl-11 text-base"
            autoFocus
          />
        </div>
      </form>

      {q ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-night-muted">Results for “{q}”</span>
            {TABS.map((t) => {
              const count = t === 'Events' ? events.length : t === 'Artists' ? artistsCount : t === 'Venues' ? venuesCount : null;
              const active = tab === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    active ? 'bg-gold text-night' : 'bg-night-surface text-sand/80 hover:bg-night-elevated'
                  }`}
                >
                  {t}
                  {count != null ? ` · ${count}` : ''}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-8">
            {loading ? (
              <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner />
              </div>
            ) : showEvents ? (
              events.length > 0 ? (
                <section>
                  <h2 className="font-display text-xl font-extrabold text-sand">Events</h2>
                  <div className="mt-4 flex flex-col gap-3">
                    {events.map((event) => (
                      <Link
                        key={event.id}
                        to={`/events/${event.id}`}
                        className="group flex items-center gap-5 rounded-2xl border border-night-border/60 bg-night-surface p-4 transition hover:border-gold/50"
                      >
                        <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/40 via-purple-700/30 to-night">
                          {event.imageUrl ? (
                            <img src={event.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="font-display text-3xl font-extrabold text-sand/20">
                              {event.title.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {lowestPrice(event.tiers) != null && lowestPrice(event.tiers)! === 0 ? (
                              <Badge tone="green">Free</Badge>
                            ) : null}
                          </div>
                          <div className="mt-1 truncate font-display text-lg font-bold text-sand group-hover:text-gold">
                            {event.title}
                          </div>
                          <div className="mt-0.5 text-sm text-night-muted">
                            {formatShortDateTime(event.startsAt)} · {event.location}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs uppercase tracking-wide text-night-muted">From</div>
                          <div className="font-display text-lg font-extrabold text-gold">
                            {(() => {
                              const p = lowestPrice(event.tiers);
                              return p === 0 ? 'Free' : p != null ? formatCents(p) : '—';
                            })()}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-gold">Tickets</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : (
                <EmptyState title="No events found">
                  Try a different spelling, or browse Explore instead.
                </EmptyState>
              )
            ) : null}

            {(tab === 'Artists' || tab === 'Venues') && (
              <EmptyState title={`${tab} search isn’t connected yet`}>
                Artist and venue profiles are coming in a later release. Events matching “{q}” are
                shown under the Events tab.
              </EmptyState>
            )}
          </div>
        </>
      ) : (
        <div className="mt-10">
          <h1 className="font-display text-3xl font-extrabold text-sand">Search Sahra</h1>
          {recent.length > 0 ? (
            <Card className="mt-6 p-5">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-night-muted">
                Recent searches
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {recent.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => submit(term)}
                    className="rounded-full bg-night-elevated px-3.5 py-1.5 text-sm font-semibold text-sand/85 transition hover:bg-night-border"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </Card>
          ) : (
            <p className="mt-3 text-night-muted">Search artists, venues and events.</p>
          )}
          <div className="mt-8">
            <TicketIcon size={28} className="text-gold" />
            <p className="mt-2 text-sm text-night-muted">Popular right now</p>
          </div>
        </div>
      )}
    </div>
  );
}
