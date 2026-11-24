import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api, type PlanItem, type PlansResponse } from '../lib/api';
import { allIn, formatMinor, formatMoney, venueDateTime } from '../lib/format';
import { cardStart, cardTz, cardVenue } from '../lib/cards';
import { Spinner } from '../components/ui';
import { useHost } from '../components/HostFlow';

const TONES = ['#b8323a', '#2f5c58', '#5a3a5e', '#6e5a36', '#2a4a6e'];
function toneOf(id: string | undefined): string {
  const s = id ?? 'plan';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

function itemTitle(p: PlanItem): string {
  return p.title ?? p.event?.title ?? p.invite?.title ?? '';
}

function itemPlace(p: PlanItem): string {
  return p.venue || (p.event ? cardVenue(p.event) : '') || p.place_text || p.invite?.place_text || '';
}

function itemHref(p: PlanItem): string {
  const code = p.code ?? p.invite?.code;
  if (p.kind === 'ticket') return '/tickets';
  if (code) return `/i/${encodeURIComponent(code)}`;
  return p.event_id ? `/events/${p.event_id}` : '/plans';
}

function itemTz(p: PlanItem): string | undefined {
  return p.tz ?? p.invite?.tz ?? (p.event ? cardTz(p.event) : undefined);
}

function ticketChip(p: PlanItem): { bg: string; fg: string; label: string } {
  const s = (p.status ?? '').toLowerCase();
  if (s === 'going' || s === 'valid' || s === 'confirmed') return { bg: '#2f5c58', fg: '#f7f1e6', label: 'Going' };
  if (s === 'pending' || s === 'processing') return { bg: '#6e5a36', fg: '#f7f1e6', label: 'Pending' };
  if (s) return { bg: '#3a506c', fg: '#c9d3df', label: s.charAt(0).toUpperCase() + s.slice(1) };
  return { bg: '#2f5c58', fg: '#f7f1e6', label: 'Going' };
}

function inviteChip(p: PlanItem): { bg: string; fg: string; label: string } {
  const s = (p.status ?? '').toLowerCase();
  if (p.kind === 'hosting') return { bg: '#f2d9a0', fg: '#16263b', label: 'Hosting' };
  if (s === 'going') return { bg: '#2f5c58', fg: '#f7f1e6', label: 'Going' };
  if (s === 'requested') return { bg: '#6e5a36', fg: '#f7f1e6', label: 'Requested' };
  if (s === 'maybe') return { bg: '#5a3a5e', fg: '#f7f1e6', label: 'Maybe' };
  return { bg: '#3a506c', fg: '#c9d3df', label: 'Invited' };
}

function Label({ children }: { children: string }) {
  return (
    <span className="pt-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-night-muted">
      {children}
    </span>
  );
}

function ToneTile({ id }: { id: string | undefined }) {
  return (
    <span
      className="h-14 w-14 flex-none rounded-xl"
      style={{
        background: `repeating-linear-gradient(135deg, ${toneOf(id)} 0 13px, #1d2e45 13px 26px)`,
      }}
    />
  );
}

/** fTickets — Plans (spec screen): unanswered invites, ticket cards with
 *  QR/Send/Sell actions, invite rows, watches, past plans. */
export default function PlansPage() {
  const { openHost } = useHost();
  const [data, setData] = useState<PlansResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .plans()
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load your plans'));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-[920px] px-8 py-7">
        <div className="rounded-[18px] border-[1.5px] border-dashed border-night-border p-7 text-night-muted">
          {error}
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const upcoming = [...data.upcoming].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const tix = upcoming.filter((p) => p.kind === 'ticket');
  const invs = upcoming.filter((p) => p.kind !== 'ticket');
  const nothing = !data.waiting_on_you.length && !upcoming.length && !data.waiting.length && !data.past.length;

  return (
    <div className="mx-auto flex max-w-[920px] flex-col gap-4 px-8 py-7 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <strong className="text-[34px] font-extrabold tracking-[-0.03em] text-sand">Plans</strong>
        <button
          type="button"
          onClick={() => openHost()}
          className="rounded-full bg-gold px-[18px] py-[11px] text-[15px] font-semibold text-night transition hover:brightness-95"
        >
          Host something
        </button>
      </div>

      {nothing ? (
        <div className="rounded-[18px] border-[1.5px] border-dashed border-night-border p-8 text-night-muted">
          Nothing planned yet. Tickets you buy and invites you reply to land here.
        </div>
      ) : null}

      {data.waiting_on_you.length ? (
        <>
          <Label>Waiting on you</Label>
          {data.waiting_on_you.map((inv) => (
            <Link
              key={inv.id ?? inv.code}
              to={`/i/${encodeURIComponent(inv.code ?? '')}`}
              className="flex w-full items-center gap-4 rounded-[18px] border-[1.5px] border-gold bg-night-elevated px-4 py-3.5 text-start text-sand transition hover:brightness-110"
            >
              <ToneTile id={inv.code} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <strong className="truncate text-[17px] text-sand">{inv.title}</strong>
                <span className="truncate text-[14px] text-night-muted">
                  {[inv.host?.name ? `From ${inv.host.name}` : '', venueDateTime(inv.starts_at, inv.tz)]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span className="text-[14px] font-semibold text-gold">Reply →</span>
            </Link>
          ))}
        </>
      ) : null}

      {tix.length ? (
        <>
          <Label>Tickets</Label>
          {tix.map((p, i) => {
            const tz = itemTz(p);
            const chip = ticketChip(p);
            return (
              <div
                key={`tix-${i}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] bg-night-elevated px-5 py-[18px]"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex items-center gap-2.5">
                    <strong className="truncate text-[18px] text-sand">{itemTitle(p)}</strong>
                    <span
                      className="rounded-full px-2.5 py-[3px] text-[12px] font-semibold"
                      style={{ background: chip.bg, color: chip.fg }}
                    >
                      {chip.label}
                    </span>
                  </span>
                  <span className="text-[14px] text-night-muted">
                    {[
                      p.qty ? `${p.qty} × ${p.tier ?? 'ticket'}` : p.tier,
                      venueDateTime(p.starts_at, tz),
                      itemPlace(p),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className="flex flex-wrap gap-2">
                  <Link
                    to={`/tickets?event=${p.event_id ?? ''}`}
                    className="rounded-full bg-gold px-4 py-2.5 text-[15px] font-semibold text-night transition hover:brightness-95"
                  >
                    Show QR
                  </Link>
                  <Link
                    to={`/tickets?event=${p.event_id ?? ''}&action=send`}
                    className="rounded-full border-[1.5px] border-night-border px-4 py-[9px] text-[14px] font-semibold text-sand transition hover:bg-night-surface"
                  >
                    Send
                  </Link>
                  <Link
                    to={`/sell?eventId=${p.event_id ?? ''}`}
                    className="rounded-full border-[1.5px] border-night-border px-4 py-[9px] text-[14px] font-semibold text-sand transition hover:bg-night-surface"
                  >
                    Sell
                  </Link>
                </span>
              </div>
            );
          })}
        </>
      ) : null}

      {invs.length ? (
        <>
          <Label>Invites</Label>
          {invs.map((p, i) => {
            const tz = itemTz(p);
            const chip = inviteChip(p);
            return (
              <Link
                key={`inv-${i}`}
                to={itemHref(p)}
                className="flex w-full items-center gap-4 rounded-[18px] bg-night-elevated px-4 py-3.5 text-start text-sand transition hover:brightness-110"
              >
                <ToneTile id={p.code ?? p.invite?.code ?? p.event_id ?? itemTitle(p)} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <strong className="truncate text-[17px] text-sand">{itemTitle(p)}</strong>
                  <span className="truncate text-[14px] text-night-muted">
                    {[
                      p.kind === 'hosting' && p.counts
                        ? `${p.counts.going ?? 0} going${p.counts.requested ? ` · ${p.counts.requested} to approve` : ''}`
                        : '',
                      venueDateTime(p.starts_at, tz),
                      itemPlace(p),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span
                  className="rounded-full px-[11px] py-1 text-[12px] font-semibold"
                  style={{ background: chip.bg, color: chip.fg }}
                >
                  {chip.label}
                </span>
              </Link>
            );
          })}
        </>
      ) : null}

      {data.waiting.length ? (
        <>
          <Label>Waiting for tickets</Label>
          {data.waiting.map((w) => {
            const max = w.max_each
              ? formatMinor({ ...w.max_each, amount_minor: allIn(w.max_each.amount_minor) })
              : w.max_each_minor != null
                ? formatMoney(allIn(w.max_each_minor), w.event?.currency)
                : '';
            const start = w.event ? cardStart(w.event) : '';
            return (
              <Link
                key={w.id}
                to={`/events/${w.event_id}`}
                className="flex w-full items-center gap-4 rounded-[18px] bg-night-elevated px-4 py-3.5 text-start text-sand transition hover:brightness-110"
              >
                <ToneTile id={w.event_id} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <strong className="truncate text-[17px] text-sand">{w.event?.title ?? 'Event'}</strong>
                  <span className="truncate text-[14px] text-night-muted">
                    {[
                      `${w.qty} × ${w.tier ?? 'ticket'}`,
                      start ? venueDateTime(start, w.event ? cardTz(w.event) : undefined) : '',
                      max ? `up to ${max} each` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className="rounded-full bg-night-surface px-[11px] py-1 text-[12px] font-semibold text-gold">
                  Waiting
                </span>
              </Link>
            );
          })}
        </>
      ) : null}

      {data.past.length ? (
        <>
          <Label>Been to</Label>
          {data.past.map((p, i) => {
            const tz = itemTz(p);
            return (
              <Link
                key={`past-${i}`}
                to={itemHref(p)}
                className="flex w-full items-center gap-4 rounded-[18px] bg-night-elevated px-4 py-3.5 text-start text-sand transition hover:brightness-110"
              >
                <ToneTile id={p.code ?? p.event_id ?? itemTitle(p)} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <strong className="truncate text-[17px] text-sand">{itemTitle(p)}</strong>
                  <span className="truncate text-[14px] text-night-muted">
                    {[venueDateTime(p.starts_at, tz), itemPlace(p)].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </Link>
            );
          })}
        </>
      ) : null}
    </div>
  );
}
