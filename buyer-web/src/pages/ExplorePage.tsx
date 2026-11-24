import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SahraEvent } from '../lib/api';
import { isThisWeekendDate, parseIso } from '../lib/format';
import { fetchAvailableEvents } from '../lib/events';
import EventCard, { lowestPrice } from '../components/EventCard';
import { allIn } from '../lib/format';
import { Badge, Button, Card, EmptyState, Input, Spinner } from '../components/ui';

const CATEGORIES = ['All', 'Concerts', 'Comedy', 'Football', 'Theatre', 'Family', 'Nightlife', 'Arts'];
const DATE_PRESETS = ['All dates', 'Today', 'This weekend', 'Next 30 days'] as const;

function inPreset(startsAt: string, preset: string): boolean {
  const d = parseIso(startsAt);
  if (!d) return false;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 3_600_000 - 1);
  switch (preset) {
    case 'Today':
      return d >= startOfToday && d <= endOfToday;
    case 'This weekend':
      return isThisWeekendDate(d);
    case 'Next 30 days': {
      const limit = new Date(now.getTime() + 30 * 24 * 3_600_000);
      return d >= now && d <= limit;
    }
    default:
      return true;
  }
}

export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const [events, setEvents] = useState<SahraEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const category = params.get('category') ?? 'All';
  const datePreset = params.get('date') ?? 'All dates';
  const maxPrice = params.get('maxPrice') ? Number(params.get('maxPrice')) : null;
  const hideSoldOut = params.get('hideSoldOut') === '1';
  const seatedOnly = params.get('seated') === '1';
  const query = params.get('q') ?? '';

  const [priceInput, setPriceInput] = useState(maxPrice != null ? String(maxPrice) : '');

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAvailableEvents({ limit: 100 })
      .then((events) => {
        if (active) setEvents(events);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load events');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value == null || value === '' || value === 'All' || value === 'All dates') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  const filtered = useMemo(() => {
    let list = events;
    if (category !== 'All') list = list.filter((e) => e.category === category);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
      );
    }
    if (datePreset !== 'All dates') list = list.filter((e) => inPreset(e.startsAt, datePreset));
    if (maxPrice != null) {
      list = list.filter((e) => {
        const p = lowestPrice(e.tiers);
        return p == null || allIn(p) <= maxPrice;
      });
    }
    if (hideSoldOut) {
      list = list.filter((e) =>
        (e.tiers ?? []).some((t) => Math.max(0, t.remaining ?? t.quantity - t.sold) > 0)
      );
    }
    if (seatedOnly) list = list.filter((e) => (e.venueSections ?? []).length > 0);
    return [...list].sort((a, b) => (parseIso(a.startsAt)?.getTime() ?? 0) - (parseIso(b.startsAt)?.getTime() ?? 0));
  }, [events, category, query, datePreset, maxPrice, hideSoldOut, seatedOnly]);

  const activeFilterCount =
    (category !== 'All' ? 1 : 0) +
    (datePreset !== 'All dates' ? 1 : 0) +
    (maxPrice != null ? 1 : 0) +
    (hideSoldOut ? 1 : 0) +
    (seatedOnly ? 1 : 0);

  return (
    <div className="mx-auto flex max-w-[1440px] gap-8 px-6 pb-20 pt-8 lg:px-12">
      {/* Filters */}
      <aside className="hidden w-64 shrink-0 flex-col gap-5 lg:flex">
        <Card className="p-5">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-night-muted">Date</div>
          <div className="mt-3 flex flex-col gap-1.5">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => update('date', preset === 'All dates' ? null : preset)}
                className={`rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                  datePreset === preset ? 'bg-gold/20 text-gold' : 'text-sand/80 hover:bg-night-elevated'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-night-muted">Category</div>
          <div className="mt-3 flex flex-col gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => update('category', cat === 'All' ? null : cat)}
                className={`rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                  category === cat ? 'bg-gold/20 text-gold' : 'text-sand/80 hover:bg-night-elevated'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-night-muted">Price</div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = Number(priceInput);
              update('maxPrice', priceInput && Number.isFinite(v) && v > 0 ? String(Math.round(v)) : null);
            }}
          >
            <Input
              tone="dark"
              type="number"
              min={1}
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="Up to $500"
              className="px-3 py-2 text-sm"
            />
            <Button type="submit" variant="ghost" className="px-3 py-2 text-xs">
              Apply
            </Button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-night-muted">Only show</div>
          <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-sand/85">
            <input
              type="checkbox"
              checked={hideSoldOut}
              onChange={(e) => update('hideSoldOut', e.target.checked ? '1' : null)}
              className="h-4 w-4 accent-[#F2D9A0]"
            />
            Hide sold out
          </label>
          <label className="mt-2.5 flex cursor-pointer items-center gap-2.5 text-sm text-sand/85">
            <input
              type="checkbox"
              checked={seatedOnly}
              onChange={(e) => update('seated', e.target.checked ? '1' : null)}
              className="h-4 w-4 accent-[#F2D9A0]"
            />
            Seated events
          </label>
        </Card>

        {activeFilterCount > 0 ? (
          <Button
            variant="outline"
            className="px-4 py-2 text-xs"
            onClick={() => {
              setPriceInput('');
              setParams({}, { replace: true });
            }}
          >
            Clear all filters
          </Button>
        ) : null}
      </aside>

      {/* Results */}
      <div className="flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-sand">
              {category === 'All' ? 'Explore' : `${category} in Dubai`}
            </h1>
            <p className="mt-1 text-sm text-night-muted">
              {loading ? 'Loading…' : `${filtered.length} event${filtered.length === 1 ? '' : 's'} in Dubai`}
              {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'}` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            {CATEGORIES.slice(0, 4).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => update('category', cat === 'All' ? null : cat)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition lg:hidden ${
                  category === cat ? 'bg-gold text-night' : 'bg-night-surface text-sand/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Spinner />
            </div>
          ) : error ? (
            <EmptyState title="Couldn’t load events">{error}</EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState title="No events match those filters">
              Try widening the date range or clearing a filter.
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>

        {!loading && filtered.length > 0 ? (
          <div className="mt-8 flex flex-wrap items-center gap-2 text-xs text-night-muted">
            <span>Sort: Soonest</span>
            <Badge tone="muted">Resale tickets appear on each event page</Badge>
          </div>
        ) : null}
      </div>
    </div>
  );
}
