import { useEffect, useMemo, useState } from 'react';
import { api, ApiError, type PromoCode, type PromoCodeInput, type StudioEvent } from '../lib/api';
import { useOrg } from '../lib/org';
import { formatMoney } from '../lib/format';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
  ToastHost,
  useToasts,
} from '../components/ui';

type Filter = 'all' | 'active' | 'scheduled' | 'ended';

interface Draft {
  code: string;
  mode: 'percent' | 'amount';
  percent: string;
  amount: string;
  scope: 'all' | 'event';
  eventId: string;
  maxUses: string;
  perUser: string;
  startsAt: string;
  endsAt: string;
  appliesToResale: boolean;
  firstOrderOnly: boolean;
}

const EMPTY_DRAFT: Draft = {
  code: '',
  mode: 'percent',
  percent: '15',
  amount: '',
  scope: 'all',
  eventId: '',
  maxUses: '',
  perUser: '',
  startsAt: '',
  endsAt: '',
  appliesToResale: false,
  firstOrderOnly: false,
};

export default function PromoCodesPage() {
  const { org } = useOrg();
  const { toasts, push } = useToasts();
  const [promos, setPromos] = useState<PromoCode[] | null>(null);
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.promos().then(({ promos }) => setPromos(promos)).catch(() => setPromos([]));
    api.myEvents().then(({ events }) => setEvents(events)).catch(() => undefined);
  };

  useEffect(load, []);

  const now = Date.now();
  const status = (p: PromoCode): 'active' | 'scheduled' | 'ended' => {
    if (p.expiresAt && new Date(p.expiresAt).getTime() < now) return 'ended';
    if (p.endsAt && new Date(p.endsAt).getTime() < now) return 'ended';
    if (p.startsAt && new Date(p.startsAt).getTime() > now) return 'scheduled';
    if (!p.active) return 'ended';
    return 'active';
  };

  const filtered = useMemo(
    () => (promos ?? []).filter((p) => filter === 'all' || status(p) === filter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [promos, filter],
  );

  const eventName = (id?: string) => events.find((e) => e.id === id)?.title ?? 'All events';

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  async function create() {
    const e: Record<string, string> = {};
    const code = draft.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) e.code = '4-12 letters or numbers.';
    if ((promos ?? []).some((p) => p.code.toUpperCase() === code)) e.code = 'That code is taken.';
    if (draft.mode === 'percent') {
      const v = Number(draft.percent);
      if (!v || v < 1 || v > 100) e.percent = '1-100%.';
    } else {
      const v = Math.round(parseFloat(draft.amount || '0') * 100);
      if (!v || v <= 0) e.amount = 'Add an amount.';
    }
    if (draft.scope === 'event' && !draft.eventId) e.eventId = 'Pick an event.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    const payload: PromoCodeInput = {
      code,
      scope: draft.scope === 'event' ? 'EVENT' : 'ALL',
      eventId: draft.scope === 'event' ? draft.eventId : undefined,
      maxUses: draft.maxUses ? Number(draft.maxUses) : undefined,
      maxUsesPerUser: draft.perUser ? Number(draft.perUser) : undefined,
      startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : undefined,
      endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : undefined,
      validOnResale: draft.appliesToResale,
      firstOrderOnly: draft.firstOrderOnly || undefined,
      active: true,
    };
    if (draft.mode === 'percent') {
      payload.kind = 'PERCENT';
      payload.percentOff = Number(draft.percent);
    } else {
      payload.kind = 'FIXED';
      payload.amountOffCents = Math.round(parseFloat(draft.amount) * 100);
    }
    try {
      await api.createPromo(payload);
      push(`Code ${code} is live.`);
      setOpen(false);
      setDraft(EMPTY_DRAFT);
      load();
    } catch (err) {
      if (err instanceof ApiError && /taken|exists|conflict/i.test(err.message)) {
        setErrors({ code: 'That code is taken.' });
      } else {
        push(err instanceof Error ? err.message : 'Could not create the code.', 'danger');
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggle(p: PromoCode) {
    try {
      await api.updatePromo(p.code, { active: !p.active });
      load();
    } catch (err) {
      push(err instanceof Error ? err.message : 'Update failed.', 'danger');
    }
  }

  return (
    <div>
      <PageHeader
        title="Promo codes"
        action={<Button onClick={() => setOpen(true)}>+ New code</Button>}
      />

      <div className="mb-5 flex gap-2">
        {(['all', 'active', 'scheduled', 'ended'] as Filter[]).map((f) => (
          <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)}
          </Chip>
        ))}
      </div>

      {promos === null ? (
        <LoadingBlock />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No codes yet"
          body="Codes give buyers money off at checkout. They only work on official tickets unless you allow resale."
          action={<Button onClick={() => setOpen(true)}>+ New code</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-dune bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dune text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/40">
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Off</th>
                <th className="px-5 py-3">Applies to</th>
                <th className="px-5 py-3">Used</th>
                <th className="px-5 py-3">Resale</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-dune/70">
              {filtered.map((p) => {
                const st = status(p);
                return (
                  <tr key={p.code} className="hover:bg-sand/40">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold tracking-wider text-ink">
                      {p.code}
                    </td>
                    <td className="px-5 py-3.5 text-ink/70">
                      {p.kind === 'FIXED'
                        ? formatMoney(p.amountOffCents ?? 0, org?.currency)
                        : `${p.percentOff ?? p.value ?? 0}%`}
                    </td>
                    <td className="max-w-[180px] truncate px-5 py-3.5 text-ink/70">
                      {p.scope === 'ALL' ? 'All your events' : `${eventName(p.eventId)}${p.tierName ? ` · ${p.tierName}` : ''}`}
                    </td>
                    <td className="px-5 py-3.5 text-ink/70 tabular-nums">
                      {p.usedCount}
                      {p.maxUses ? `/${p.maxUses}` : ''}
                    </td>
                    <td className="px-5 py-3.5">
                      {p.validOnResale ? (
                        <Badge tone="outline">Yes</Badge>
                      ) : (
                        <span className="text-xs text-ink/40">Official only</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        tone={st === 'active' ? 'gold' : st === 'scheduled' ? 'outline' : 'default'}
                        className="capitalize"
                      >
                        {st}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => toggle(p)}
                        className="text-xs font-semibold text-ink/50 underline underline-offset-2 hover:text-ink"
                      >
                        {p.active ? 'Turn off' : 'Turn on'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create panel, frame 44 */}
      {open ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-night/40" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-sand p-7 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-night">New promo code</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full p-1.5 text-ink/40 hover:bg-ink/5"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="space-y-5">
              <Field label="Code" error={errors.code} hint="4-12 letters or numbers.">
                <div className="flex gap-2">
                  <Input
                    className="flex-1 font-mono uppercase"
                    placeholder="DESERT10"
                    value={draft.code}
                    onChange={(e) =>
                      set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))
                    }
                  />
                  <Button
                    variant="outline"
                    small
                    onClick={() =>
                      set('code', Math.random().toString(36).slice(2, 8).toUpperCase().replace(/[^A-Z0-9]/g, 'X'))
                    }
                  >
                    Generate
                  </Button>
                </div>
              </Field>

              <Field label="Discount">
                <div className="flex gap-2">
                  <Chip selected={draft.mode === 'percent'} onClick={() => set('mode', 'percent')}>
                    %
                  </Chip>
                  <Chip selected={draft.mode === 'amount'} onClick={() => set('mode', 'amount')}>
                    {org?.currency?.toUpperCase() ?? 'AED'}
                  </Chip>
                  {draft.mode === 'percent' ? (
                    <Input
                      className="w-24"
                      inputMode="numeric"
                      value={draft.percent}
                      onChange={(e) => set('percent', e.target.value.replace(/\D/g, ''))}
                    />
                  ) : (
                    <Input
                      className="w-28"
                      inputMode="decimal"
                      placeholder="50"
                      value={draft.amount}
                      onChange={(e) => set('amount', e.target.value.replace(/[^\d.]/g, ''))}
                    />
                  )}
                </div>
                {errors.percent ? <p className="mt-1.5 text-xs font-medium text-rumman">{errors.percent}</p> : null}
                {errors.amount ? <p className="mt-1.5 text-xs font-medium text-rumman">{errors.amount}</p> : null}
              </Field>

              <Field label="Applies to" error={errors.eventId}>
                <div className="flex gap-2">
                  <Chip selected={draft.scope === 'all'} onClick={() => set('scope', 'all')}>
                    All events
                  </Chip>
                  <Chip selected={draft.scope === 'event'} onClick={() => set('scope', 'event')}>
                    One event
                  </Chip>
                </div>
                {draft.scope === 'event' ? (
                  <Select
                    className="mt-3"
                    value={draft.eventId}
                    onChange={(e) => set('eventId', e.target.value)}
                  >
                    <option value="">Pick an event…</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </Select>
                ) : null}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Total uses" hint="Blank = unlimited">
                  <Input
                    inputMode="numeric"
                    value={draft.maxUses}
                    onChange={(e) => set('maxUses', e.target.value.replace(/\D/g, ''))}
                  />
                </Field>
                <Field label="Per person" hint="Blank = unlimited">
                  <Input
                    inputMode="numeric"
                    value={draft.perUser}
                    onChange={(e) => set('perUser', e.target.value.replace(/\D/g, ''))}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Starts">
                  <Input
                    type="datetime-local"
                    value={draft.startsAt}
                    onChange={(e) => set('startsAt', e.target.value)}
                  />
                </Field>
                <Field label="Ends">
                  <Input
                    type="datetime-local"
                    value={draft.endsAt}
                    onChange={(e) => set('endsAt', e.target.value)}
                  />
                </Field>
              </div>

              <label className="flex items-start gap-3 text-sm text-ink/70">
                <input
                  type="checkbox"
                  checked={draft.appliesToResale}
                  onChange={(e) => set('appliesToResale', e.target.checked)}
                  className="mt-1 h-4 w-4 accent-gold"
                />
                <span>
                  <span className="font-semibold text-ink">Also works on resale tickets</span>
                  <span className="block text-xs text-ink/45">
                    Otherwise it's official tickets only.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-ink/70">
                <input
                  type="checkbox"
                  checked={draft.firstOrderOnly}
                  onChange={(e) => set('firstOrderOnly', e.target.checked)}
                  className="mt-1 h-4 w-4 accent-gold"
                />
                <span className="font-semibold text-ink">First order only</span>
              </label>

              <Button onClick={create} loading={busy}>
                Create code
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastHost toasts={toasts} />
    </div>
  );
}
