import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type CreateEventPayload } from '../lib/api';
import { formatCents, formatDateTime } from '../lib/format';
import { Badge, Button, Card, Field, Input, Select, Textarea } from '../components/ui';

type TierDraft = { name: string; price: string; quantity: string };
const emptyTier: TierDraft = { name: '', price: '', quantity: '' };
const CATEGORIES = ['Concert', 'Sports', 'Theatre', 'Comedy', 'Festival', 'Other'];

function toIso(date: string, time: string): string {
  if (!date || !time) return '';
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
  return Number.isNaN(dt.getTime()) ? '' : dt.toISOString();
}

export default function CreateEventPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('20:00');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [tiers, setTiers] = useState<TierDraft[]>([{ ...emptyTier, name: 'General admission' }]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const startsAt = useMemo(() => toIso(date, time), [date, time]);
  const minPriceCents = useMemo(() => {
    const prices = tiers
      .map((t) => Math.round((parseFloat(t.price) || 0) * 100))
      .filter((p) => p > 0);
    return prices.length ? Math.min(...prices) : null;
  }, [tiers]);

  function updateTier(index: number, patch: Partial<TierDraft>) {
    setTiers((prev) => prev.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  }

  async function save(publish: boolean) {
    setError('');
    if (!title.trim()) return setError('Event name is required');
    if (!startsAt) return setError('Choose a valid date and start time');
    if (!venue.trim()) return setError('Venue is required');

    const validTiers = tiers
      .map((tier) => ({
        name: tier.name.trim(),
        priceCents: Math.round((parseFloat(tier.price) || 0) * 100),
        quantity: parseInt(tier.quantity, 10) || 0,
      }))
      .filter((tier) => tier.name && tier.priceCents > 0 && tier.quantity > 0);
    if (validTiers.length === 0) return setError('Add at least one ticket tier');

    const payload: CreateEventPayload = {
      title: title.trim(),
      description: [titleAr.trim(), description.trim()].filter(Boolean).join('\n\n'),
      category,
      startsAt,
      location: venue.trim(),
      address: address.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      tiers: validTiers,
    };

    setSubmitting(true);
    try {
      const created = await api.createEvent(payload);
      if (publish) await api.publishEvent(created.event.id);
      navigate(`/events/${created.event.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create event');
      setSubmitting(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    save(true);
  }

  return (
    <form className="grid gap-6 lg:grid-cols-[1fr_360px]" onSubmit={submit}>
      <div className="space-y-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-night-muted">For organizers</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">Create event</h1>
        </div>

        <Card className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Event name (English)">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nour Haddad Live" />
            </Field>
            <Field label="Event name (Arabic)">
              <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder="نور حداد — حفل مباشر" dir="rtl" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Category">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Start time">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Venue">
              <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Opera House, Downtown Dubai" />
            </Field>
            <Field label="Address">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" />
            </Field>
          </div>
          <Field label="Cover image URL">
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One night only…" />
          </Field>
          <div className="rounded-xl bg-dune/70 px-4 py-3 text-xs text-night-muted">
            The Arabic name is prepended to the description until the backend stores localized event fields.
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="font-display text-lg font-bold text-ink">Ticket tiers</div>
              <div className="text-sm text-night-muted">Official inventory fans can buy in the app.</div>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setTiers((prev) => [...prev, { ...emptyTier }])}
            >
              Add tier
            </Button>
          </div>
          <div className="space-y-3">
            {tiers.map((tier, index) => (
              <div key={index} className="grid gap-3 rounded-xl bg-dune/50 p-3 md:grid-cols-[1fr_120px_120px_44px]">
                <Input
                  placeholder="Tier name"
                  value={tier.name}
                  onChange={(e) => updateTier(index, { name: e.target.value })}
                />
                <Input
                  placeholder="Price"
                  inputMode="decimal"
                  value={tier.price}
                  onChange={(e) => updateTier(index, { price: e.target.value })}
                />
                <Input
                  placeholder="Qty"
                  inputMode="numeric"
                  value={tier.quantity}
                  onChange={(e) => updateTier(index, { quantity: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="px-3"
                  onClick={() => setTiers((prev) => prev.filter((_, i) => i !== index))}
                  disabled={tiers.length === 1}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {error ? <div className="rounded-xl bg-rumman/10 px-4 py-3 text-sm text-rumman">{error}</div> : null}

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="ghost" disabled={submitting} onClick={() => save(false)}>
            Save draft
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Publishing…' : 'Publish event'}
          </Button>
        </div>
      </div>

      <div>
        <Card className="sticky top-24 overflow-hidden">
          <div className="bg-night p-5 text-sand">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">Live preview</div>
            <div className="mt-3 font-display text-2xl font-extrabold">{title || 'Untitled event'}</div>
            <div className="mt-1 text-sm text-sand/75">
              {startsAt ? formatDateTime(startsAt) : 'Date TBD'} · {venue || 'Venue TBD'}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-sand/70">From</span>
              <span className="font-display text-xl font-bold text-gold">
                {minPriceCents != null ? formatCents(minPriceCents) : '—'}
              </span>
            </div>
          </div>
          <div className="p-5 text-sm text-night-muted">
            Fans see this card in the app. Cover art and category badges appear once an image is set.
          </div>
          <div className="px-5 pb-5">
            <Badge tone="gold">{category}</Badge>
          </div>
        </Card>
      </div>
    </form>
  );
}
