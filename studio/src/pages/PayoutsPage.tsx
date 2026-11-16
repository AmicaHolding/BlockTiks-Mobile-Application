import { useEffect, useMemo, useState } from 'react';
import { api, type EventOrder, type StudioEvent } from '../lib/api';
import { formatCents, formatDateTime } from '../lib/format';
import { orderTicketGrossCents } from '../lib/sales';
import { Badge, Card, EmptyState, Stat } from '../components/ui';

type OrderWithEvent = EventOrder & { event: StudioEvent };

function isPaid(order: EventOrder): boolean {
  return order.status.toUpperCase() === 'PAID';
}

function orderTime(order: EventOrder): number {
  return new Date(order.paidAt ?? order.createdAt).getTime();
}

export default function PayoutsPage() {
  const [orders, setOrders] = useState<OrderWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .myEvents()
      .then(async (res) => {
        const events = res.events ?? [];
        const rows = await Promise.all(
          events.map(async (event) => {
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
        if (active) setError(e instanceof Error ? e.message : 'Could not load payouts');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const paidOrders = useMemo(() => orders.filter(isPaid), [orders]);

  const rows = useMemo(() => {
    const byEvent = new Map<
      string,
      {
        event: StudioEvent;
        orders: number;
        tickets: number;
        grossCents: number;
        customerPaidCents: number;
        lastSaleAt?: string;
      }
    >();
    for (const order of paidOrders) {
      const current = byEvent.get(order.event.id) ?? {
        event: order.event,
        orders: 0,
        tickets: 0,
        grossCents: 0,
        customerPaidCents: 0,
      };
      current.orders += 1;
      current.tickets += order.ticketCount;
      current.grossCents += orderTicketGrossCents(order);
      current.customerPaidCents += order.totalCents;
      const saleAt = order.paidAt ?? order.createdAt;
      if (!current.lastSaleAt || orderTime(order) > new Date(current.lastSaleAt).getTime()) {
        current.lastSaleAt = saleAt;
      }
      byEvent.set(order.event.id, current);
    }
    return [...byEvent.values()]
      .filter((row) => row.grossCents > 0 || row.tickets > 0)
      .sort((a, b) => b.grossCents - a.grossCents);
  }, [paidOrders]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          orders: acc.orders + row.orders,
          tickets: acc.tickets + row.tickets,
          grossCents: acc.grossCents + row.grossCents,
          customerPaidCents: acc.customerPaidCents + row.customerPaidCents,
        }),
        { orders: 0, tickets: 0, grossCents: 0, customerPaidCents: 0 },
      ),
    [rows],
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-night-muted">Studio</div>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">Payouts</h1>
        <div className="mt-1 text-sm text-night-muted">
          Primary ticket sales by event. Payout accounts, fee splits, and transfers are not connected yet.
        </div>
      </div>

      {error ? <div className="rounded-xl bg-rumman/10 px-4 py-3 text-sm text-rumman">{error}</div> : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Ticket gross" value={formatCents(totals.grossCents)} />
        <Stat label="Customer paid" value={formatCents(totals.customerPaidCents)} hint="Includes fees" />
        <Stat label="Tickets sold" value={totals.tickets.toLocaleString()} />
        <Stat label="Payout account" value="Not connected" />
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-display text-lg font-bold text-ink">Payout method</div>
            <div className="mt-1 text-sm text-night-muted">
              Bank details, payout schedule, and organizer verification need backend fields before Studio can edit them.
            </div>
          </div>
          <Badge tone="draft">Soon</Badge>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-night-border/50 text-xs uppercase tracking-wide text-night-muted">
                <th className="pb-3 pr-4 font-semibold">Event</th>
                <th className="pb-3 pr-4 font-semibold">Orders</th>
                <th className="pb-3 pr-4 font-semibold">Tickets</th>
                <th className="pb-3 pr-4 font-semibold">Ticket gross</th>
                <th className="pb-3 pr-4 font-semibold">Customer paid</th>
                <th className="pb-3 font-semibold">Last sale</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-8 text-center text-night-muted" colSpan={6}>
                    Loading payouts…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState title="No sales yet">
                      Paid ticket sales will appear here once orders are fulfilled.
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.event.id} className="border-b border-night-border/30 last:border-0">
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-ink">{row.event.title}</div>
                      <div className="text-xs text-night-muted">{row.event.location || 'Venue TBD'}</div>
                    </td>
                    <td className="py-4 pr-4 text-ink">{row.orders.toLocaleString()}</td>
                    <td className="py-4 pr-4 text-ink">{row.tickets.toLocaleString()}</td>
                    <td className="py-4 pr-4 font-semibold text-ink">{formatCents(row.grossCents)}</td>
                    <td className="py-4 pr-4 text-ink">{formatCents(row.customerPaidCents)}</td>
                    <td className="py-4 text-night-muted">{row.lastSaleAt ? formatDateTime(row.lastSaleAt) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
