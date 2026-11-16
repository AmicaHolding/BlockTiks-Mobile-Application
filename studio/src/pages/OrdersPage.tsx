import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type EventOrder, type StudioEvent } from '../lib/api';
import { formatCents, formatDateTime } from '../lib/format';
import {
  orderItemSummary,
  orderKindLabel,
  orderStatusLabel,
  orderStatusTone,
  orderTicketGrossCents,
} from '../lib/sales';
import { Badge, Card, EmptyState, Select, Stat } from '../components/ui';

export default function OrdersPage() {
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [event, setEvent] = useState<StudioEvent | null>(null);
  const [orders, setOrders] = useState<EventOrder[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState('');
  const requestedEventId = searchParams.get('event') ?? '';

  useEffect(() => {
    let active = true;
    api
      .myEvents()
      .then((res) => {
        if (!active) return;
        const list = res.events ?? [];
        setEvents(list);
        const initial = list.find((item) => item.id === requestedEventId) ?? list[0] ?? null;
        setEvent(initial);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load events');
      })
      .finally(() => {
        if (active) setLoadingEvents(false);
      });
    return () => {
      active = false;
    };
  }, [requestedEventId]);

  useEffect(() => {
    if (!event) {
      setOrders([]);
      return;
    }
    let active = true;
    setLoadingOrders(true);
    setError('');
    api
      .eventOrders(event.id)
      .then((res) => {
        if (active) setOrders(res.orders ?? []);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load orders');
      })
      .finally(() => {
        if (active) setLoadingOrders(false);
      });
    return () => {
      active = false;
    };
  }, [event?.id]);

  const rows = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const aTime = new Date(a.paidAt ?? a.createdAt).getTime();
        const bTime = new Date(b.paidAt ?? b.createdAt).getTime();
        return bTime - aTime;
      }),
    [orders],
  );

  const totals = useMemo(() => {
    const paid = rows.filter((order) => order.status.toUpperCase() === 'PAID');
    return {
      orders: rows.length,
      paidOrders: paid.length,
      tickets: paid.reduce((sum, order) => sum + order.ticketCount, 0),
      ticketGrossCents: paid.reduce((sum, order) => sum + orderTicketGrossCents(order), 0),
      customerPaidCents: paid.reduce((sum, order) => sum + order.totalCents, 0),
      refunded: rows.filter((order) => order.status.toUpperCase() === 'REFUNDED').length,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-night-muted">Studio</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">Orders</h1>
          <div className="mt-1 text-sm text-night-muted">
            Paid ticket orders for each event. Pending checkouts appear after payment is confirmed.
          </div>
        </div>
        <Select
          className="max-w-xs"
          value={event?.id ?? ''}
          onChange={(e) => {
            const next = events.find((item) => item.id === e.target.value) ?? null;
            setEvent(next);
          }}
          disabled={loadingEvents || events.length === 0}
        >
          {events.length === 0 ? <option value="">No events</option> : null}
          {events.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </Select>
      </div>

      {error ? <div className="rounded-xl bg-rumman/10 px-4 py-3 text-sm text-rumman">{error}</div> : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Orders" value={totals.orders.toLocaleString()} hint={`${totals.paidOrders} paid`} />
        <Stat label="Tickets" value={totals.tickets.toLocaleString()} />
        <Stat label="Ticket gross" value={formatCents(totals.ticketGrossCents)} />
        <Stat
          label="Customer paid"
          value={formatCents(totals.customerPaidCents)}
          hint={totals.refunded ? `${totals.refunded} refunded` : undefined}
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead>
              <tr className="border-b border-night-border/50 text-xs uppercase tracking-wide text-night-muted">
                <th className="pb-3 pr-4 font-semibold">Order</th>
                <th className="pb-3 pr-4 font-semibold">Buyer</th>
                <th className="pb-3 pr-4 font-semibold">Items</th>
                <th className="pb-3 pr-4 font-semibold">Tickets</th>
                <th className="pb-3 pr-4 font-semibold">Total</th>
                <th className="pb-3 pr-4 font-semibold">Status</th>
                <th className="pb-3 pr-4 font-semibold">Paid</th>
                <th className="pb-3 font-semibold">Placed</th>
              </tr>
            </thead>
            <tbody>
              {loadingEvents || loadingOrders ? (
                <tr>
                  <td className="py-8 text-center text-night-muted" colSpan={8}>
                    Loading orders…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState title="No paid orders yet">
                      {event ? 'Orders appear here after buyers complete checkout.' : 'Create an event to see orders.'}
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                rows.map((order) => (
                  <tr key={order.id} className="border-b border-night-border/30 last:border-0">
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-ink">#{order.id.slice(0, 8).toUpperCase()}</div>
                      <div className="mt-1">
                        <Badge tone="neutral">{orderKindLabel(order.kind)}</Badge>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-ink">{order.buyerName}</div>
                      <div className="text-xs text-night-muted">{order.buyerEmail || '—'}</div>
                    </td>
                    <td className="max-w-[260px] py-4 pr-4 text-ink">{orderItemSummary(order)}</td>
                    <td className="py-4 pr-4 text-ink">{order.ticketCount.toLocaleString()}</td>
                    <td className="py-4 pr-4 font-semibold text-ink">{formatCents(order.totalCents)}</td>
                    <td className="py-4 pr-4">
                      <Badge tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status)}</Badge>
                    </td>
                    <td className="py-4 pr-4 text-night-muted">
                      {order.paidAt ? formatDateTime(order.paidAt) : '—'}
                    </td>
                    <td className="py-4 text-night-muted">{formatDateTime(order.createdAt)}</td>
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
