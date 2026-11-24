import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type EventOrder, type StudioEvent } from '../lib/api';
import { useOrg } from '../lib/org';
import {
  fetchOrgOrders,
  eventCapacity,
  eventSold,
  eventStatus,
  ordersTicketCount,
  ordersTicketGross,
  statusChipClass,
} from '../lib/sales';
import { formatEventDate, formatMoney } from '../lib/format';
import {
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  PageHeader,
  Stat,
  VerificationBadge,
  useToasts,
  ToastHost,
} from '../components/ui';
import VerifyModal from '../components/VerifyModal';

type OrgOrder = EventOrder & { eventId: string; eventTitle: string };

export default function OverviewPage() {
  const { org, role } = useOrg();
  const navigate = useNavigate();
  const { toasts, push } = useToasts();
  const [events, setEvents] = useState<StudioEvent[] | null>(null);
  const [orders, setOrders] = useState<OrgOrder[]>([]);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const isAdmin = role === 'admin';

  useEffect(() => {
    api
      .myEvents()
      .then(async ({ events: evts }) => {
        setEvents(evts);
        if (org) evts.forEach((e) => api.upsertVenueFromEvent(org.id, e));
        setOrders(await fetchOrgOrders(evts));
      })
      .catch(() => setEvents([]));
  }, [org]);

  const refundedIds = useMemo(() => new Set(api.refundedOrderIds()), []);
  const paidOrders = useMemo(
    () => orders.filter((o) => o.status === 'PAID' && !refundedIds.has(o.id)),
    [orders, refundedIds],
  );

  if (!org) return <LoadingBlock />;

  const liveEvents = (events ?? []).filter((e) => {
    const s = eventStatus(e, api.eventMeta(e.id));
    return s === 'on sale' || s === 'sold out';
  });
  const refundedCount = orders.filter(
    (o) => refundedIds.has(o.id) || o.status === 'REFUNDED',
  ).length;

  const checklistDone = {
    org: true,
    event: (events ?? []).length > 0,
    verified: org.verificationStatus === 'approved',
    bank: Boolean(org.payoutAccount),
  };
  const showChecklist = !checklistDone.event || !checklistDone.verified || !checklistDone.bank;

  return (
    <div>
      <PageHeader
        title={org.name}
        action={
          <div className="flex items-center gap-3">
            <VerificationBadge status={org.verificationStatus} />
            <Button to="/events/new">+ New event</Button>
          </div>
        }
      />

      {/* "Get ready to sell" checklist, shown until org is fully set up */}
      {showChecklist ? (
        <section className="mb-6 flex flex-col gap-1 rounded-2xl border-[1.5px] border-night bg-[#fff9ef] px-5 py-[18px]">
          <h2 className="pb-1.5 font-display text-lg font-bold text-night">Get ready to sell</h2>
          <ChecklistRow n={1} done label={`Create ${org.name}`} />
          <ChecklistRow
            n={2}
            done={checklistDone.event}
            label="Draft your first event"
            action={!checklistDone.event ? () => navigate('/events/new') : undefined}
            actionLabel="New event"
          />
          <ChecklistRow
            n={3}
            done={checklistDone.verified}
            label="Verify ID & trade licence"
            note={
              org.verificationStatus === 'submitted'
                ? 'Waiting on Sahra, usually a day or two.'
                : org.verificationStatus === 'rejected'
                  ? 'Rejected, resubmit in Settings.'
                  : 'Needed before you can publish or get paid.'
            }
            action={org.verificationStatus === 'none' ? () => setVerifyOpen(true) : undefined}
            actionLabel="Verify"
          />
          <ChecklistRow
            n={4}
            done={checklistDone.bank}
            label="Add a bank account"
            note="Ticket money is held until you do."
            action={!checklistDone.bank && isAdmin ? () => navigate('/payouts') : undefined}
            actionLabel="Add bank"
          />
          <ChecklistRow
            n={5}
            done={false}
            label="Invite your team"
            note="Optional — co-hosts and gate staff."
            action={() => navigate('/team')}
            actionLabel="Invite"
          />
        </section>
      ) : null}

      {/* KPIs */}
      {events === null ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Tickets sold" value={ordersTicketCount(paidOrders)} />
            {isAdmin ? (
              <Stat
                label="Gross revenue"
                value={formatMoney(ordersTicketGross(paidOrders), org.currency)}
              />
            ) : (
              <Stat label="Orders" value={paidOrders.length} />
            )}
            <Stat label="Live events" value={liveEvents.length} />
            <Stat label="Refunds" value={refundedCount} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Events */}
            <Card
              title="Events"
              action={
                <button
                  type="button"
                  onClick={() => navigate('/events')}
                  className="text-xs font-semibold text-ink/50 hover:text-ink"
                >
                  View all
                </button>
              }
            >
              {events.length === 0 ? (
                <EmptyState
                  title="No events yet"
                  body="Create one, it stays a draft until you publish."
                  action={<Button to="/events/new">+ New event</Button>}
                />
              ) : (
                <div className="-mx-2 divide-y divide-dune/70">
                  {events.slice(0, 5).map((e) => {
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
                        className="flex w-full items-center gap-4 px-2 py-3 text-left hover:bg-sand/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{e.title}</p>
                          <p className="mt-0.5 text-xs text-ink/45">
                            {formatEventDate(e.startsAt)} · {e.location ?? '-'}
                          </p>
                        </div>
                        <div className="w-28">
                          <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-dune">
                            <div
                              className={`h-full rounded-full ${
                                status === 'on sale' ? 'bg-gold' : 'bg-ink/20'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-right text-[11px] text-ink/45 tabular-nums">
                            {sold}/{cap}
                          </p>
                        </div>
                        <span
                          className={`w-32 rounded-full border px-2.5 py-1 text-center text-[11px] font-semibold capitalize ${statusChipClass(status)}`}
                        >
                          {status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Latest orders */}
            <Card title="Latest orders">
              {orders.length === 0 ? (
                <EmptyState title="No orders yet" body="They'll land here as tickets sell." />
              ) : (
                <div className="-mx-2 divide-y divide-dune/70">
                  {orders.slice(0, 6).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => navigate('/orders')}
                      className="flex w-full items-center gap-4 px-2 py-3 text-left hover:bg-sand/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{o.buyerName}</p>
                        <p className="mt-0.5 truncate text-xs text-ink/45">
                          {o.eventTitle} · {o.items.map((i) => i.tierName).join(', ')}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-ink tabular-nums">
                        {formatMoney(o.totalCents, org.currency)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      <VerifyModal
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        onSubmitted={() =>
          push('Got it. We\'ll email you once it\'s checked, usually a day or two.')
        }
      />
      <ToastHost toasts={toasts} />
    </div>
  );
}

function ChecklistRow({
  n,
  done,
  label,
  note,
  action,
  actionLabel,
}: {
  n: number;
  done: boolean;
  label: string;
  note?: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className={`flex items-center gap-3.5 border-t border-dune py-2.5 ${done ? 'opacity-50' : ''}`}>
      <span
        className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[13px] font-extrabold ${
          done ? 'bg-gold text-night' : 'bg-night text-sand'
        }`}
      >
        {done ? '✓' : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-night">{label}</p>
        {note && !done ? <p className="text-[13px] text-ink/55">{note}</p> : null}
      </div>
      {action && !done ? (
        <button
          type="button"
          onClick={action}
          className="rounded-full bg-night px-3.5 py-2 text-[13px] font-semibold text-gold"
        >
          {actionLabel ?? 'Do it'}
        </button>
      ) : null}
    </div>
  );
}
