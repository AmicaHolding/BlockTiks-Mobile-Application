import { useEffect, useMemo, useState } from 'react';
import { api, type EventOrder, type StudioEvent } from '../lib/api';
import { useOrg } from '../lib/org';
import { eventSold } from '../lib/sales';
import { formatMoney } from '../lib/format';
import { Card, Chip, EmptyState, LoadingBlock, PageHeader, Stat } from '../components/ui';

type Range = '7' | '30' | '365';

// TODO(api-gap): GET /orgs/{id}/analytics, buyers-by-city and payment mix
// need server-side aggregation; the daily-sales series below is derived from
// the real per-event order feeds.

export default function AnalyticsPage() {
  const { org } = useOrg();
  const [range, setRange] = useState<Range>('30');
  const [events, setEvents] = useState<StudioEvent[] | null>(null);
  const [orders, setOrders] = useState<EventOrder[]>([]);

  useEffect(() => {
    api
      .myEvents()
      .then(async ({ events: evts }) => {
        setEvents(evts);
        const lists = await Promise.all(
          evts.map((e) => api.eventOrders(e.id).then((r) => r.orders).catch(() => [] as EventOrder[])),
        );
        setOrders(lists.flat());
      })
      .catch(() => setEvents([]));
  }, []);

  const paid = useMemo(() => orders.filter((o) => o.status === 'PAID'), [orders]);

  const rangeDays = Number(range);
  const series = useMemo(() => {
    const days: { key: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      days.push({
        key,
        label: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(d),
        count: 0,
      });
    }
    const idx = new Map(days.map((d, i) => [d.key, i]));
    for (const o of paid) {
      const key = (o.paidAt ?? o.createdAt).slice(0, 10);
      const i = idx.get(key);
      if (i !== undefined) days[i].count += o.ticketCount;
    }
    return days;
  }, [paid, rangeDays]);

  const maxDaily = Math.max(1, ...series.map((d) => d.count));
  const ticketsInRange = series.reduce((a, d) => a + d.count, 0);
  const grossInRange = paid
    .filter((o) => Date.now() - new Date(o.createdAt).getTime() < rangeDays * 86400000)
    .reduce((a, o) => a + o.subtotalCents, 0);
  const avgPerDay = ticketsInRange / rangeDays;

  const topEvents = useMemo(() => {
    if (!events) return [];
    return [...events]
      .map((e) => ({ e, sold: eventSold(e) }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);
  }, [events]);

  if (events === null || !org) return <LoadingBlock />;

  const currency = org.currency;

  return (
    <div>
      <PageHeader
        title="Analytics"
        action={
          <div className="flex gap-2">
            {(['7', '30', '365'] as Range[]).map((r) => (
              <Chip key={r} selected={range === r} onClick={() => setRange(r)}>
                {r === '7' ? '7 days' : r === '30' ? '30 days' : 'Year'}
              </Chip>
            ))}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Tickets sold" value={ticketsInRange.toLocaleString()} />
        <Stat label="Gross revenue" value={formatMoney(grossInRange, currency)} />
        <Stat label="Avg / day" value={avgPerDay.toFixed(1)} />
        <Stat
          label="Sell-through"
          value={`${overallSellThrough(events)}%`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daily sales */}
        <Card title="Tickets / day" className="lg:col-span-2">
          <div className="flex h-48 items-end gap-[3px]">
            {series.map((d) => (
              <div
                key={d.key}
                title={`${d.label}: ${d.count}`}
                className="flex-1 rounded-t-sm bg-night/80 transition-colors hover:bg-gold"
                style={{ height: `${Math.max(2, (d.count / maxDaily) * 100)}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-ink/40">
            <span>{series[0]?.label}</span>
            <span>{series[series.length - 1]?.label}</span>
          </div>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          <Card title="Top events">
            {topEvents.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink/45">No events yet.</p>
            ) : (
              <div className="space-y-3">
                {topEvents.map(({ e, sold }) => {
                  const cap = (e.tiers ?? []).reduce((a, t) => a + t.quantity, 0);
                  const p = cap > 0 ? Math.round((sold / cap) * 100) : 0;
                  return (
                    <div key={e.id}>
                      <div className="flex justify-between text-sm">
                        <span className="min-w-0 flex-1 truncate font-medium text-ink">{e.title}</span>
                        <span className="ml-3 text-ink/50 tabular-nums">{p}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-dune">
                        <div className="h-full rounded-full bg-gold" style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* TODO(api-gap): server-side aggregation needed */}
          <Card title="Buyers by city">
            <EmptyState
              title="Waiting on orders"
              body="City breakdown appears once the analytics endpoint ships."
            />
          </Card>
          <Card title="Payment mix">
            <EmptyState
              title="Waiting on orders"
              body="Card / wallet split appears once the analytics endpoint ships."
            />
          </Card>
        </div>
      </div>

      {/* Sell-through by tier (prototype "bars" section) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {events.slice(0, 3).map((e) => {
          const tiers = e.tiers ?? [];
          if (tiers.length === 0) return null;
          return (
            <Card key={e.id} title={e.title}>
              <div className="space-y-3">
                {tiers.map((t, i) => {
                  const p = t.quantity > 0 ? Math.round(((t.sold ?? 0) / t.quantity) * 100) : 0;
                  return (
                    <div key={t.id ?? i}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-ink">{t.name}</span>
                        <span className="text-ink/50 tabular-nums">
                          {t.sold ?? 0}/{t.quantity}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-dune">
                        <div className="h-full rounded-full bg-night" style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function overallSellThrough(events: StudioEvent[]): number {
  const sold = events.reduce((a, e) => a + eventSold(e), 0);
  const cap = events.reduce((a, e) => a + (e.tiers ?? []).reduce((s, t) => s + t.quantity, 0), 0);
  return cap > 0 ? Math.round((sold / cap) * 100) : 0;
}
