import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type StudioEvent } from '../lib/api';
import { formatCents, formatDateTime, statusLabel } from '../lib/format';
import { eventCapacity, eventGrossCents, eventSold } from '../lib/sales';
import { Badge, Button, Card, EmptyState, Input, Stat } from '../components/ui';

export default function OverviewPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'drafts' | 'past'>('all');

  useEffect(() => {
    let active = true;
    api
      .myEvents()
      .then((res) => {
        if (active) setEvents(res.events ?? []);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load events');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const now = Date.now();
  const filtered = useMemo(() => {
    return events.filter((event) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        event.title.toLowerCase().includes(q) ||
        (event.location ?? '').toLowerCase().includes(q) ||
        (event.category ?? '').toLowerCase().includes(q);
      const startsAt = event.startsAt ? new Date(event.startsAt).getTime() : 0;
      const status = (event.status ?? '').toUpperCase();
      const bucket =
        status === 'DRAFT' ? 'drafts' : startsAt < now ? 'past' : 'upcoming';
      return matchesQuery && (filter === 'all' || bucket === filter);
    });
  }, [events, query, filter, now]);

  const stats = useMemo(() => {
    const onSale = events.filter((e) => (e.status ?? '').toUpperCase() === 'PUBLISHED');
    const drafts = events.filter((e) => (e.status ?? '').toUpperCase() === 'DRAFT');
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    const monthGross = events.reduce((sum, event) => {
      const d = event.startsAt ? new Date(event.startsAt) : null;
      if (!d || d.getMonth() !== month || d.getFullYear() !== year) return sum;
      return sum + eventGrossCents(event);
    }, 0);
    return {
      liveNow: onSale.filter((e) => e.startsAt && new Date(e.startsAt).getTime() >= now).length,
      onSale: onSale.length,
      drafts: drafts.length,
      monthGrossCents: monthGross,
    };
  }, [events, now]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-night-muted">Studio</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">Events</h1>
        </div>
        <Button onClick={() => navigate('/events/new')} type="button">
          Create event
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Live now" value={String(stats.liveNow)} />
        <Stat label="On sale" value={String(stats.onSale)} />
        <Stat label="Drafts" value={String(stats.drafts)} />
        <Stat label="This month" value={formatCents(stats.monthGrossCents)} hint="Gross ticket sales" />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="max-w-sm"
            placeholder="Search events"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex rounded-full bg-dune p-1 text-sm font-semibold">
            {(['all', 'upcoming', 'drafts', 'past'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-full px-4 py-1.5 capitalize transition ${
                  filter === item ? 'bg-night text-sand' : 'text-ink'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-night-border/50 text-xs uppercase tracking-wide text-night-muted">
                <th className="pb-3 pr-4 font-semibold">Event</th>
                <th className="pb-3 pr-4 font-semibold">Status</th>
                <th className="pb-3 pr-4 font-semibold">Sold</th>
                <th className="pb-3 font-semibold">Gross</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-8 text-center text-night-muted" colSpan={4}>
                    Loading events…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="py-8 text-center text-rumman" colSpan={4}>
                    {error}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState title="No events yet">
                      Create your first event and it will appear here.
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                filtered.map((event) => {
                  const sold = eventSold(event);
                  const capacity = eventCapacity(event);
                  const gross = eventGrossCents(event);
                  const status = (event.status ?? '').toUpperCase();
                  return (
                    <tr
                      key={event.id}
                      className="cursor-pointer border-b border-night-border/30 transition last:border-0 hover:bg-dune/50"
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      <td className="py-4 pr-4">
                        <div className="font-semibold text-ink">{event.title}</div>
                        <div className="text-xs text-night-muted">
                          {formatDateTime(event.startsAt)} · {event.location || 'Venue TBD'}
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge tone={status === 'PUBLISHED' ? 'green' : status === 'DRAFT' ? 'draft' : 'neutral'}>
                          {statusLabel(event.status)}
                        </Badge>
                      </td>
                      <td className="py-4 pr-4 text-ink">
                        <div>
                          {sold.toLocaleString()} / {capacity.toLocaleString()}
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-dune">
                          <div
                            className="h-full rounded-full bg-night"
                            style={{ width: `${capacity ? Math.min(100, (sold / capacity) * 100) : 0}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-4 font-semibold text-ink">{formatCents(gross)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
