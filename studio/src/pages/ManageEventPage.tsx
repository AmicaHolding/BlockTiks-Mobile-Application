import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type EventOrder, type StudioEvent } from '../lib/api';
import { FLAGS } from '../lib/flags';
import { useOrg } from '../lib/org';
import type { LocalEventHost } from '../lib/store';
import {
  eventCapacity,
  eventGrossCents,
  eventSold,
  eventStatus,
  isOnSale,
  orderItemLabel,
  statusChipClass,
  daysUntil,
} from '../lib/sales';
import { formatDay, formatEventDate, formatMoney } from '../lib/format';
import {
  Badge,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  Field,
  Input,
  LoadingBlock,
  Modal,
  NightCard,
  ToastHost,
  useToasts,
} from '../components/ui';
import VerifyModal from '../components/VerifyModal';

const FAN_URL = (import.meta.env.VITE_BUYER_URL as string | undefined) ?? 'http://localhost:5174';

export default function ManageEventPage() {
  const { id } = useParams();
  const { org, role } = useOrg();
  const navigate = useNavigate();
  const { toasts, push } = useToasts();

  const [event, setEvent] = useState<StudioEvent | null>(null);
  const [orders, setOrders] = useState<EventOrder[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [meta, setMeta] = useState(() => (id ? api.eventMeta(id) : null));
  const [hosts, setHosts] = useState<LocalEventHost[]>([]);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [confirm, setConfirm] = useState<'pause' | 'resume' | 'cancel' | 'postpone' | null>(null);
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeTime, setPostponeTime] = useState('20:00');
  const [menuOpen, setMenuOpen] = useState(false);
  const [cohostName, setCohostName] = useState('');
  const [cohostShare, setCohostShare] = useState('');

  const isAdmin = role === 'admin';
  const canManage = role === 'admin' || role === 'cohost';

  const load = useCallback(() => {
    if (!id) return;
    api
      .event(id)
      .then(({ event }) => {
        setEvent(event);
        if (org) api.upsertVenueFromEvent(org.id, event);
      })
      .catch(() => setNotFound(true));
    api.eventOrders(id).then((r) => setOrders(r.orders)).catch(() => undefined);
    setMeta(api.eventMeta(id));
    if (org) setHosts(api.eventHosts(id, org.id, org.name));
  }, [id, org]);

  useEffect(load, [load]);

  const refundedIds = useMemo(() => new Set(api.refundedOrderIds()), []);
  const paidOrders = orders.filter((o) => o.status === 'PAID' && !refundedIds.has(o.id));
  const sold = event ? eventSold(event) : 0;
  const cap = event ? eventCapacity(event) : 0;
  const pct = cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : 0;
  const status = event && meta ? eventStatus(event, meta) : 'draft';
  const sections = event?.venueLayout?.sections ?? event?.venueSections ?? [];
  const lockedSplits = sold > 0 && FLAGS.decision5_splitsLockAtFirstSale;
  const splitsTotal = hosts.reduce((a, h) => a + h.splitBps, 0);

  if (notFound) {
    return (
      <div className="py-24 text-center">
        <p className="font-display text-xl font-bold text-night">Event not found</p>
        <Button to="/events" variant="outline" small>
          Back to events
        </Button>
      </div>
    );
  }
  if (!event || !meta || !org) return <LoadingBlock />;

  const currency = event.currency ?? org.currency;

  function publish() {
    if (!event || !org) return;
    if (org.verificationStatus === 'none') {
      setVerifyOpen(true);
      return;
    }
    if (org.verificationStatus === 'submitted') {
      api.setEventMeta(event.id, { pendingPublish: true });
      setMeta(api.eventMeta(event.id));
      push('Saved. Publishes automatically once verification is approved.');
      return;
    }
    if (org.verificationStatus === 'rejected') {
      push('Verification was rejected, resubmit in Settings first.', 'danger');
      return;
    }
    if (hosts.some((h) => h.status === 'proposed')) {
      push('Splits need everyone to accept before you publish.', 'danger');
      return;
    }
    api
      .publishEvent(event.id)
      .then(() => {
        api.setEventMeta(event.id, { pendingPublish: false });
        push("Live. First ticket's the best one.");
        load();
      })
      .catch((e) => push(e instanceof Error ? e.message : 'Publish failed.', 'danger'));
  }

  function proposeCohost() {
    if (!event || !org) return;
    const share = Math.round(parseFloat(cohostShare || '0') * 100);
    if (!cohostName.trim() || share <= 0) {
      push('Name the co-host and give them a share.', 'danger');
      return;
    }
    const cohosts = hosts.filter((h) => h.role === 'cohost');
    const cohostTotal = cohosts.reduce((a, h) => a + h.splitBps, 0) + share;
    if (cohostTotal > 10000) {
      push('Splits must total 100%.', 'danger');
      return;
    }
    const next: LocalEventHost[] = [
      ...hosts.filter((h) => h.role === 'owner').map((h) => ({ ...h, splitBps: 10000 - cohostTotal })), ...cohosts,
      {
        eventId: event.id,
        orgId: '',
        orgName: cohostName.trim(),
        role: 'cohost',
        splitBps: share,
        status: 'proposed',
      },
    ];
    api.saveEventHosts(event.id, next);
    setHosts(api.eventHosts(event.id, org.id, org.name));
    setCohostName('');
    setCohostShare('');
    push(`Split proposed, ${cohostName.trim()} needs to accept.`);
  }

  function markAccepted(host: LocalEventHost) {
    if (!event || !org) return;
    const next = hosts.map((h) =>
      h.orgName === host.orgName && h.role === 'cohost' ? { ...h, status: 'accepted' as const } : h,
    );
    api.saveEventHosts(event.id, next);
    setHosts(next);
  }

  return (
    <div>
      {/* Breadcrumb + actions */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/40 hover:text-ink"
          >
            Events
          </button>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold text-night">{event.title}</h1>
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold capitalize ${statusChipClass(status)}`}
            >
              {status}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-ink/50">
            {formatEventDate(meta.postponed?.newStartsAt ?? event.startsAt)} · {event.location ?? '-'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" small href={`${FAN_URL}/e/${event.id}`}>
            View on sahra.app ↗
          </Button>
          {canManage && (status === 'draft' || status === 'awaiting verification') ? (
            <Button variant="dark" small onClick={publish}>
              Publish
            </Button>
          ) : null}
          {canManage && isOnSale(status) ? (
            <Button variant="outline" small onClick={() => setConfirm('pause')}>
              Pause sales
            </Button>
          ) : null}
          {canManage && status === 'paused' ? (
            <Button variant="outline" small onClick={() => setConfirm('resume')}>
              Resume sales
            </Button>
          ) : null}
          {canManage ? (
            <div className="relative">
              <Button variant="ghost" small onClick={() => setMenuOpen((v) => !v)}>
                •••
              </Button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-dune bg-white py-1.5 shadow-lg">
                  <MenuItem
                    label="Venue layout"
                    onClick={() => navigate(`/venues?event=${event.id}`)}
                  />
                  <MenuItem
                    label="Postpone"
                    onClick={() => {
                      setConfirm('postpone');
                      setMenuOpen(false);
                    }}
                  />
                  {isAdmin ? (
                    <MenuItem
                      label="Cancel event"
                      danger
                      onClick={() => {
                        setConfirm('cancel');
                        setMenuOpen(false);
                      }}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {status === 'awaiting verification' ? (
        <div className="mb-6 rounded-xl border border-gold/50 bg-gold/10 px-5 py-3.5 text-sm text-ink/70">
          Waiting on verification, this publishes automatically once you're approved.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Ticket tiers */}
          <Card
            title="Ticket tiers"
            action={
              sections.length > 0 ? (
                <Button variant="outline" small to={`/venues?event=${event.id}`}>
                  Venue layout
                </Button>
              ) : null
            }
          >
            {(event.tiers ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-ink/45">No tiers yet.</p>
            ) : (
              <div className="-mx-2 divide-y divide-dune/70">
                {(event.tiers ?? []).map((t, i) => {
                  const tSold = t.sold ?? 0;
                  const tCap = t.quantity ?? 0;
                  const tPct = tCap > 0 ? Math.min(100, Math.round((tSold / tCap) * 100)) : 0;
                  const sectionName = sections.find((s) => s.id === t.sectionId)?.name;
                  return (
                    <div key={t.id ?? i} className="flex items-center gap-4 px-2 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">{t.name}</p>
                        {sectionName ? (
                          <p className="text-xs text-ink/45">Section · {sectionName}</p>
                        ) : null}
                      </div>
                      <span className="w-24 text-sm text-ink/70 tabular-nums">
                        {formatMoney(t.priceCents, currency)}
                      </span>
                      <div className="w-32">
                        <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-dune">
                          <div className="h-full rounded-full bg-gold" style={{ width: `${tPct}%` }} />
                        </div>
                        <p className="text-right text-[11px] text-ink/45 tabular-nums">
                          {tSold}/{tCap}
                        </p>
                      </div>
                      {isAdmin ? (
                        <span className="w-24 text-right text-sm font-semibold text-ink tabular-nums">
                          {formatMoney(tSold * t.priceCents, currency)}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
                {isAdmin ? (
                  <div className="flex items-center justify-between px-2 py-3 text-sm font-semibold text-ink">
                    <span>Gross revenue</span>
                    <span className="tabular-nums">{formatMoney(eventGrossCents(event), currency)}</span>
                  </div>
                ) : null}
              </div>
            )}
          </Card>

          {/* Seated venue sections */}
          {sections.length > 0 ? (
            <Card
              title="Venue sections"
              action={
                <Button variant="outline" small to={`/venues?event=${event.id}`}>
                  Edit venue
                </Button>
              }
            >
              <div className="-mx-2 divide-y divide-dune/70">
                {sections.map((s) => (
                  <div key={s.id} className="flex items-center gap-4 px-2 py-3 text-sm">
                    <span className="flex-1 font-semibold text-ink">{s.name}</span>
                    <span className="tabular-nums text-ink/60">
                      {s.rows}×{s.seatsPerRow}
                    </span>
                    <span className="tabular-nums text-ink/45">{s.capacity} seats</span>
                    <span className="tabular-nums text-ink/70">
                      {formatMoney(s.priceCents, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {/* Resale */}
          <Card title="Resale">
            {meta.resaleEnabled ? (
              <div className="space-y-4">
                <p className="text-sm text-ink/60">
                  Resale allowed, capped at{' '}
                  <strong className="text-ink">+{meta.resaleCapPct}%</strong> of face value. You earn
                  a 5% royalty on every resale.
                </p>
                {isAdmin ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                      Cap
                    </span>
                    {[0, 5, FLAGS.decision8_maxResaleCapPct]
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .map((v) => (
                        <Chip
                          key={v}
                          selected={meta.resaleCapPct === v}
                          onClick={() => {
                            api.setEventMeta(event.id, { resaleCapPct: v });
                            setMeta(api.eventMeta(event.id));
                          }}
                        >
                          +{v}%
                        </Chip>
                      ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-ink/60">Resale is blocked for this event.</p>
            )}
            {isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  api.setEventMeta(event.id, { resaleEnabled: !meta.resaleEnabled });
                  setMeta(api.eventMeta(event.id));
                }}
                className="mt-3 text-xs font-semibold text-ink underline underline-offset-2"
              >
                {meta.resaleEnabled ? 'Block resale' : 'Allow resale'}
              </button>
            ) : null}
          </Card>

          {/* Recent orders */}
          <Card
            title="Recent orders"
            action={
              <Button variant="ghost" small onClick={() => navigate('/orders')}>
                All orders
              </Button>
            }
          >
            {orders.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink/45">Nothing yet.</p>
            ) : (
              <div className="-mx-2 divide-y divide-dune/70">
                {orders.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex items-center gap-4 px-2 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{o.buyerName}</p>
                      <p className="truncate text-xs text-ink/45">{orderItemLabel(o)}</p>
                    </div>
                    <span className="tabular-nums text-ink/70">
                      {formatMoney(o.totalCents, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <NightCard title="Sold">
            <p className="font-display text-4xl font-bold tabular-nums">
              {sold}
              <span className="text-lg font-medium text-sand/50"> / {cap}</span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-sand/50">{pct}% of capacity</p>
            <div className="mt-5 space-y-2.5 border-t border-white/10 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-sand/50">Gross</span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(eventGrossCents(event), currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sand/50">Paid orders</span>
                <span className="font-semibold tabular-nums">{paidOrders.length}</span>
              </div>
              {daysUntil(event.startsAt) !== null && daysUntil(event.startsAt)! > 0 ? (
                <div className="flex justify-between">
                  <span className="text-sand/50">Goes live</span>
                  <span className="font-semibold">in {daysUntil(event.startsAt)}d</span>
                </div>
              ) : null}
            </div>
          </NightCard>

          {/* Co-host splits, decision-5: lock at first sale */}
          <Card title="Co-hosts">
            <div className="space-y-2.5">
              {hosts.map((h, i) => (
                <div key={`${h.orgName}-${i}`} className="flex items-center gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{h.orgName}</p>
                    <p className="text-xs capitalize text-ink/45">
                      {h.role === 'owner' ? 'Hosting org' : 'Co-host'}
                    </p>
                  </div>
                  <span className="tabular-nums font-semibold text-ink">
                    {(h.splitBps / 100).toFixed(0)}%
                  </span>
                  {h.role === 'cohost' ? (
                    h.status === 'proposed' ? (
                      isAdmin ? (
                        <button
                          type="button"
                          onClick={() => markAccepted(h)}
                          className="rounded-full border border-dune px-2.5 py-0.5 text-[11px] font-semibold text-ink/50 hover:border-ink/30"
                          title="Stand-in for the co-host accepting (stub)"
                        >
                          Proposed
                        </button>
                      ) : (
                        <Badge tone="outline">Proposed</Badge>
                      )
                    ) : (
                      <Badge tone={h.status === 'locked' || lockedSplits ? 'night' : 'gold'}>
                        {h.status === 'locked' || lockedSplits ? 'Locked' : 'Accepted'}
                      </Badge>
                    )
                  ) : (
                    <Badge tone="outline">Owner</Badge>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink/45">
              {lockedSplits
                ? 'Locked, the first sale already happened.'
                : 'Splits lock when the first ticket sells.'}
            </p>
            {isAdmin && !lockedSplits ? (
              <div className="mt-4 space-y-2 border-t border-dune pt-4">
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Co-host org name"
                    value={cohostName}
                    onChange={(e) => setCohostName(e.target.value)}
                  />
                  <Input
                    className="!w-20"
                    placeholder="%"
                    inputMode="numeric"
                    value={cohostShare}
                    onChange={(e) => setCohostShare(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <Button variant="outline" small onClick={proposeCohost}>
                  Propose split
                </Button>
                <p className="text-[11px] text-ink/40">
                  Splits must total 100%, currently {(splitsTotal / 100).toFixed(0)}%.
                </p>
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      {/* Confirmations */}
      <ConfirmDialog
        open={confirm === 'pause'}
        onClose={() => setConfirm(null)}
        title="Pause sales?"
        body="The listing stays up but the Buy button greys out until you resume."
        confirmLabel="Pause sales"
        onConfirm={() => {
          api.setEventPaused(event.id, true);
          setConfirm(null);
          load();
          push('Sales paused.');
        }}
      />
      <ConfirmDialog
        open={confirm === 'resume'}
        onClose={() => setConfirm(null)}
        title="Resume sales?"
        body="Tickets go back on sale right away."
        confirmLabel="Resume sales"
        onConfirm={() => {
          api.setEventPaused(event.id, false);
          setConfirm(null);
          load();
          push('Back on sale.');
        }}
      />
      {/* TODO(api-gap): POST /events/{id}/cancel, decision-2 default copy */}
      <ConfirmDialog
        open={confirm === 'cancel'}
        onClose={() => setConfirm(null)}
        title={`Cancel ${event.title}?`}
        body={`Every holder gets a full refund, fees included. ${sold} tickets on ${formatDay(
          event.startsAt,
        )}. There's no undo.`}
        confirmLabel="Cancel event"
        danger
        onConfirm={() => {
          api.cancelEvent(event.id);
          setConfirm(null);
          load();
          push('Event cancelled. Refunds are on their way.');
        }}
      />
      {/* TODO(api-gap): POST /events/{id}/postpone {new_starts_at}, decision-2
          default: auto-rollover, 14-day refund window */}
      <Modal
        open={confirm === 'postpone'}
        onClose={() => setConfirm(null)}
        title={`Postpone ${event.title}?`}
        sub={`${sold} tickets roll to the new date; anyone who can't make it gets a 14-day refund window.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Keep as is
            </Button>
            <Button
              onClick={() => {
                const iso = postponeDate
                  ? new Date(`${postponeDate}T${postponeTime || '20:00'}:00`).toISOString()
                  : event.startsAt ?? '';
                api.postponeEvent(event.id, iso);
                setConfirm(null);
                load();
                push('Postponed. Holders keep their tickets.');
              }}
            >
              Postpone
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="New date">
            <Input type="date" value={postponeDate} onChange={(e) => setPostponeDate(e.target.value)} />
          </Field>
          <Field label="New time">
            <Input type="time" value={postponeTime} onChange={(e) => setPostponeTime(e.target.value)} />
          </Field>
        </div>
      </Modal>

      <VerifyModal
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        onSubmitted={() => {
          api.setEventMeta(event.id, { pendingPublish: true });
          push('Verification submitted. This publishes once you\'re approved.');
          load();
        }}
      />
      <ToastHost toasts={toasts} />
    </div>
  );
}

function MenuItem({
  label,
  danger,
  onClick,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-4 py-2 text-left text-sm font-medium hover:bg-sand ${
        danger ? 'text-rumman' : 'text-ink'
      }`}
    >
      {label}
    </button>
  );
}
