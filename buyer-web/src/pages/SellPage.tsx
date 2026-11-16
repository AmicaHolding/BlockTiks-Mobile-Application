import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError, type Offer, type Ticket } from '../lib/api';
import { formatCents, formatShortDateTime } from '../lib/format';
import { Badge, Button, Card, EmptyState, Input, Spinner } from '../components/ui';
import { ArrowLeftIcon, CheckIcon, TagIcon } from '../components/icons';

export default function SellPage() {
  const [params] = useSearchParams();
  const eventId = params.get('eventId') ?? '';
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.sellableTickets(),
      api.myOffers().catch(() => ({ offers: [] as Offer[] })),
    ])
      .then(([t, o]) => {
        if (!active) return;
        setTickets(t.tickets.filter((tk) => !eventId || tk.eventId === eventId));
        setOffers(o.offers.filter((of) => of.status === 'ACTIVE' || of.status === 'MATCHED'));
      })
      .catch((e) => {
        if (active) setError(e instanceof ApiError ? e.message : 'Failed to load tickets');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [eventId]);

  const eventTitle = tickets[0]?.eventTitle ?? 'this event';
  const waitingBuyers = useMemo(() => {
    const tierNames = new Set(tickets.map((t) => t.tierName.toLowerCase()));
    return offers.filter((o) => tierNames.has(o.tierName.toLowerCase()) || !eventId);
  }, [offers, tickets, eventId]);

  const priceCents = Math.round((Number(price) || 0) * 100);
  const validPrice = priceCents >= 1;
  const total = priceCents * selected.size;

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function listTickets() {
    if (selected.size === 0 || !validPrice) return;
    setBusy(true);
    setError(null);
    let listed = 0;
    try {
      for (const code of selected) {
        await api.listTicket(code, priceCents);
        listed += 1;
      }
      setDone(listed);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not list tickets');
      if (listed > 0) setDone(listed);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (done != null) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckIcon size={30} className="text-emerald-700" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold text-ink">{done} ticket{done === 1 ? '' : 's'} listed</h1>
        <p className="mt-2 text-ink/60">
          Your tickets are on sale at {price ? formatCents(priceCents) : ''} each. Each buyer gets a fresh QR, so your old
          ones stop working. Proceeds appear in Earnings and are paid out after the event.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/tickets">
            <Button variant="night">View tickets</Button>
          </Link>
          <Link to={`/events/${eventId}`}>
            <Button variant="outline" tone="light">Back to event</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-76px)] bg-sand text-ink">
      <div className="mx-auto max-w-4xl px-6 py-10 lg:px-12">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 transition hover:text-ink"
        >
          <ArrowLeftIcon size={15} /> Tickets / {eventTitle}
        </Link>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink">Sell tickets</h1>

        {error ? <div className="mt-4 rounded-xl bg-rumman/10 px-4 py-3 text-sm font-semibold text-rumman">{error}</div> : null}

        {tickets.length === 0 ? (
          <div className="mt-8">
            <EmptyState title="No tickets to sell" tone="light">
              You don’t have any valid, unlisted tickets for this event.
            </EmptyState>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="flex flex-col gap-8">
              {/* Step 1: which tickets */}
              <Card tone="light" className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-extrabold text-ink">
                    <span className="mr-2 text-gold">1.</span> Which tickets?
                  </h2>
                  <button
                    type="button"
                    className="text-sm font-semibold text-night underline-offset-4 hover:underline"
                    onClick={() =>
                      setSelected(selected.size === tickets.length ? new Set() : new Set(tickets.map((t) => t.code)))
                    }
                  >
                    {selected.size === tickets.length ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="mt-4 flex flex-col gap-2.5">
                  {tickets.map((ticket) => {
                    const checked = selected.has(ticket.code);
                    return (
                      <label
                        key={ticket.code}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                          checked ? 'border-gold bg-gold/15' : 'border-ink/15 bg-white hover:border-ink/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(ticket.code)}
                          className="h-4 w-4 accent-[#241C14]"
                        />
                        <TagIcon size={16} className="text-night/50" />
                        <span className="text-sm font-semibold text-ink">
                          {ticket.tierName}
                          {ticket.sectionName ? ` · ${ticket.sectionName}` : ''} · standing
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-4 text-sm text-ink/60">
                  Or{' '}
                  <Link to="/tickets" className="font-semibold text-night underline">send them to a friend for free</Link>{' '}
                  instead.
                </p>
              </Card>

              {/* Step 2: price & rules */}
              <Card tone="light" className="p-6">
                <h2 className="font-display text-lg font-extrabold text-ink">
                  <span className="mr-2 text-gold">2.</span> Price &amp; rules
                </h2>
                <div className="mt-4">
                  <div className="mb-1.5 text-sm font-semibold text-ink">Price each</div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-extrabold text-ink">$</span>
                    <Input
                      tone="light"
                      type="number"
                      min={1}
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="420"
                      className="max-w-[160px]"
                    />
                    <span className="text-sm text-ink/50">per ticket</span>
                  </div>
                </div>
                {waitingBuyers.length > 0 ? (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    <Badge tone="green">{waitingBuyers.length} buyer{waitingBuyers.length === 1 ? '' : 's'}</Badge>
                    <span>
                      waiting with “Set your price” offers on this event — a matching price sells instantly.
                    </span>
                  </div>
                ) : null}
                <p className="mt-4 text-xs leading-relaxed text-ink/50">
                  Listings appear on the event page, cheapest first, tagged “Resale”. You can cancel any listing while it’s
                  active from your Tickets tab.
                </p>
              </Card>
            </div>

            {/* Summary */}
            <Card tone="light" className="h-fit p-6 lg:sticky lg:top-24">
              <h2 className="font-display text-lg font-extrabold text-ink">{eventTitle}</h2>
              <div className="mt-1 text-sm text-ink/60">
                {formatShortDateTime(tickets[0]?.eventStartsAt ?? '')}
              </div>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-ink/60">Tickets</span>
                <span className="font-semibold text-ink">{selected.size} × {price ? formatCents(priceCents) : '—'}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-ink/10 pt-3 text-base">
                <span className="font-bold text-ink">You receive up to</span>
                <span className="font-display text-xl font-extrabold text-ink">{formatCents(total)}</span>
              </div>
              <p className="mt-2 text-[11px] text-ink/50">
                Proceeds are tracked in Earnings and release after the event.
              </p>
              <Button
                variant="primary"
                className="mt-5 w-full py-3 text-base"
                disabled={selected.size === 0 || !validPrice || busy}
                onClick={listTickets}
              >
                {busy ? <Spinner className="border-night border-t-transparent" /> : null}
                {selected.size > 0 ? `List ${selected.size} ticket${selected.size === 1 ? '' : 's'}` : 'List tickets'}
              </Button>
              {selected.size > 0 && !validPrice ? (
                <p className="mt-2 text-center text-xs font-semibold text-rumman">Enter a price per ticket</p>
              ) : null}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
