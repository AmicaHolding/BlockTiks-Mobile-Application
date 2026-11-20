import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'react-qr-code';
import type { Ticket } from '../lib/api';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatShortDateTime, parseIso } from '../lib/format';
import { Button, Card } from './ui';
import { CalendarIcon, ClockIcon, MapIcon, SendIcon, TagIcon, TicketIcon } from './icons';

export function qrGoesLiveAt(eventStartsAt: string): Date | null {
  const start = parseIso(eventStartsAt);
  if (!start) return null;
  return new Date(start.getTime() - 24 * 3_600_000);
}

export function isQrLive(eventStartsAt: string): boolean {
  const liveAt = qrGoesLiveAt(eventStartsAt);
  return liveAt ? liveAt.getTime() <= Date.now() : true;
}

export default function TicketPass({
  ticket,
  listed,
  onChanged,
}: {
  ticket: Ticket;
  listed?: boolean;
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const [showTransfer, setShowTransfer] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Q1-Q3: live rotating QR — the payload rotates every 15s server-side
  // (sahra2.<code>.<window>.<sig>), unlocking 24h before doors.
  const [qrPayload, setQrPayload] = useState(ticket.code);
  const [refreshIn, setRefreshIn] = useState(15);

  useEffect(() => {
    let alive = true;
    async function fetchQr() {
      try {
        const res = await api.ticketQr(ticket.code);
        if (!alive) return;
        setQrPayload(res.payload);
        setRefreshIn(res.refreshInSeconds ?? 15);
      } catch {
        if (alive) setQrPayload(ticket.code);
      }
    }
    fetchQr();
    const t = setInterval(fetchQr, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [ticket.code]);

  const qrLive = isQrLive(ticket.eventStartsAt);
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${ticket.eventLocation} ${ticket.eventTitle}`
  )}`;

  async function doTransfer() {
    const to = recipient.trim();
    setError(null);
    if (!to.includes('@')) {
      // TODO(api-gap): spec transfers accept email OR phone via claim links,       // the backend moves tickets by account email only.
      setError('Phone transfers aren’t supported yet, send to their Sahra account email.');
      return;
    }
    if (user?.email && to.toLowerCase() === user.email.toLowerCase()) {
      setError('That’s you, send it to a friend instead.');
      return;
    }
    setBusy(true);
    try {
      await api.transferTicket(ticket.code, to);
      setSentTo(to);
      setShowTransfer(false);
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Transfer failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-0 md:flex-row">
        {/* Ticket body */}
        <div className="relative flex-1 bg-gold p-6 text-night">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-night/70">
                <TicketIcon size={14} /> Sahra ticket
              </div>
              <div className="mt-2 font-display text-2xl font-extrabold leading-tight">
                {ticket.eventTitle}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-night/80">
                <span className="flex items-center gap-1.5">
                  <CalendarIcon size={14} /> {formatShortDateTime(ticket.eventStartsAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapIcon size={14} /> {ticket.eventLocation}
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-night/10 px-3 py-2 text-right text-xs font-semibold">
              <div className="uppercase tracking-wide text-night/60">Tier</div>
              <div className="text-sm font-bold">{ticket.tierName}</div>
              {ticket.sectionName ? (
                <div className="text-night/70">{ticket.sectionName}</div>
              ) : null}
              {ticket.seatLabel ? <div className="text-night/70">{ticket.seatLabel}</div> : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {!listed && ticket.status === 'VALID' ? (
              <>
                <Button variant="night" className="px-4 py-2 text-xs" onClick={() => setShowTransfer(true)}>
                  <SendIcon size={14} /> Send
                </Button>
                <Link to={`/sell?eventId=${ticket.eventId}`}>
                  <Button variant="night" className="px-4 py-2 text-xs">
                    <TagIcon size={14} /> Sell
                  </Button>
                </Link>
              </>
            ) : null}
            {listed ? (
              <span className="rounded-full bg-night/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide">
                Listed for resale
              </span>
            ) : null}
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-night/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-night no-underline hover:bg-night/25"
            >
              Directions
            </a>
          </div>

          {sentTo ? (
            <div className="mt-3 text-sm font-semibold text-night">
              Transferred to {sentTo}, their QR is now live.
            </div>
          ) : null}
        </div>

        {/* QR stub */}
        <div className="flex w-full flex-col items-center justify-center gap-3 border-t border-dashed border-night/30 bg-gold/70 p-6 text-night md:w-56 md:border-l md:border-t-0">
          {qrLive ? (
            <>
              <div className="rounded-xl bg-white p-3">
                <QRCode value={qrPayload} size={96} bgColor="#FFFFFF" fgColor="#241C14" />
              </div>
              <div className="text-center text-xs font-semibold text-night/70">
                Live code · refreshes in {refreshIn}s
              </div>
            </>
          ) : (
            <>
              <ClockIcon size={28} className="text-night/60" />
              <div className="text-center text-xs font-semibold leading-relaxed text-night/70">
                QR goes live 24h before doors
              </div>
            </>
          )}
          <div className="text-[10px] font-mono tracking-widest text-night/50">{ticket.code.slice(0, 12)}…</div>
        </div>
      </div>

      {showTransfer ? (
        <div className="border-t border-night-border/60 bg-night-surface p-5">
          <div className="text-sm font-semibold text-sand">Send to a friend</div>
          <p className="mt-1 text-xs text-night-muted">
            Their Sahra account email or phone, the ticket moves instantly and your QR stops working.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="friend@email.com or +971…"
              className="w-full rounded-xl border border-night-border bg-night px-3.5 py-2.5 text-sm text-sand outline-none placeholder:text-night-muted focus:border-gold"
            />
            <Button variant="gold" disabled={busy || !recipient.trim()} onClick={doTransfer}>
              {busy ? 'Sending…' : 'Send ticket'}
            </Button>
          </div>
          {error ? <div className="mt-2 text-sm text-red-300">{error}</div> : null}
        </div>
      ) : null}
    </Card>
  );
}
