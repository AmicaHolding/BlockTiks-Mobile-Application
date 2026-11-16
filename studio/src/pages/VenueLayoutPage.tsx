import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type StudioEvent, type VenueSection } from '../lib/api';
import { Badge, Button, Card, EmptyState, Field, Input } from '../components/ui';

type SectionDraft = {
  id: string;
  name: string;
  price: string;
  capacity: string;
  sold: number;
  available: number;
  reserved: number;
};

function toDraft(section: VenueSection): SectionDraft {
  const sold = section.sold ?? 0;
  const available = section.available ?? Math.max(0, section.capacity - sold);
  const reserved = Math.max(0, section.capacity - sold - available);
  return {
    id: section.id,
    name: section.name,
    price: section.priceCents != null ? (section.priceCents / 100).toString() : '',
    capacity: section.capacity != null ? section.capacity.toString() : '',
    sold,
    available,
    reserved,
  };
}

function newSectionId(): string {
  return `section-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function VenueLayoutPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<StudioEvent | null>(null);
  const [sections, setSections] = useState<SectionDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .event(id)
      .then((res) => {
        if (!active) return;
        setEvent(res.event);
        const source = res.event.venueSections ?? res.event.venueLayout?.sections ?? [];
        setSections(source.map(toDraft));
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

  const totals = useMemo(() => {
    const capacity = sections.reduce((sum, section) => sum + (parseInt(section.capacity, 10) || 0), 0);
    const sold = sections.reduce((sum, section) => sum + section.sold, 0);
    return { capacity, sold };
  }, [sections]);

  function updateSection(index: number, patch: Partial<SectionDraft>) {
    setSections((prev) => prev.map((section, i) => (i === index ? { ...section, ...patch } : section)));
    setSaved('');
  }

  function addSection() {
    setSections((prev) => [
      ...prev,
      {
        id: newSectionId(),
        name: '',
        price: '',
        capacity: '',
        sold: 0,
        available: 0,
        reserved: 0,
      },
    ]);
    setSaved('');
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
    setSaved('');
  }

  async function save() {
    setError('');
    setSaved('');
    if (sections.length === 0) {
      setError('Add at least one venue section');
      return;
    }
    const payload: VenueSection[] = [];
    for (const section of sections) {
      const name = section.name.trim();
      const priceCents = Math.round((parseFloat(section.price) || 0) * 100);
      const capacity = parseInt(section.capacity, 10);
      if (!name) return setError('Every section needs a name');
      if (!Number.isFinite(priceCents) || priceCents < 0) {
        return setError('Section prices must be zero or more');
      }
      if (!Number.isInteger(capacity) || capacity < 1) {
        return setError('Section capacity must be at least 1');
      }
      const minimumCapacity = section.sold + section.reserved;
      if (section.sold + section.reserved > 0 && capacity < minimumCapacity) {
        return setError(
          `${name} capacity cannot be below ${minimumCapacity} sold/reserved seats`,
        );
      }
      payload.push({ id: section.id, name, priceCents, capacity });
    }

    setSaving(true);
    try {
      await api.updateVenueLayout(id, payload);
      const refreshed = await api.event(id);
      setEvent(refreshed.event);
      const source = refreshed.event.venueSections ?? refreshed.event.venueLayout?.sections ?? [];
      setSections(source.map(toDraft));
      setSaved('Venue layout saved. The mobile seated flow now uses these sections.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save venue layout');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <EmptyState title="Loading venue layout…" />;
  if (!event) {
    return <EmptyState title="Event not found">{error || 'Check the link and try again.'}</EmptyState>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            type="button"
            className="text-sm font-semibold text-night-muted hover:text-ink"
            onClick={() => navigate(`/events/${id}`)}
          >
            ← {event.title}
          </button>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-extrabold text-ink">Venue layout</h1>
            <Badge tone={(event.status ?? '').toUpperCase() === 'PUBLISHED' ? 'green' : 'draft'}>
              {(event.status ?? 'draft').toLowerCase()}
            </Badge>
          </div>
          <div className="mt-1 text-sm text-night-muted">
            {event.location || 'Venue TBD'} · {totals.sold.toLocaleString()} sold /{' '}
            {totals.capacity.toLocaleString()} seats
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => navigate(`/events/${id}`)} type="button">
            Back to event
          </Button>
          <Button onClick={save} disabled={saving} type="button">
            {saving ? 'Saving…' : 'Save layout'}
          </Button>
        </div>
      </div>

      {error ? <div className="rounded-xl bg-rumman/10 px-4 py-3 text-sm text-rumman">{error}</div> : null}
      {saved ? <div className="rounded-xl bg-emerald-100 px-4 py-3 text-sm text-emerald-900">{saved}</div> : null}

      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-display text-lg font-bold text-ink">Sections</div>
            <div className="text-sm text-night-muted">
              These powers the mobile map → section → seat-quantity flow for seated events.
            </div>
          </div>
          <Button variant="ghost" onClick={addSection} type="button">
            Add section
          </Button>
        </div>

        {sections.length === 0 ? (
          <EmptyState title="No venue sections yet">
            Add sections to turn this event into a seated venue. Standing GA tiers can stay on the
            ticket-tier flow.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {sections.map((section, index) => {
              const locked = section.sold > 0 || section.reserved > 0;
              return (
                <div
                  key={section.id}
                  className="grid gap-3 rounded-xl bg-dune/50 p-4 lg:grid-cols-[1fr_140px_120px_120px_120px_44px]"
                >
                  <Field label="Section name">
                    <Input
                      value={section.name}
                      onChange={(e) => updateSection(index, { name: e.target.value })}
                      placeholder="Floor A"
                    />
                  </Field>
                  <Field label="Price">
                    <Input
                      inputMode="decimal"
                      value={section.price}
                      onChange={(e) => updateSection(index, { price: e.target.value })}
                      placeholder="195"
                    />
                  </Field>
                  <Field label="Capacity">
                    <Input
                      inputMode="numeric"
                      value={section.capacity}
                      onChange={(e) => updateSection(index, { capacity: e.target.value })}
                      placeholder="200"
                    />
                  </Field>
                  <div className="rounded-xl bg-white/70 px-3 py-2 text-xs text-night-muted">
                    <div className="font-semibold text-ink">{section.sold} sold</div>
                    <div>{section.available} available</div>
                  </div>
                  <div className="rounded-xl bg-white/70 px-3 py-2 text-xs text-night-muted">
                    <div className="font-semibold text-ink">{section.reserved} held</div>
                    <div>min {section.sold + section.reserved}</div>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      className="px-3"
                      onClick={() => removeSection(index)}
                      disabled={locked}
                      type="button"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-6 text-sm text-night-muted">
        <div className="font-semibold text-ink">Inventory note</div>
        <div className="mt-1">
          Existing sections keep their sold and held counters. Sections with sales or pending holds
          cannot be removed, and capacity cannot drop below sold + held seats. Exact seat numbers
          are still assigned at checkout; this editor configures sections and prices.
        </div>
      </Card>
    </div>
  );
}
