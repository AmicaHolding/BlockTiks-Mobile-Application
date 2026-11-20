import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api, type PlanItem, type PlansResponse, type PriceWatch, type Wallet } from '../lib/api';
import { formatMinor, formatMoney, inTz, venueDateTime, venueTime } from '../lib/format';
import { cardStart, cardTz, cardVenue } from '../lib/cards';
import { EmptyState, Spinner } from '../components/ui';
import { useHost } from '../components/HostFlow';

const KIND_LABEL: Record<PlanItem['kind'], string> = { ticket: 'Ticket', rsvp: 'RSVP', hosting: 'Hosting' };

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

function DateBlock({ iso, tz }: { iso: string; tz?: string }) {
  return (
    <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-night-deep py-2">
      <span className="text-[10px] font-bold uppercase text-gold">{inTz(iso, tz, { month: 'short' })}</span>
      <span className="font-display text-2xl font-extrabold leading-none text-sand">{inTz(iso, tz, { day: 'numeric' })}</span>
      <span className="text-[10px] font-semibold text-night-muted">{inTz(iso, tz, { weekday: 'short' })}</span>
    </div>
  );
}

function Row({ p, muted = false }: { p: PlanItem; muted?: boolean }) {
  const tz = itemTz(p);
  const detail =
    p.kind === 'ticket'
      ? [p.qty ? `${p.qty} × ${p.tier ?? 'ticket'}` : p.tier, itemPlace(p)]
      : p.kind === 'hosting'
        ? [`${p.counts?.going ?? 0} going`, p.counts?.requested ? `${p.counts.requested} to approve` : '']
        : [p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : '', itemPlace(p)];
  return (
    <Link
      to={itemHref(p)}
      className={`flex items-center gap-4 rounded-card border border-night-border/60 bg-night-surface p-3 transition hover:border-gold/50 ${muted ? 'opacity-60' : ''}`}
    >
      <DateBlock iso={p.starts_at} tz={tz} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-base font-extrabold text-sand">{itemTitle(p)}</div>
        <div className="truncate text-sm text-night-muted">{[venueTime(p.starts_at, tz), ...detail].filter(Boolean).join(' · ')}</div>
      </div>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${p.kind === 'ticket' ? 'bg-gold text-night' : p.kind === 'hosting' ? 'bg-sand text-night' : 'bg-night-elevated text-sand'}`}>
        {KIND_LABEL[p.kind]}
      </span>
    </Link>
  );
}

function WatchRow({ w }: { w: PriceWatch }) {
  const max = w.max_each ? formatMinor(w.max_each) : w.max_each_minor != null ? formatMoney(w.max_each_minor, w.event?.currency) : '';
  const start = w.event ? cardStart(w.event) : '';
  return (
    <Link
      to={`/events/${w.event_id}`}
      className="flex items-center gap-4 rounded-card border border-dashed border-night-border bg-night-deep p-3 transition hover:border-gold/50"
    >
      {start ? <DateBlock iso={start} tz={w.event ? cardTz(w.event) : undefined} /> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-base font-extrabold text-sand">{w.event?.title ?? 'Event'}</div>
        <div className="truncate text-sm text-night-muted">
          {[`${w.qty} × ${w.tier ?? 'ticket'}`, max ? `up to ${max} each` : ''].filter(Boolean).join(' · ')}
        </div>
      </div>
      <span className="rounded-full bg-night-elevated px-2.5 py-1 text-[11px] font-bold text-gold">Waiting</span>
    </Link>
  );
}

/** W1: wallet balances (Cash / Pending / Credits) above the plan list. */
function WalletCard() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  useEffect(() => {
    api.wallet().then((r) => setWallet(r.wallet)).catch(() => setWallet(null));
  }, []);
  if (!wallet) return null;
  const aed = (minor: number) => `AED ${(minor / 100).toFixed(2)}`;
  return (
    <div className="rounded-card border border-night-border/60 bg-night-surface p-4">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-night-muted">Wallet</div>
      <div className="flex gap-6">
        {([
          ['Cash', wallet.cashMinor],
          ['Pending', wallet.pendingMinor],
          ['Credits', wallet.creditsMinor],
        ] as const).map(([label, minor]) => (
          <div key={label}>
            <div className="text-[11px] font-semibold text-night-muted">{label}</div>
            <div className="font-display text-lg font-extrabold text-gold">{aed(minor)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-night-muted">{title}</h2>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

/** Plans (rule I10, `GET /me/plans`): tickets + RSVPs + hosted invites in one
 *  list, unanswered invites on top, price watches as "Waiting". */
export default function PlansPage() {
  const { openHost } = useHost();
  const [data, setData] = useState<PlansResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    api
      .plans()
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load your plans'));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState title="Couldn’t load plans">{error}</EmptyState>
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
  const nothing = !data.waiting_on_you.length && !upcoming.length && !data.waiting.length;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-extrabold text-sand">Plans</h1>
        <Link to="/tickets" className="text-sm font-semibold text-gold">
          Manage tickets
        </Link>
      </div>

      <WalletCard />

      {data.waiting_on_you.length ? (
        <Section title="Waiting on you">
          {data.waiting_on_you.map((inv) => (
            <Link
              key={inv.id ?? inv.code}
              to={`/i/${encodeURIComponent(inv.code ?? '')}`}
              className="flex items-center gap-4 rounded-card border border-gold/60 bg-night-surface p-3"
            >
              {inv.starts_at ? <DateBlock iso={inv.starts_at} tz={inv.tz} /> : null}
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-base font-extrabold text-sand">{inv.title}</div>
                <div className="truncate text-sm text-night-muted">
                  {[inv.host?.name ? `From ${inv.host.name}` : '', venueDateTime(inv.starts_at, inv.tz)].filter(Boolean).join(' · ')}
                </div>
              </div>
              <span className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-night">Reply</span>
            </Link>
          ))}
        </Section>
      ) : null}

      {upcoming.length ? (
        <Section title="Coming up">
          {upcoming.map((p, i) => (
            <Row key={`${p.kind}-${p.event_id ?? p.code ?? i}-${i}`} p={p} />
          ))}
        </Section>
      ) : null}

      {data.waiting.length ? (
        <Section title="Waiting for tickets">
          {data.waiting.map((w) => (
            <WatchRow key={w.id} w={w} />
          ))}
        </Section>
      ) : null}

      {nothing ? (
        <EmptyState title="Nothing planned yet">
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Link to="/" className="rounded-full bg-gold px-5 py-2 text-sm font-bold text-night">
              Find something to do
            </Link>
            <button type="button" onClick={() => openHost()} className="rounded-full bg-night-elevated px-5 py-2 text-sm font-semibold text-sand">
              Host something
            </button>
          </div>
        </EmptyState>
      ) : null}

      {data.past.length ? (
        <div>
          <button type="button" onClick={() => setShowPast((v) => !v)} className="text-sm font-semibold text-night-muted hover:text-sand">
            {showPast ? 'Hide past' : `Past (${data.past.length})`}
          </button>
          {showPast ? (
            <div className="mt-3 space-y-2.5">
              {data.past.map((p, i) => (
                <Row key={`past-${i}`} p={p} muted />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
