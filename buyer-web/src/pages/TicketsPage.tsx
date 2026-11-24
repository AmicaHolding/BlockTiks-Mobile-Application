import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { api, ApiError, type Earnings, type Listing, type Offer, type Ticket } from '../lib/api';
import { allIn, formatCents, formatShortDateTime, parseIso } from '../lib/format';
import TicketPass from '../components/TicketPass';
import { Badge, Button, Card, EmptyState, Spinner } from '../components/ui';
import { SendIcon, TagIcon } from '../components/icons';

type Tab = 'upcoming' | 'past';

interface EventGroup {
  eventId: string;
  title: string;
  startsAt: string;
  location: string;
  tickets: Ticket[];
}

export default function TicketsPage() {
  const [params] = useSearchParams();
  const eventFilter = params.get('event');
  const sendFirst = params.get('action') === 'send';
  const [tab, setTab] = useState<Tab>('upcoming');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [earningsMsg, setEarningsMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, l, o, e] = await Promise.all([
        api.tickets(),
        api.myListings().catch(() => ({ listings: [] as Listing[] })),
        api.myOffers().catch(() => ({ offers: [] as Offer[] })),
        api.earnings().catch(() => null),
      ]);
      setTickets(t.tickets);
      setListings(l.listings);
      setOffers(o.offers);
      setEarnings(e);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const listedByCode = useMemo(() => {
    const map = new Map<string, Listing>();
    for (const listing of listings) {
      if (listing.status === 'ACTIVE' || listing.status === 'CHECKOUT') map.set(listing.ticketCode, listing);
    }
    return map;
  }, [listings]);

  const soldListings = useMemo(
    () => listings.filter((l) => l.status === 'SOLD'),
    [listings]
  );

  const activeOffers = useMemo(
    () => offers.filter((o) => o.status === 'ACTIVE' || o.status === 'MATCHED'),
    [offers]
  );

  const groups = useMemo(() => {
    const map = new Map<string, EventGroup>();
    for (const ticket of tickets) {
      const existing = map.get(ticket.eventId);
      if (existing) existing.tickets.push(ticket);
      else
        map.set(ticket.eventId, {
          eventId: ticket.eventId,
          title: ticket.eventTitle,
          startsAt: ticket.eventStartsAt,
          location: ticket.eventLocation,
          tickets: [ticket],
        });
    }
    let list = [...map.values()];
    if (eventFilter) list = list.filter((g) => g.eventId === eventFilter);
    const now = Date.now();
    const filtered = list.filter((g) => {
      const start = parseIso(g.startsAt)?.getTime() ?? 0;
      return tab === 'upcoming' ? start >= now - 12 * 3_600_000 : start < now - 12 * 3_600_000;
    });
    return filtered.sort(
      (a, b) => (parseIso(a.startsAt)?.getTime() ?? 0) - (parseIso(b.startsAt)?.getTime() ?? 0)
    );
  }, [tickets, tab]);

  async function cancelListing(code: string) {
    try {
      await api.cancelListing(code);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not cancel listing');
    }
  }

  async function cancelOffer(id: string) {
    try {
      await api.cancelOffer(id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not cancel offer');
    }
  }

  async function withdraw() {
    setEarningsMsg(null);
    try {
      const earnings = await api.earnings();
      if (earnings.availableCents < 100) {
        setEarningsMsg('No available balance to withdraw yet.');
        return;
      }
      await api.withdraw(earnings.availableCents);
      setEarningsMsg('Withdrawal sent.');
      await load();
    } catch (e) {
      setEarningsMsg(e instanceof ApiError ? e.message : 'Withdrawals are not available yet');
    }
  }

  const upcomingCount = tickets.filter((t) => (parseIso(t.eventStartsAt)?.getTime() ?? 0) > Date.now() - 12 * 3_600_000).length;
  const pastCount = tickets.length - upcomingCount;

  return (
    <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-8 lg:px-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-sand">My tickets</h1>
          {earnings ? (
            <div className="mt-2 flex items-center gap-3 text-sm">
              <span className="font-semibold text-gold">
                {formatCents(earnings.lifetimeCents)} earned
              </span>
              <span className="text-night-muted">·</span>
              <span className="text-night-muted">
                {formatCents(earnings.readyCents)} ready · {formatCents(earnings.pendingCents)} pending
              </span>
              <Button variant="ghost" className="px-3 py-1 text-xs" onClick={withdraw}>
                Withdraw
              </Button>
            </div>
          ) : null}
          {earningsMsg ? <div className="mt-1 text-xs text-night-muted">{earningsMsg}</div> : null}
        </div>
        <div className="flex gap-2">
          {(['upcoming', 'past'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === t ? 'bg-gold text-night' : 'bg-night-surface text-sand/80 hover:bg-night-elevated'
              }`}
            >
              {t === 'upcoming' ? `Upcoming · ${upcomingCount}` : `Past · ${pastCount}`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <div className="mt-10">
          <EmptyState title="Couldn’t load your tickets">{error}</EmptyState>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {/* Waiting for tickets (offers) */}
          {tab === 'upcoming' && activeOffers.length > 0 ? (
            <section>
              <h2 className="font-display text-xl font-extrabold text-sand">Waiting for tickets</h2>
              <div className="mt-4 flex flex-col gap-3">
                {activeOffers.map((offer) => (
                  <Card key={offer.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div>
                      <div className="font-display text-base font-bold text-sand">
                        {offer.tierName}
                        {offer.sectionName ? ` · ${offer.sectionName}` : ''}
                      </div>
                      <div className="mt-1 text-sm text-night-muted">
                        Auto-buy up to {formatCents(allIn(offer.maxPriceCents))} each × {offer.quantity}
                        {offer.matchedCount > 0 ? ` · ${offer.matchedCount} listing${offer.matchedCount === 1 ? '' : 's'} matched` : ''}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/offers/new?eventId=${offer.eventId}&tierName=${encodeURIComponent(offer.tierName)}${offer.sectionName ? `&sectionName=${encodeURIComponent(offer.sectionName)}` : ''}&quantity=${offer.quantity}&maxPrice=${Math.round(allIn(offer.maxPriceCents) / 100)}`}
                      >
                        <Button variant="ghost" className="px-4 py-2 text-xs">Edit</Button>
                      </Link>
                      <Button variant="outline" className="px-4 py-2 text-xs" onClick={() => cancelOffer(offer.id)}>
                        Cancel
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {groups.length === 0 ? (
            <EmptyState
              title={tab === 'upcoming' ? 'Nothing booked yet. Your next sahra is waiting.' : 'No past tickets'}
              tone="dark"
            >
              {tab === 'upcoming' ? (
                <>
                  Ready for a night out?{' '}
                  <Link to="/" className="text-gold underline">Browse events</Link>.
                </>
              ) : null}
            </EmptyState>
          ) : (
            groups.map((group) => {
              const groupListings = listings.filter((l) => l.eventId === group.eventId);
              const activeGroupListings = groupListings.filter((l) => l.status === 'ACTIVE' || l.status === 'CHECKOUT');
              const soldGroupListings = soldListings.filter((l) => l.eventId === group.eventId);
              const validTickets = group.tickets.filter((t) => t.status === 'VALID');
              const isPast = tab === 'past';
              return (
                <section key={group.eventId}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link to={`/events/${group.eventId}`} className="font-display text-xl font-extrabold text-sand hover:text-gold">
                        {group.title}
                      </Link>
                      <div className="mt-0.5 text-sm text-night-muted">
                        {formatShortDateTime(group.startsAt)} · {group.location}
                      </div>
                    </div>
                    <div className="text-xs text-night-muted">
                      {validTickets.length} ticket{validTickets.length === 1 ? '' : 's'}
                    </div>
                  </div>

                  {/* Selling summary for this event */}
                  {activeGroupListings.length > 0 || soldGroupListings.length > 0 ? (
                    <Card className="mt-4 border-gold/30 bg-gold/5 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gold">
                          <TagIcon size={15} /> Selling
                        </div>
                        <div className="text-sm text-night-muted">
                          {soldGroupListings.length > 0
                            ? `${soldGroupListings.length} sold for ${formatCents(soldGroupListings.reduce((s, l) => s + l.priceCents, 0))}`
                            : null}
                          {soldGroupListings.length > 0 && activeGroupListings.length > 0 ? ' · ' : null}
                          {activeGroupListings.length > 0
                            ? `${activeGroupListings.length} listed at ${formatCents(Math.min(...activeGroupListings.map((l) => l.priceCents)))}+`
                            : null}
                        </div>
                      </div>
                      {activeGroupListings.length > 0 ? (
                        <div className="mt-3 flex flex-col gap-2">
                          {activeGroupListings.map((listing) => (
                            <div key={listing.ticketCode} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-night/60 px-4 py-2.5">
                              <span className="text-sm text-sand/85">
                                {listing.tierName} · listed at {formatCents(listing.priceCents)}
                              </span>
                              <Button variant="outline" className="px-3 py-1 text-xs" onClick={() => cancelListing(listing.ticketCode)}>
                                Stop selling
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </Card>
                  ) : null}

                  <div className="mt-4 grid gap-5 lg:grid-cols-2">
                    {group.tickets.map((ticket) => {
                      const listing = listedByCode.get(ticket.code);
                      if (ticket.status !== 'VALID') {
                        return (
                          <Card key={ticket.code} className="p-5 opacity-60">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-display font-bold text-sand">{ticket.eventTitle}</div>
                                <div className="mt-1 text-sm text-night-muted">
                                  {ticket.tierName}
                                  {ticket.sectionName ? ` · ${ticket.sectionName}` : ''}
                                </div>
                              </div>
                              <Badge tone="muted">{ticket.status.toLowerCase()}</Badge>
                            </div>
                          </Card>
                        );
                      }
                      if (listing) {
                        return (
                          <Card key={ticket.code} className="border-gold/40 p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-display font-bold text-sand">{ticket.eventTitle}</div>
                                <div className="mt-1 text-sm text-night-muted">
                                  {ticket.tierName} · listed at {formatCents(listing.priceCents)}
                                </div>
                              </div>
                              <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => cancelListing(listing.ticketCode)}>
                                Manage sale
                              </Button>
                            </div>
                          </Card>
                        );
                      }
                      return (
                        <TicketPass
                          key={ticket.code}
                          ticket={ticket}
                          onChanged={load}
                          initialShowTransfer={sendFirst && !listing && ticket.status === 'VALID' && group.tickets.find((t) => t.status === 'VALID' && !listedByCode.has(t.code)) === ticket}
                        />
                      );
                    })}
                  </div>

                  {!isPast && validTickets.some((t) => !listedByCode.has(t.code)) ? (
                    <div className="mt-4">
                      <Link to={`/sell?eventId=${group.eventId}`}>
                        <Button variant="outline" className="px-4 py-2 text-xs">
                          <SendIcon size={13} /> Sell tickets for {group.title}
                        </Button>
                      </Link>
                    </div>
                  ) : null}
                </section>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
