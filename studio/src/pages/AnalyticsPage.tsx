import { useEffect, useMemo, useState } from 'react';
import { api, type StudioEvent } from '../lib/api';
import { formatCents, formatDateTime } from '../lib/format';
import { Badge, Card, EmptyState, Stat } from '../components/ui';

function sold(event: StudioEvent): number {
  return (event.tiers ?? []).reduce((sum, tier) => sum + (tier.sold ?? 0), 0);
}
function gross(event: StudioEvent): number {
  return (event.tiers ?? []).reduce((sum, tier) => sum + (tier.priceCents ?? 0) * (tier.sold ?? 0), 0);
}

export default function AnalyticsPage() {
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'7d' | '30d' | 'year'>('30d');

  useEffect(() => {
    let active = true;
    api
      .myEvents()
      .then((res) => {
        if (active) setEvents(res.events ?? []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    const ticketsSold = events.reduce((sum, event) => sum + sold(event), 0);
    const grossCents = events.reduce((sum, event) => sum + gross(event), 0);
    const onSale = events.filter((event) => (event.status ?? '').toUpperCase() === 'PUBLISHED').length;
    return { ticketsSold, grossCents, onSale, events: events.length };
  }, [events]);

  const topEvents = useMemo(
    () => [...events].sort((a, b) => gross(b) - gross(a)).slice(0, 5),
    [events],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-night-muted">Studio</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">Analytics</h1>
        </div>
        <div className="flex rounded-full bg-dune p-1 text-sm font-semibold">
          {(['7d', '30d', 'year'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              className={`rounded-full px-4 py-1.5 transition ${range === item ? 'bg-night text-sand' : 'text-ink'}`}
            >
              {item === '7d' ? '7 days' : item === '30d' ? '30 days' : 'Year'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Tickets sold" value={totals.ticketsSold.toLocaleString()} />
        <Stat label="Gross" value={formatCents(totals.grossCents)} />
        <Stat label="On sale" value={String(totals.onSale)} />
        <Stat label="Events" value={String(totals.events)} />
      </div>

      <Card>
        <EmptyState title="Sales analytics aggregates aren't available yet">
          The backend exposes event inventory and orders, but not the time-series analytics shown in the design. These totals are computed live from your event tiers.
        </EmptyState>
      </Card>

      <Card className="p-6">
        <div className="font-display text-lg font-bold text-ink">Top events by gross</div>
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-night-muted">Loading…</div>
          ) : topEvents.length === 0 ? (
            <div className="text-sm text-night-muted">No events yet.</div>
          ) : (
            topEvents.map((event) => (
              <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-dune/50 px-4 py-3">
                <div>
                  <div className="font-semibold text-ink">{event.title}</div>
                  <div className="text-xs text-night-muted">{formatDateTime(event.startsAt)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={(event.status ?? '').toUpperCase() === 'PUBLISHED' ? 'green' : 'draft'}>
                    {(event.status ?? 'draft').toLowerCase()}
                  </Badge>
                  <div className="font-semibold text-ink">{formatCents(gross(event))}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
