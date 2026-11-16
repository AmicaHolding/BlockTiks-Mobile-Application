import { useEffect, useMemo, useState } from 'react';
import { api, type PromoCode, type PromoCodeInput, type StudioEvent } from '../lib/api';
import { formatCents, formatDate } from '../lib/format';
import { Badge, Button, Card, EmptyState, Field, Input, Select } from '../components/ui';

type FilterKey = 'active' | 'scheduled' | 'ended';

function promoStatus(promo: PromoCode): FilterKey {
  const now = Date.now();
  const endsAt = promo.endsAt ?? promo.expiresAt;
  if (!promo.active || (endsAt && new Date(endsAt).getTime() <= now)) return 'ended';
  if (promo.startsAt && new Date(promo.startsAt).getTime() > now) return 'scheduled';
  return 'active';
}

function discountLabel(promo: PromoCode): string {
  if (promo.percentOff != null || promo.kind === 'PERCENT') {
    return `${promo.percentOff ?? promo.value ?? 0}%`;
  }
  return formatCents(promo.amountOffCents ?? promo.value);
}

function appliesTo(promo: PromoCode, events: StudioEvent[]): string {
  if (promo.scope === 'EVENT' && promo.eventId) {
    return events.find((event) => event.id === promo.eventId)?.title ?? 'Selected event';
  }
  if (promo.scope === 'TIER') return promo.tierName ? `Tier · ${promo.tierName}` : 'Selected tier';
  return 'All events · all tiers';
}

function toIsoDate(value: string): string | undefined {
  return value ? `${value}T00:00:00.000Z` : undefined;
}

export default function PromoCodesPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('active');
  const [form, setForm] = useState({
    code: '',
    kind: 'PERCENT' as 'PERCENT' | 'FIXED',
    value: '',
    scope: 'ALL' as 'ALL' | 'EVENT' | 'TIER',
    eventId: '',
    tierName: '',
    maxUses: '',
    maxUsesPerUser: '',
    startsAt: '',
    endsAt: '',
    validOnResale: false,
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [promoRes, eventRes] = await Promise.all([
        api.promos(),
        api.myEvents().catch(() => ({ events: [] as StudioEvent[] })),
      ]);
      setPromos(promoRes.promos ?? []);
      setEvents(eventRes.events ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load promo codes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const counts = useMemo(() => {
    const result = { active: 0, scheduled: 0, ended: 0 };
    for (const promo of promos) result[promoStatus(promo)] += 1;
    return result;
  }, [promos]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return promos.filter((promo) => {
      if (promoStatus(promo) !== filter) return false;
      if (!q) return true;
      return (
        promo.code.toLowerCase().includes(q) ||
        appliesTo(promo, events).toLowerCase().includes(q) ||
        discountLabel(promo).toLowerCase().includes(q)
      );
    });
  }, [promos, events, query, filter]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function createPromo() {
    setFormError('');
    const value = Number(form.value);
    if (!form.code.trim()) return setFormError('Code is required');
    if (!value || value <= 0) return setFormError('Enter a positive discount value');
    if (form.kind === 'PERCENT' && value > 100) return setFormError('Percent cannot exceed 100');
    setSaving(true);
    try {
      const payload: PromoCodeInput = {
        code: form.code,
        kind: form.kind,
        value: form.kind === 'FIXED' ? Math.round(value * 100) : value,
        scope: form.scope,
        eventId: form.scope === 'EVENT' ? form.eventId || undefined : undefined,
        tierName: form.scope === 'TIER' ? form.tierName || undefined : undefined,
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        maxUsesPerUser: form.maxUsesPerUser ? Number(form.maxUsesPerUser) : undefined,
        startsAt: toIsoDate(form.startsAt),
        endsAt: toIsoDate(form.endsAt),
        validOnResale: form.validOnResale,
        active: true,
      };
      await api.createPromo(payload);
      setForm({
        code: '',
        kind: 'PERCENT',
        value: '',
        scope: 'ALL',
        eventId: '',
        tierName: '',
        maxUses: '',
        maxUsesPerUser: '',
        startsAt: '',
        endsAt: '',
        validOnResale: false,
      });
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not create code');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(promo: PromoCode) {
    try {
      await api.updatePromo(promo.code, { active: !promo.active });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update code');
    }
  }

  async function removePromo(promo: PromoCode) {
    if (!window.confirm(`Delete promo code ${promo.code}?`)) return;
    try {
      await api.deletePromo(promo.code);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete code');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-night-muted">Studio</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">Promo codes</h1>
          <p className="mt-2 text-sm text-night-muted">
            {counts.active} active · {counts.scheduled} scheduled · {counts.ended} ended
          </p>
        </div>
        <Badge tone="gold">Sales through codes are not metered yet</Badge>
      </div>

      {error ? <Card className="border-rumman/40 p-4 text-sm text-rumman">{error}</Card> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-full bg-dune p-1 text-sm font-semibold">
              {(['active', 'scheduled', 'ended'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-full px-4 py-1.5 capitalize transition ${
                    filter === item ? 'bg-night text-sand' : 'text-ink'
                  }`}
                >
                  {item} {counts[item]}
                </button>
              ))}
            </div>
            <Input
              className="w-full max-w-xs"
              placeholder="Search codes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.14em] text-night-muted">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Code</th>
                  <th className="py-3 pr-4 font-semibold">Discount</th>
                  <th className="py-3 pr-4 font-semibold">Applies to</th>
                  <th className="py-3 pr-4 font-semibold">Uses</th>
                  <th className="py-3 pr-4 font-semibold">Sales</th>
                  <th className="py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-night-border/30">
                {loading ? (
                  <tr>
                    <td className="py-8 text-center text-night-muted" colSpan={6}>
                      Loading promo codes…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState title="No promo codes">Create a code to discount tickets across your events.</EmptyState>
                    </td>
                  </tr>
                ) : (
                  filtered.map((promo) => {
                    const status = promoStatus(promo);
                    const maxUses = promo.maxUses ?? 0;
                    const pct = maxUses ? Math.min(100, (promo.usedCount / maxUses) * 100) : 0;
                    return (
                      <tr key={promo.code} className="align-top">
                        <td className="py-4 pr-4">
                          <div className="font-bold tracking-[0.08em] text-night">{promo.code}</div>
                          <div className="text-xs text-night-muted">
                            {promo.endsAt ?? promo.expiresAt ? `Ends ${formatDate(promo.endsAt ?? promo.expiresAt)}` : 'No end date'}
                          </div>
                        </td>
                        <td className="py-4 pr-4 font-semibold text-ink">{discountLabel(promo)}</td>
                        <td className="py-4 pr-4 text-ink/80">{appliesTo(promo, events)}</td>
                        <td className="py-4 pr-4">
                          <div className="text-ink/80">
                            {promo.usedCount.toLocaleString()}
                            {maxUses ? ` / ${maxUses.toLocaleString()}` : ''}
                          </div>
                          <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-dune">
                            <div className="h-full rounded-full bg-night" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-ink/80">—</td>
                        <td className="py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={status === 'active' ? 'green' : status === 'scheduled' ? 'gold' : 'neutral'}>
                              {status}
                            </Badge>
                            <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => void toggleActive(promo)} type="button">
                              {promo.active ? 'Disable' : 'Enable'}
                            </Button>
                            <Button variant="ghost" className="px-3 py-1.5 text-xs text-rumman" onClick={() => void removePromo(promo)} type="button">
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="h-fit p-5 xl:sticky xl:top-24">
          <div className="font-display text-lg font-bold text-ink">New code</div>
          <div className="mt-4 space-y-4">
            <Field label="Code">
              <Input
                value={form.code}
                onChange={(e) => setField('code', e.target.value.toUpperCase())}
                placeholder="RAMADAN26"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount type">
                <Select value={form.kind} onChange={(e) => setField('kind', e.target.value as 'PERCENT' | 'FIXED')}>
                  <option value="PERCENT">%</option>
                  <option value="FIXED">AED</option>
                </Select>
              </Field>
              <Field label={form.kind === 'PERCENT' ? 'Percent' : 'Amount (AED)'}>
                <Input
                  type="number"
                  min="0"
                  value={form.value}
                  onChange={(e) => setField('value', e.target.value)}
                  placeholder={form.kind === 'PERCENT' ? '15' : '50'}
                />
              </Field>
            </div>
            <Field label="Applies to">
              <Select value={form.scope} onChange={(e) => setField('scope', e.target.value as typeof form.scope)}>
                <option value="ALL">All events · all tiers</option>
                <option value="EVENT">Specific event</option>
                <option value="TIER">Specific tier</option>
              </Select>
            </Field>
            {form.scope === 'EVENT' ? (
              <Field label="Event">
                <Select value={form.eventId} onChange={(e) => setField('eventId', e.target.value)}>
                  <option value="">Choose event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            {form.scope === 'TIER' ? (
              <Field label="Tier name">
                <Input value={form.tierName} onChange={(e) => setField('tierName', e.target.value)} placeholder="Golden Circle" />
              </Field>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Total uses">
                <Input type="number" min="1" value={form.maxUses} onChange={(e) => setField('maxUses', e.target.value)} placeholder="500" />
              </Field>
              <Field label="Per person">
                <Input type="number" min="1" value={form.maxUsesPerUser} onChange={(e) => setField('maxUsesPerUser', e.target.value)} placeholder="1" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts">
                <Input type="date" value={form.startsAt} onChange={(e) => setField('startsAt', e.target.value)} />
              </Field>
              <Field label="Ends">
                <Input type="date" value={form.endsAt} onChange={(e) => setField('endsAt', e.target.value)} />
              </Field>
            </div>
            <label className="flex items-start gap-3 text-sm text-ink/80">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-night"
                checked={form.validOnResale}
                onChange={(e) => setField('validOnResale', e.target.checked)}
              />
              <span>
                Also valid on resale tickets
                <span className="block text-xs text-night-muted">Organizer covers the discount</span>
              </span>
            </label>
            {formError ? <div className="text-sm text-rumman">{formError}</div> : null}
            <Button className="w-full" disabled={saving} onClick={() => void createPromo()} type="button">
              {saving ? 'Creating…' : 'Create code'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
