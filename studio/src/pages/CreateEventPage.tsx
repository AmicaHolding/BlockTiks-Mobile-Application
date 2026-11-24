import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type StudioEvent } from '../lib/api';
import { FLAGS } from '../lib/flags';
import { useOrg } from '../lib/org';
import { venueSeatedCapacity, type LocalVenue, type VenueSectionDraft } from '../lib/store';
import { dateTimeToIso, formatEventDate, formatMoney } from '../lib/format';
import {
  Button,
  Card,
  Chip,
  Field,
  Input,
  Select,
  Textarea,
  useToasts,
  ToastHost,
} from '../components/ui';
import VerifyModal from '../components/VerifyModal';

const CATEGORIES = ['Concerts', 'Comedy', 'Festivals', 'Football', 'Theatre'];
const STEPS = ['Details', 'Tickets', 'Promotion', 'Publish'];

interface TierDraft {
  name: string;
  price: string;
  qty: string;
  sectionId?: string;
}

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export default function CreateEventPage() {
  const { org } = useOrg();
  const navigate = useNavigate();
  const { toasts, push } = useToasts();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [savedEventId, setSavedEventId] = useState<string | null>(null);

  // --- step 0: details ---
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('20:00');
  const [venues, setVenues] = useState<LocalVenue[]>([]);
  const [venueId, setVenueId] = useState('');
  const [newVenue, setNewVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueKind, setNewVenueKind] = useState<'ga' | 'seated'>('ga');
  const [newVenueCap, setNewVenueCap] = useState('500');
  const [category, setCategory] = useState('Concerts');
  const [about, setAbout] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const coverInput = useRef<HTMLInputElement>(null);

  // --- step 1: tickets ---
  const [tiers, setTiers] = useState<TierDraft[]>([{ name: '', price: '', qty: '' }]);

  // --- step 2: promotion ---
  const [resale, setResale] = useState(true);
  const [resaleCapPct, setResaleCapPct] = useState<number>(FLAGS.decision8_maxResaleCapPct);
  const [promoCode, setPromoCode] = useState('');
  const [promoOff, setPromoOff] = useState('15');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load venues for this org: locally saved + derived from existing events.
  useEffect(() => {
    if (!org) return;
    api
      .myEvents()
      .then(({ events }) => {
        events.forEach((e) => api.upsertVenueFromEvent(org.id, e));
      })
      .catch(() => undefined)
      .finally(() => setVenues(api.venues(org.id)));
  }, [org]);

  const venue: LocalVenue | null = useMemo(() => {
    if (newVenue) {
      if (!newVenueName.trim()) return null;
      return {
        id: 'new',
        orgId: org?.id ?? '',
        name: newVenueName.trim(),
        kind: newVenueKind,
        capacity: Number(newVenueCap) || 0,
        timezone: 'Asia/Dubai',
        sections: [],
      };
    }
    return venues.find((v) => v.id === venueId) ?? null;
  }, [newVenue, newVenueName, newVenueKind, newVenueCap, venues, venueId, org]);

  const venueCap = venue ? venueSeatedCapacity(venue) : 0;
  const tiersTotal = tiers.reduce((a, t) => a + (Number(t.qty) || 0), 0);

  function pickVenue(id: string) {
    setVenueId(id);
    setNewVenue(false);
    const v = venues.find((x) => x.id === id);
    // Seated venue: one tier per section, quantities come from the layout.
    if (v?.kind === 'seated' && v.sections.length > 0) {
      setTiers(
        v.sections.map((s) => ({
          name: s.name,
          price: String((s.priceMinor || 0) / 100 || 200),
          qty: String(s.rows * s.seatsPerRow),
          sectionId: s.id,
        })),
      );
    }
  }

  function next() {
    if (step === 0) {
      const e: Record<string, string> = {};
      if (!title.trim()) e.title = 'Give the event a name.';
      if (!date) e.date = 'Pick a date and time.';
      if (!venue) e.venue = newVenue ? 'Name the venue.' : 'Pick a venue.';
      setErrors(e);
      if (Object.keys(e).length) return;
    }
    if (step === 1) {
      const e: Record<string, string> = {};
      if (tiers.length === 0 || tiers.some((t) => !t.name.trim() || !t.price || !t.qty || Number(t.qty) <= 0)) {
        e.tiers = 'Every ticket needs a name, price and quantity.';
      } else if (venue && venueCap > 0 && tiersTotal > venueCap) {
        e.tiers = `Tiers add up to ${tiersTotal.toLocaleString()} but ${venue.name} holds ${venueCap.toLocaleString()}.`;
      }
      setErrors(e);
      if (Object.keys(e).length) return;
    }
    setErrors({});
    setStep((s) => Math.min(3, s + 1));
  }

  async function finish(publish: boolean) {
    if (!org || !venue) return;
    setBusy(true);
    try {
      const startsAt = dateTimeToIso(date, time, venue.timezone);
      // Persist a locally-created venue so it shows in the picker next time.
      let savedVenue = venue;
      if (newVenue) {
        savedVenue = api.saveVenue(org.id, { ...venue, id: uid('ven'), sourceEventId: undefined });
      }
      const tierPayload = tiers.map((t) => ({
        name: t.name.trim(),
        priceCents: Math.round(parseFloat(t.price) * 100),
        quantity: Number(t.qty),
      }));
      const res = await api.createEvent({
        title: title.trim(),
        description: about.trim(),
        category,
        startsAt,
        location: savedVenue.name,
        imageUrl: /^https?:\/\//.test(coverPreview) ? coverPreview : undefined,
        currency: org.currency,
        tiers: tierPayload,
      });
      const evt = res.event as StudioEvent;

      // Seated venue → mirror its sections onto the event layout (real PATCH).
      if (savedVenue.kind === 'seated' && savedVenue.sections.length > 0) {
        const sections = savedVenue.sections.map((s: VenueSectionDraft) => ({
          id: s.id,
          name: s.name,
          priceCents: s.priceMinor,
          capacity: s.rows * s.seatsPerRow,
          rows: s.rows,
          seatsPerRow: s.seatsPerRow,
          accessibleCount: s.accessibleCount,
          heldCount: s.heldCount,
        }));
        await api.updateVenueLayout(evt.id, sections).catch(() => undefined);
      }

      // Studio event meta the backend doesn't persist yet (resale flag/cap,
      // pending publish) · TODO(api-gap): PATCH /events/{id} fields.
      api.setEventMeta(evt.id, {
        resaleEnabled: resale,
        resaleCapPct: resaleCapPct,
        pendingPublish: publish && org.verificationStatus !== 'approved',
      });
      api.eventHosts(evt.id, org.id, org.name);

      // Optional launch promo, real endpoint, event-scoped.
      if (promoCode.trim()) {
        const code = promoCode.trim().toUpperCase();
        try {
          await api.createPromo({
            code,
            percentOff: Math.min(100, Math.max(1, Number(promoOff) || 0)),
            scope: 'EVENT',
            eventId: evt.id,
            validOnResale: resale,
          });
        } catch {
          push(`Event saved, but code ${code} didn't stick. Add it from Promo codes.`, 'danger');
        }
      }

      const canPublish =
        publish &&
        org.verificationStatus === 'approved' &&
        api.eventHosts(evt.id, org.id, org.name).every((h) => h.status !== 'proposed');

      if (publish && org.verificationStatus === 'none') {
        // Stay on this screen while the verify modal is open, the draft is
        // already saved, so closing the modal lands on its manage page.
        setSavedEventId(evt.id);
        setVerifyOpen(true);
        push('Saved as a draft. Verify your organisation to publish.');
        return;
      }
      if (publish && org.verificationStatus === 'submitted') {
        push('Saved. Publishes automatically once verification is approved.');
        navigate(`/events/${evt.id}`);
        return;
      }
      if (publish && !canPublish && org.verificationStatus === 'approved') {
        push('Splits need everyone to accept before you publish.', 'danger');
        navigate(`/events/${evt.id}`);
        return;
      }
      if (publish && canPublish) {
        await api.publishEvent(evt.id);
        api.setEventMeta(evt.id, { pendingPublish: false });
        push("Live. First ticket's the best one.");
        navigate(`/events/${evt.id}`);
        return;
      }
      push('Saved as a draft.');
      navigate(`/events/${evt.id}`);
    } catch (err) {
      push(err instanceof Error ? err.message : 'Could not save the event.', 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col gap-2">
              <span
                className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                  i === step ? 'text-ink' : 'text-ink/35'
                }`}
              >
                {i + 1}. {s}
              </span>
              <span
                className={`h-1 rounded-full ${
                  i < step ? 'bg-ink' : i === step ? 'bg-gold' : 'bg-dune'
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {step === 0 ? (
        <Card title="Details">
          <div className="space-y-5">
            <Field label="Event name" error={errors.title}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Dune Nights with Vasil"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date" error={errors.date}>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Doors open" hint="Venue local time (Asia/Dubai).">
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
            </div>
            <Field label="Venue" error={errors.venue}>
              {!newVenue ? (
                <Select value={venueId} onChange={(e) => pickVenue(e.target.value)}>
                  <option value="">Pick a venue…</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.kind === 'seated' ? 'seated' : 'standing'})
                    </option>
                  ))}
                  <option value="__new__" disabled>or use "New venue" below</option>
                </Select>
              ) : null}
              {!newVenue ? (
                <button
                  type="button"
                  onClick={() => {
                    setNewVenue(true);
                    setVenueId('');
                  }}
                  className="mt-2 text-xs font-semibold text-ink underline underline-offset-2 hover:text-night"
                >
                  + New venue
                </button>
              ) : (
                <div className="mt-2 space-y-3 rounded-lg border border-dune bg-sand p-4">
                  <Input
                    value={newVenueName}
                    onChange={(e) => setNewVenueName(e.target.value)}
                    placeholder="Venue name"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip selected={newVenueKind === 'ga'} onClick={() => setNewVenueKind('ga')}>
                      Standing
                    </Chip>
                    <Chip
                      selected={newVenueKind === 'seated'}
                      onClick={() => setNewVenueKind('seated')}
                    >
                      Seated
                    </Chip>
                    {newVenueKind === 'ga' ? (
                      <span className="ml-2 flex items-center gap-2 text-xs text-ink/60">
                        Capacity
                        <Input
                          className="!w-24"
                          value={newVenueCap}
                          onChange={(e) => setNewVenueCap(e.target.value.replace(/\D/g, ''))}
                        />
                      </span>
                    ) : (
                      <span className="ml-2 text-xs text-ink/50">
                        Build the sections in Venues after this saves.
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewVenue(false)}
                    className="text-xs font-semibold text-ink/50 hover:text-ink"
                  >
                    Choose an existing venue
                  </button>
                </div>
              )}
            </Field>
            <Field label="Category">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field
              label="Cover image"
              hint="16:9. Stored once the upload endpoint ships, for now it previews here."
            >
              {/* TODO(api-gap): cover upload endpoint · POST /uploads or PUT
                  /events/{id}/cover. We keep a local preview only. */}
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                className="flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-ink/25 bg-sand text-sm text-ink/45 hover:border-ink/40"
              >
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
                ) : (
                  'Drop a cover image (16:9)'
                )}
              </button>
              <input
                ref={coverInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setCoverPreview(URL.createObjectURL(f));
                }}
              />
            </Field>
            <Field label="About" hint="Fans see this on the event page.">
              <Textarea
                rows={4}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="What's the night about? Lineup, dress code, age limit…"
              />
            </Field>
          </div>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card title="Tickets">
          {venue ? (
            <div className="mb-4 flex items-center gap-3 text-sm text-ink/60">
              <span>
                {venue.name} holds <strong className="text-ink tabular-nums">{venueCap.toLocaleString()}</strong>
                {venue.kind === 'seated' ? ' seats' : ''}
              </span>
              <span className="text-ink/30">·</span>
              <span>
                Tiers total <strong className="text-ink tabular-nums">{tiersTotal.toLocaleString()}</strong>
              </span>
            </div>
          ) : null}
          {venue?.kind === 'seated' && venue.sections.length > 0 ? (
            <p className="mb-4 rounded-lg border border-dune bg-sand px-4 py-3 text-sm text-ink/60">
              Seated venue, one tier per section, quantities come from the layout.
            </p>
          ) : null}
          <div className="space-y-3">
            {tiers.map((t, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-dune bg-sand/50 p-3">
                <Input
                  className="flex-1"
                  placeholder={i === 0 ? 'General admission' : 'Tier name'}
                  value={t.name}
                  onChange={(e) =>
                    setTiers((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                />
                <div className="w-28">
                  <Input
                    placeholder="Price"
                    inputMode="decimal"
                    value={t.price}
                    onChange={(e) =>
                      setTiers((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, price: e.target.value.replace(/[^\d.]/g, '') } : x)),
                      )
                    }
                  />
                </div>
                <div className="w-24">
                  <Input
                    placeholder="Qty"
                    inputMode="numeric"
                    disabled={Boolean(t.sectionId)}
                    value={t.qty}
                    onChange={(e) =>
                      setTiers((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, qty: e.target.value.replace(/\D/g, '') } : x)),
                      )
                    }
                  />
                </div>
                <button
                  type="button"
                  aria-label="Remove tier"
                  onClick={() => setTiers((prev) => prev.filter((_, j) => j !== i))}
                  className="rounded-full p-1.5 text-ink/35 hover:bg-rumman/10 hover:text-rumman"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTiers((prev) => [...prev, { name: '', price: '', qty: '' }])}
            className="mt-3 text-sm font-semibold text-ink underline underline-offset-2 hover:text-night"
          >
            + Add a tier
          </button>
          {errors.tiers ? <p className="mt-3 text-sm font-medium text-rumman">{errors.tiers}</p> : null}
          <p className="mt-4 text-xs text-ink/45">
            Fans pay in {org?.currency?.toUpperCase() ?? 'AED'} at all-in prices.
          </p>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card title="Promotion">
          <div className="space-y-6">
            <Field label="Resale">
              <div className="flex gap-2">
                <Chip selected={resale} onClick={() => setResale(true)}>
                  Allowed
                </Chip>
                <Chip selected={!resale} onClick={() => setResale(false)}>
                  Blocked
                </Chip>
              </div>
            </Field>
            {resale ? (
              <>
                {/* TODO(decision-8): cap ceiling is face x1.10, organiser can
                    lower it but not raise it. */}
                <Field label="Resale price cap" hint="Sellers can't list above this.">
                  <div className="flex gap-2">
                    {[0, 5, FLAGS.decision8_maxResaleCapPct]
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .map((v) => (
                        <Chip key={v} selected={resaleCapPct === v} onClick={() => setResaleCapPct(v)}>
                          +{v}%
                        </Chip>
                      ))}
                  </div>
                </Field>
                <p className="rounded-lg border border-dune bg-sand px-4 py-3 text-sm text-ink/60">
                  Resale buyers pay the all-in price (7% inside); sellers keep their full listing.
                </p>
              </>
            ) : null}
            <Field label="Launch promo code" hint="Optional, goes live with the event.">
              <div className="flex items-center gap-3">
                <Input
                  className="w-48 uppercase"
                  placeholder="LAUNCH15"
                  value={promoCode}
                  onChange={(e) =>
                    setPromoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))
                  }
                />
                <span className="flex items-center gap-2 text-sm text-ink/60">
                  <Input
                    className="!w-20"
                    inputMode="numeric"
                    value={promoOff}
                    onChange={(e) => setPromoOff(e.target.value.replace(/\D/g, ''))}
                  />
                  % off
                </span>
              </div>
            </Field>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card title="Publish">
          <div className="rounded-xl border border-dune bg-sand p-5">
            <h3 className="font-display text-xl font-bold text-night">{title || '-'}</h3>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <ReviewRow label="Date" value={date ? formatEventDate(dateTimeToIso(date, time)) : '-'} />
              <ReviewRow label="Venue" value={venue?.name ?? '-'} />
              <ReviewRow label="Category" value={category} />
              <ReviewRow label="Resale" value={resale ? `On, cap +${resaleCapPct}%` : 'Blocked'} />
              <ReviewRow label="Capacity" value={`${tiersTotal.toLocaleString()} tickets`} />
              <ReviewRow
                label="Cheapest"
                value={formatMoney(
                  Math.min(...tiers.map((t) => Math.round(parseFloat(t.price || '0') * 100) || 0)),
                  org?.currency,
                )}
              />
            </div>
          </div>

          {org?.verificationStatus !== 'approved' ? (
            <div className="mt-4 rounded-xl border border-gold/50 bg-gold/10 p-4 text-sm leading-relaxed text-ink/70">
              {org?.verificationStatus === 'submitted'
                ? 'Your verification is still in review. This saves as a draft and publishes automatically once you are approved.'
                : 'Your organisation is not verified yet. This saves as a draft, publish unlocks after verification.'}
            </div>
          ) : null}

          <p className="mt-5 text-sm leading-relaxed text-ink/55">
            Publishing puts it on sahra.app immediately. You'll still see it here.
          </p>
        </Card>
      ) : null}

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => (step === 0 ? navigate('/events') : setStep((s) => s - 1))}
        >
          Back
        </Button>
        {step < 3 ? (
          <Button onClick={next}>Continue</Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" loading={busy} onClick={() => finish(false)}>
              Save draft
            </Button>
            <Button variant="danger" loading={busy} onClick={() => finish(true)}>
              Publish event
            </Button>
          </div>
        )}
      </div>

      <VerifyModal
        open={verifyOpen}
        onClose={() => {
          setVerifyOpen(false);
          if (savedEventId) navigate(`/events/${savedEventId}`);
        }}
        onSubmitted={() => push('Verification submitted. We\'ll email you once it\'s checked.')}
      />
      <ToastHost toasts={toasts} />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
      <p className="mt-0.5 font-medium text-ink">{value}</p>
    </div>
  );
}
