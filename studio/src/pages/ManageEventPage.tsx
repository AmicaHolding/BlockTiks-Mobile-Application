import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type EventOrder, type StudioEvent } from '../lib/api';
import { formatCents, formatDateTime, statusLabel } from '../lib/format';
import {
  eventCapacity,
  eventGrossCents,
  eventSold,
  orderItemSummary,
  orderStatusLabel,
  orderStatusTone,
} from '../lib/sales';
import { Badge, Button, Card, EmptyState } from '../components/ui';

function percent(sold: number, capacity: number): number {
  if (!capacity) return 0;
  return Math.min(100, Math.max(0, (sold / capacity) * 100));
}

export default function ManageEventPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<StudioEvent | null>(null);
  const [orders, setOrders] = useState<EventOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api.event(id), api.eventOrders(id)])
      .then(([eventRes, ordersRes]) => {
        if (!active) return;
        setEvent(eventRes.event);
        setOrders(ordersRes.orders ?? []);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load event');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const stats = useMemo(() => {
    if (!event) return { sold: 0, capacity: 0, grossCents: 0, daysToGo: '—' as const };
    const daysToGo = event.startsAt
      ? Math.max(0, Math.ceil((new Date(event.startsAt).getTime() - Date.now()) / 86_400_000))
      : null;
    return {
      sold: eventSold(event),
      capacity: eventCapacity(event),
      grossCents: eventGrossCents(event),
      daysToGo: daysToGo ?? '—',
    };
  }, [event]);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  async function publish() {
    if (!event) return;
    setPublishing(true);
    setError('');
    try {
      const res = await api.publishEvent(event.id);
      setEvent((prev) => (prev ? { ...prev, ...res.event } : res.event));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not publish event');
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return <EmptyState title="Loading event…" />;
  }
  if (!event) {
    return <EmptyState title="Event not found">{error || 'Check the link and try again.'}</EmptyState>;
  }

  const status = (event.status ?? '').toUpperCase();
  const tiers = event.tiers ?? [];
  const sections = event.venueSections ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button type="button" className="text-sm font-semibold text-night-muted hover:text-ink" onClick={() => navigate('/events')}>
            Events / {event.title}
          </button>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-extrabold text-ink">{event.title}</h1>
            <Badge tone={status === 'PUBLISHED' ? 'green' : status === 'DRAFT' ? 'draft' : 'neutral'}>
              {statusLabel(event.status)}
            </Badge>
          </div>
          <div className="mt-1 text-sm text-night-muted">
            {formatDateTime(event.startsAt)} · {event.location || 'Venue TBD'}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {status === 'DRAFT' ? (
            <Button onClick={publish} disabled={publishing} type="button">
              {publishing ? 'Publishing…' : 'Publish event'}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => navigate(`/events/${id}/venue`)} type="button">
            Venue layout
          </Button>
          <Button variant="ghost" onClick={() => navigate(`/orders?event=${id}`)} type="button">
            Orders
          </Button>
        </div>
      </div>

      {error ? <div className="rounded-xl bg-rumman/10 px-4 py-3 text-sm text-rumman">{error}</div> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-4">
              <div className="font-display text-lg font-bold text-ink">Ticket tiers</div>
              <div className="text-sm text-night-muted">Inventory and revenue by tier.</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-night-border/50 text-xs uppercase tracking-wide text-night-muted">
                    <th className="pb-3 pr-4 font-semibold">Tier</th>
                    <th className="pb-3 pr-4 font-semibold">Price</th>
                    <th className="pb-3 pr-4 font-semibold">Sold</th>
                    <th className="pb-3 font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((tier, index) => {
                    const sold = tier.sold ?? 0;
                    const capacity = tier.quantity ?? 0;
                    return (
                      <tr key={tier.id ?? `${tier.name}-${index}`} className="border-b border-night-border/30 last:border-0">
                        <td className="py-4 pr-4 font-semibold text-ink">{tier.name}</td>
                        <td className="py-4 pr-4 text-ink">{formatCents(tier.priceCents)}</td>
                        <td className="py-4 pr-4">
                          <div className="text-ink">
                            {sold.toLocaleString()} / {capacity.toLocaleString()}
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-dune">
                            <div className="h-full rounded-full bg-night" style={{ width: `${percent(sold, capacity)}%` }} />
                          </div>
                        </td>
                        <td className="py-4 font-semibold text-ink">{formatCents((tier.priceCents ?? 0) * sold)}</td>
                      </tr>
                    );
                  })}
                  {tiers.length === 0 ? (
                    <tr>
                      <td className="py-8 text-center text-night-muted" colSpan={4}>
                        No ticket tiers yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          {sections.length > 0 ? (
            <Card className="p-6">
              <div className="mb-4">
                <div className="font-display text-lg font-bold text-ink">Venue sections</div>
                <div className="text-sm text-night-muted">Seated inventory used by the mobile venue flow.</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-night-border/50 text-xs uppercase tracking-wide text-night-muted">
                      <th className="pb-3 pr-4 font-semibold">Section</th>
                      <th className="pb-3 pr-4 font-semibold">Price</th>
                      <th className="pb-3 pr-4 font-semibold">Sold</th>
                      <th className="pb-3 font-semibold">Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((section) => {
                      const sold = section.sold ?? 0;
                      const capacity = section.capacity ?? 0;
                      return (
                        <tr key={section.id} className="border-b border-night-border/30 last:border-0">
                          <td className="py-4 pr-4 font-semibold text-ink">{section.name}</td>
                          <td className="py-4 pr-4 text-ink">{formatCents(section.priceCents)}</td>
                          <td className="py-4 pr-4">
                            <div className="text-ink">
                              {sold.toLocaleString()} / {capacity.toLocaleString()}
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-dune">
                              <div className="h-full rounded-full bg-night" style={{ width: `${percent(sold, capacity)}%` }} />
                            </div>
                          </td>
                          <td className="py-4 font-semibold text-ink">{(section.available ?? section.remaining ?? 0).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-night-border/40 p-6 pb-4">
              <div>
                <div className="font-display text-lg font-bold text-ink">Recent orders</div>
                <div className="text-sm text-night-muted">Latest paid ticket orders for this event.</div>
              </div>
              <Button variant="ghost" className="px-3 py-2 text-xs" onClick={() => navigate(`/orders?event=${id}`)} type="button">
                View all
              </Button>
            </div>
            {recentOrders.length === 0 ? (
              <EmptyState title="No paid orders yet">
                Orders appear here after buyers complete checkout.
              </EmptyState>
            ) : (
              <div className="overflow-x-auto px-6 pb-6">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-night-border/40 text-xs uppercase tracking-wide text-night-muted">
                      <th className="pb-3 pr-4 font-semibold">Buyer</th>
                      <th className="pb-3 pr-4 font-semibold">Items</th>
                      <th className="pb-3 pr-4 font-semibold">Total</th>
                      <th className="pb-3 pr-4 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-night-border/30 last:border-0">
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-ink">{order.buyerName}</div>
                          <div className="text-xs text-night-muted">{order.buyerEmail || '—'}</div>
                        </td>
                        <td className="max-w-[260px] py-3 pr-4 text-ink">{orderItemSummary(order)}</td>
                        <td className="py-3 pr-4 font-semibold text-ink">{formatCents(order.totalCents)}</td>
                        <td className="py-3 pr-4">
                          <Badge tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status)}</Badge>
                        </td>
                        <td className="py-3 text-night-muted">{formatDateTime(order.paidAt ?? order.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-night p-6 text-sand">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Sold</div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="font-display text-5xl font-extrabold">{stats.sold.toLocaleString()}</div>
              <div className="text-night-muted">/ {stats.capacity.toLocaleString()}</div>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-night-surface">
              <div className="h-full rounded-full bg-gold" style={{ width: `${percent(stats.sold, stats.capacity)}%` }} />
            </div>
            <div className="mt-4 text-sm text-night-muted">
              {formatCents(stats.grossCents)} gross · {stats.daysToGo} days to go
            </div>
          </Card>

          <Card className="p-5">
            <div className="font-display text-lg font-bold text-ink">Quick actions</div>
            <div className="mt-3 divide-y divide-night-border/40">
              <button type="button" className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-ink" onClick={() => navigate(`/events/${id}/venue`)}>
                Venue layout <span className="text-rumman">→</span>
              </button>
              <button type="button" className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-ink" onClick={() => navigate(`/orders?event=${id}`)}>
                Orders <span className="text-rumman">→</span>
              </button>
              <button type="button" className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-ink" onClick={() => navigate('/analytics')}>
                Analytics <span className="text-rumman">→</span>
              </button>
              <div className="flex items-center justify-between py-3 text-sm font-semibold text-night-muted">
                Edit event <Badge tone="draft">Soon</Badge>
              </div>
              <div className="flex items-center justify-between py-3 text-sm font-semibold text-night-muted">
                Promo codes <Badge tone="draft">Soon</Badge>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-dune/70 px-4 py-3 text-xs text-night-muted">
              Check-in scanning stays in the creator mobile app; Studio manages the event, inventory, and sales.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
