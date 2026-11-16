import { useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'react-qr-code';
import type { Ticket } from '../lib/api';
import { api, ApiError } from '../lib/api';
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
  const [showTransfer, setShowTransfer] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const qrLive = isQrLive(ticket.eventStartsAt);
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${ticket.eventLocation} ${ticket.eventTitle}`
  )}`;

  async function doTransfer() {
    setBusy(true);
    setError(null);
    try {
      await api.transferTicket(ticket.code, email.trim());
      setSentTo(email.trim());
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
              Transferred to {sentTo} — their QR is now live.
            </div>
          ) : null}
        </div>

        {/* QR stub */}
        <div className="flex w-full flex-col items-center justify-center gap-3 border-t border-dashed border-night/30 bg-gold/70 p-6 text-night md:w-56 md:border-l md:border-t-0">
          {qrLive ? (
            <>
              <div className="rounded-xl bg-white p-3">
                <QRCode value={ticket.code} size={96} bgColor="#FFFFFF" fgColor="#241C14" />
              </div>
              <div className="text-center text-xs font-semibold text-night/70">
                Show this at the gate
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
            The ticket moves to their account instantly and your QR stops working.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@email.com"
              className="w-full rounded-xl border border-night-border bg-night px-3.5 py-2.5 text-sm text-sand outline-none placeholder:text-night-muted focus:border-gold"
            />
            <Button variant="gold" disabled={busy || !email.includes('@')} onClick={doTransfer}>
              {busy ? 'Sending…' : 'Send ticket'}
            </Button>
          </div>
          {error ? <div className="mt-2 text-sm text-red-300">{error}</div> : null}
        </div>
      ) : null}
    </Card>
  );
}
