import { useEffect, useMemo, useState } from 'react';
import { api, type EventOrder, type StudioEvent } from '../lib/api';
import { useOrg } from '../lib/org';
import {
  fetchOrgOrders,
  isOrderRefundable,
  orderItemLabel,
  orderStatusLabel,
} from '../lib/sales';
import { formatDateTime, formatMoney, timeAgo } from '../lib/format';
import {
  Chip,
  ConfirmDialog,
  EmptyState,
  Input,
  LoadingBlock,
  PageHeader,
  ToastHost,
  useToasts,
} from '../components/ui';

type OrgOrder = EventOrder & { eventId: string; eventTitle: string };
type Filter = 'all' | 'paid' | 'refunded';

export default function OrdersPage() {
  const { org, role } = useOrg();
  const { toasts, push } = useToasts();
  const [events, setEvents] = useState<StudioEvent[] | null>(null);
  const [orders, setOrders] = useState<OrgOrder[] | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [refundTarget, setRefundTarget] = useState<OrgOrder | null>(null);
  const [refundedIds, setRefundedIds] = useState<Set<string>>(() => new Set());

  const isAdmin = role === 'admin';

  useEffect(() => {
    setRefundedIds(new Set(api.refundedOrderIds()));
    api
      .myEvents()
      .then(async ({ events: evts }) => {
        setEvents(evts);
        setOrders(await fetchOrgOrders(evts));
      })
      .catch(() => {
        setEvents([]);
        setOrders([]);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (orders ?? []).filter((o) => {
      if (filter === 'paid' && !(o.status === 'PAID' && !refundedIds.has(o.id))) return false;
      if (filter === 'refunded' && !(refundedIds.has(o.id) || o.status === 'REFUNDED')) return false;
      if (q) {
        const hay = `${o.id} ${o.buyerName} ${o.buyerEmail} ${o.eventTitle} ${orderItemLabel(o)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, query, filter, refundedIds]);

  const currency = org?.currency ?? 'AED';

  function doRefund(order: OrgOrder) {
    // TODO(api-gap): POST /orders/{id}/refunds, until the endpoint exists we
    // mark the refund locally so balance maths stay honest.
    api.refundOrder(order.id);
    setRefundedIds(new Set(api.refundedOrderIds()));
    setRefundTarget(null);
    push(`Refunded ${order.buyerName} ${formatMoney(order.totalCents, currency)}.`);
  }

  return (
    <div>
      <PageHeader title="Orders" />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          placeholder="Search order, buyer, event…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex gap-2">
          {(['all', 'paid', 'refunded'] as Filter[]).map((f) => (
            <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'paid' ? 'Paid' : 'Refunded'}
            </Chip>
          ))}
        </div>
      </div>

      {orders === null || events === null ? (
        <LoadingBlock />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No orders yet"
          body="They'll land here as tickets sell."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-dune bg-[#fff9ef]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dune text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/40">
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Buyer</th>
                <th className="px-5 py-3">Event</th>
                <th className="px-5 py-3">Tickets</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3">Status</th>
                {isAdmin ? <th className="px-5 py-3" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-dune/70">
              {filtered.map((o) => {
                const status = orderStatusLabel(o, refundedIds);
                return (
                  <tr key={o.id} className="hover:bg-sand/40">
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-xs text-ink/70">
                        …{o.id.replace(/-/g, '').slice(-6)}
                      </p>
                      <p className="text-[11px] text-ink/40" title={formatDateTime(o.createdAt)}>
                        {timeAgo(o.createdAt)}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-ink">{o.buyerName}</p>
                      <p className="text-xs text-ink/40">{o.buyerEmail}</p>
                    </td>
                    <td className="max-w-[180px] truncate px-5 py-3.5 text-ink/70">{o.eventTitle}</td>
                    <td className="max-w-[160px] truncate px-5 py-3.5 text-ink/70">
                      {orderItemLabel(o)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                      {formatMoney(o.totalCents, currency)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          status === 'Paid'
                            ? 'bg-gold/25 text-ink'
                            : status === 'Refunded'
                              ? 'bg-night/10 text-ink/60'
                              : 'bg-dune text-ink/50'
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    {isAdmin ? (
                      <td className="px-5 py-3.5 text-right">
                        {isOrderRefundable(o, refundedIds) ? (
                          <button
                            type="button"
                            onClick={() => setRefundTarget(o)}
                            className="text-xs font-semibold text-ink/50 underline underline-offset-2 hover:text-rumman"
                          >
                            Refund
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TODO(api-gap): POST /orders/{id}/refunds, errors already_refunded,
          insufficient_balance */}
      <ConfirmDialog
        open={refundTarget !== null}
        onClose={() => setRefundTarget(null)}
        title={refundTarget ? `Refund …${refundTarget.id.replace(/-/g, '').slice(-6)}?` : ''}
        body={
          refundTarget
            ? `${refundTarget.buyerName} gets ${formatMoney(refundTarget.totalCents, currency)} back in 5-10 days. Their QR stops working right away.`
            : ''
        }
        confirmLabel="Refund"
        danger
        onConfirm={() => refundTarget && doRefund(refundTarget)}
      />
      <ToastHost toasts={toasts} />
    </div>
  );
}
