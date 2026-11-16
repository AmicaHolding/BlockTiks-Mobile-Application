import { useEffect, useMemo, useState } from 'react';
import { api, type EventOrder, type StudioEvent } from '../lib/api';
import { formatCents, formatDate, formatDateTime, statusLabel } from '../lib/format';
import { orderTicketGrossCents } from '../lib/sales';
import { Badge, Card, EmptyState, Stat } from '../components/ui';

type OrderWithEvent = EventOrder & { event: StudioEvent };
type RangeKey = '7d' | '30d' | 'year';

const RANGE_DAYS: Record<RangeKey, number> = { '7d': 7, '30d': 30, year: 365 };
const RANGE_LABEL: Record<RangeKey, string> = { '7d': '7 days', '30d': '30 days', year: 'year' };

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isPaid(order: EventOrder): boolean {
  return order.status.toUpperCase() === 'PAID';
}

function orderTime(order: EventOrder): number {
  return new Date(order.paidAt ?? order.createdAt).getTime();
}

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<OrderWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<RangeKey>('30d');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .myEvents()
      .then(async (res) => {
        const list = res.events ?? [];
        if (!active) return;
        const rows = await Promise.all(
          list.map(async (event) => {
            try {
              const ordersRes = await api.eventOrders(event.id);
              return (ordersRes.orders ?? []).map((order) => ({ ...order, event }));
            } catch {
              return [] as OrderWithEvent[];
            }
          }),
        );
        if (active) setOrders(rows.flat());
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load analytics');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const days = RANGE_DAYS[range];
  const rangeOrders = useMemo(() => {
    const since = Date.now() - days * 86_400_000;
    return orders.filter((order) => isPaid(order) && orderTime(order) >= since);
  }, [orders, days]);

  const totals = useMemo(() => {
    const ticketsSold = rangeOrders.reduce((sum, order) => sum + order.ticketCount, 0);
    const grossCents = rangeOrders.reduce((sum, order) => sum + orderTicketGrossCents(order), 0);
    const orderCount = rangeOrders.length;
    return {
      ticketsSold,
      grossCents,
      orderCount,
      avgOrderCents: orderCount ? Math.round(grossCents / orderCount) : 0,
    };
  }, [rangeOrders]);

  const series = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets = Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (days - 1 - index));
      return { key: dayKey(date), date, count: 0 };
    });
    const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    for (const order of rangeOrders) {
      const bucket = byKey.get(dayKey(new Date(order.paidAt ?? order.createdAt)));
      if (bucket) bucket.count += order.ticketCount;
    }
    return buckets;
  }, [rangeOrders, days]);

  const maxDaily = useMemo(() => Math.max(1, ...series.map((day) => day.count)), [series]);

  const topEvents = useMemo(() => {
    const byEvent = new Map<string, { event: StudioEvent; grossCents: number; tickets: number }>();
    for (const order of rangeOrders) {
      const current = byEvent.get(order.event.id) ?? { event: order.event, grossCents: 0, tickets: 0 };
      current.grossCents += orderTicketGrossCents(order);
      current.tickets += order.ticketCount;
      byEvent.set(order.event.id, current);
    }
    return [...byEvent.values()].sort((a, b) => b.grossCents - a.grossCents).slice(0, 5);
  }, [rangeOrders]);

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

      {error ? <div className="rounded-xl bg-rumman/10 px-4 py-3 text-sm text-rumman">{error}</div> : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Tickets sold" value={totals.ticketsSold.toLocaleString()} hint={`Last ${RANGE_LABEL[range]}`} />
        <Stat label="Ticket gross" value={formatCents(totals.grossCents)} hint={`Last ${RANGE_LABEL[range]}`} />
        <Stat label="Orders" value={totals.orderCount.toLocaleString()} hint={`Last ${RANGE_LABEL[range]}`} />
        <Stat label="Avg order" value={formatCents(totals.avgOrderCents)} hint="Ticket gross / order" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-display text-lg font-bold text-ink">Tickets sold per day</div>
              <div className="text-sm text-night-muted">Paid ticket orders across your events.</div>
            </div>
            <Badge tone="neutral">Last {RANGE_LABEL[range]}</Badge>
          </div>
          {loading ? (
            <div className="mt-8 text-sm text-night-muted">Loading analytics…</div>
          ) : totals.ticketsSold === 0 ? (
            <EmptyState title="No ticket sales in this range">
              Paid orders will chart here once buyers complete checkout.
            </EmptyState>
          ) : (
            <>
              <div className="mt-6 flex h-48 items-end gap-1 border-b border-night-border/60">
                {series.map((day) => (
                  <div
                    key={day.key}
                    className={`min-w-0 flex-1 rounded-t ${day.count ? 'bg-night' : 'bg-dune'}`}
                    style={{
                      height: day.count ? `${Math.max(4, (day.count / maxDaily) * 100)}%` : '2%',
                    }}
                    title={`${formatDate(day.date.toISOString())}: ${day.count} tickets`}
                  />
                ))}
              </div>
              <div className="mt-3 flex justify-between text-xs text-night-muted">
                <span>{series[0] ? formatDate(series[0].date.toISOString()) : '—'}</span>
                <span>{series[series.length - 1] ? formatDate(series[series.length - 1].date.toISOString()) : '—'}</span>
              </div>
            </>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="font-display text-lg font-bold text-ink">Buyers by city</div>
            <div className="mt-3 rounded-xl bg-dune/70 px-4 py-3 text-sm text-night-muted">
              Buyer city is not stored on orders yet, so Studio cannot break buyers down by location.
            </div>
          </Card>
          <Card className="bg-night p-5 text-sand">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Payment mix</div>
            <div className="mt-3 text-sm text-night-muted">
              Stripe handles Apple Pay, cards, and Pay in 4, but the order feed does not store the payment method yet.
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-6">
        <div className="font-display text-lg font-bold text-ink">Top events by ticket gross</div>
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-night-muted">Loading…</div>
          ) : topEvents.length === 0 ? (
            <div className="text-sm text-night-muted">No paid orders in this range.</div>
          ) : (
            topEvents.map(({ event, grossCents, tickets }) => (
              <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-dune/50 px-4 py-3">
                <div>
                  <div className="font-semibold text-ink">{event.title}</div>
                  <div className="text-xs text-night-muted">
                    {formatDateTime(event.startsAt)} · {tickets.toLocaleString()} tickets
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={(event.status ?? '').toUpperCase() === 'PUBLISHED' ? 'green' : 'draft'}>
                    {statusLabel(event.status)}
                  </Badge>
                  <div className="font-semibold text-ink">{formatCents(grossCents)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
