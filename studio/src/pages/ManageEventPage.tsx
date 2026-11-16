import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type StudioEvent } from '../lib/api';
import { formatCents, formatDateTime, statusLabel } from '../lib/format';
import { Badge, Button, Card, EmptyState } from '../components/ui';

export default function ManageEventPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<StudioEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .event(id)
      .then((res) => {
        if (active) setEvent(res.event);
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

  const stats = useMemo(() => {
    const tiers = event?.tiers ?? [];
    const sold = tiers.reduce((sum, tier) => sum + (tier.sold ?? 0), 0);
    const capacity = tiers.reduce((sum, tier) => sum + (tier.quantity ?? 0), 0);
    const grossCents = tiers.reduce(
      (sum, tier) => sum + (tier.priceCents ?? 0) * (tier.sold ?? 0),
      0,
    );
    return { sold, capacity, grossCents };
  }, [event]);

  async function publish() {
    if (!event) return;
    setPublishing(true);
    setError('');
    try {
      const res = await api.publishEvent(event.id);
      setEvent(res.event);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not publish event');
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return <EmptyState title="Loading event…" />;
  }
  if (!event) {
    return <EmptyState title="Event not found">{error || 'Check the link and try again.'}</EmptyState>;
  }

  const status = (event.status ?? '').toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button type="button" className="text-sm font-semibold text-night-muted hover:text-ink" onClick={() => navigate('/events')}>
            ← Events
          </button>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-extrabold text-ink">{event.title}</h1>
            <Badge tone={status === 'PUBLISHED' ? 'green' : status === 'DRAFT' ? 'draft' : 'neutral'}>
              {statusLabel(event.status)}
            </Badge>
          </div>
          <div className="mt-1 text-sm text-night-muted">
            {formatDateTime(event.startsAt)} · {event.location || 'Venue TBD'}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {status === 'DRAFT' ? (
            <Button onClick={publish} disabled={publishing} type="button">
              {publishing ? 'Publishing…' : 'Publish event'}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => navigate('/analytics')} type="button">
            Analytics
          </Button>
        </div>
      </div>

      {error ? <div className="rounded-xl bg-rumman/10 px-4 py-3 text-sm text-rumman">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-night-muted">Sold</div>
          <div className="mt-1 font-display text-2xl font-bold text-ink">
            {stats.sold.toLocaleString()} / {stats.capacity.toLocaleString()}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-night-muted">Gross revenue</div>
          <div className="mt-1 font-display text-2xl font-bold text-ink">{formatCents(stats.grossCents)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-night-muted">Days to go</div>
          <div className="mt-1 font-display text-2xl font-bold text-ink">
            {event.startsAt ? Math.max(0, Math.ceil((new Date(event.startsAt).getTime() - Date.now()) / 86_400_000)) : '—'}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-display text-lg font-bold text-ink">Ticket tiers</div>
            <div className="text-sm text-night-muted">Inventory and revenue by tier.</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-night-border/50 text-xs uppercase tracking-wide text-night-muted">
                <th className="pb-3 pr-4 font-semibold">Tier</th>
                <th className="pb-3 pr-4 font-semibold">Price</th>
                <th className="pb-3 pr-4 font-semibold">Sold</th>
                <th className="pb-3 font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(event.tiers ?? []).map((tier, index) => (
                <tr key={tier.id ?? `${tier.name}-${index}`} className="border-b border-night-border/30 last:border-0">
                  <td className="py-4 pr-4 font-semibold text-ink">{tier.name}</td>
                  <td className="py-4 pr-4 text-ink">{formatCents(tier.priceCents)}</td>
                  <td className="py-4 pr-4 text-ink">{tier.sold ?? 0} / {tier.quantity ?? 0}</td>
                  <td className="py-4 font-semibold text-ink">{formatCents((tier.priceCents ?? 0) * (tier.sold ?? 0))}</td>
                </tr>
              ))}
              {(event.tiers ?? []).length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-night-muted" colSpan={4}>
                    No tiers yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <div className="font-display text-lg font-bold text-ink">Quick actions</div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-dune/60 p-4">
            <div className="font-semibold text-ink">Edit event</div>
            <div className="mt-1 text-sm text-night-muted">General event editing is still mobile-side; Studio update endpoint is limited.</div>
            <Badge tone="draft">Soon</Badge>
          </div>
          <div className="rounded-xl bg-dune/60 p-4">
            <div className="font-semibold text-ink">Promo codes</div>
            <div className="mt-1 text-sm text-night-muted">Promo CRUD is not exposed by the backend yet.</div>
            <Badge tone="draft">Soon</Badge>
          </div>
          <div className="rounded-xl bg-dune/60 p-4">
            <div className="font-semibold text-ink">Venue layout</div>
            <div className="mt-1 text-sm text-night-muted">Seated maps power mobile screens 11–13.</div>
            <Badge tone="draft">Soon</Badge>
          </div>
        </div>
      </Card>

      <Card>
        <EmptyState title="Recent orders">
          An organizer order feed is not available in the MVP backend yet. Ticket sales still sync to the mobile Tickets tab.
        </EmptyState>
      </Card>
    </div>
  );
}
