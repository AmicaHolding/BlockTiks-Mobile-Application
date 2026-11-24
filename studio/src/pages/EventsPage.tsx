import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type StudioEvent } from '../lib/api';
import { useOrg } from '../lib/org';
import { eventCapacity, eventGrossCents, eventSold, eventStatus, statusChipClass } from '../lib/sales';
import { formatEventDate, formatMoney } from '../lib/format';
import { Button, EmptyState, LoadingBlock, PageHeader } from '../components/ui';

export default function EventsPage() {
  const { org, role } = useOrg();
  const navigate = useNavigate();
  const [events, setEvents] = useState<StudioEvent[] | null>(null);
  const [query, setQuery] = useState('');

  const isAdmin = role === 'admin';

  useEffect(() => {
    api
      .myEvents()
      .then(({ events }) => setEvents(events))
      .catch(() => setEvents([]));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events ?? [];
    return (events ?? []).filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.location ?? '').toLowerCase().includes(q) ||
        (e.category ?? '').toLowerCase().includes(q),
    );
  }, [events, query]);

  return (
    <div>
      <PageHeader
        title="Events"
        action={<Button to="/events/new">+ New event</Button>}
      />

      {events === null ? (
        <LoadingBlock />
      ) : events.length === 0 ? (
        <EmptyState
          title="No events yet"
          body="Create one, it stays a draft until you publish."
          action={<Button to="/events/new">+ New event</Button>}
        />
      ) : (
        <div className="rounded-xl border border-dune bg-[#fff9ef]">
          <div className="border-b border-dune px-5 py-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events…"
              className="w-full max-w-xs rounded-lg border border-ink/15 bg-white px-3.5 py-2 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div className="divide-y divide-dune/70">
            {filtered.map((e) => {
              const meta = api.eventMeta(e.id);
              const status = eventStatus(e, meta);
              const sold = eventSold(e);
              const cap = eventCapacity(e);
              const pct = cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : 0;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => navigate(`/events/${e.id}`)}
                  className="flex w-full items-center gap-5 px-5 py-4 text-left hover:bg-sand/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{e.title}</p>
                    <p className="mt-0.5 text-xs text-ink/45">
                      {formatEventDate(e.startsAt)} · {e.location ?? '-'}
                    </p>
                  </div>
                  <div className="w-36">
                    <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-dune">
                      <div
                        className={`h-full rounded-full ${status === 'on sale' ? 'bg-gold' : 'bg-ink/20'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-ink/45 tabular-nums">
                      {sold}/{cap} sold
                    </p>
                  </div>
                  {isAdmin ? (
                    <span className="w-28 text-right text-sm font-semibold text-ink tabular-nums">
                      {formatMoney(eventGrossCents(e), e.currency ?? org?.currency)}
                    </span>
                  ) : null}
                  <span
                    className={`w-32 rounded-full border px-2.5 py-1 text-center text-[11px] font-semibold capitalize ${statusChipClass(status)}`}
                  >
                    {status}
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink/45">No matches.</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
