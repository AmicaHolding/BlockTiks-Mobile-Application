import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api, type Invite, type InviteGuests, type InvitePageResponse, type InvitePoll, type InvitePost, type InviteRsvp, type RsvpStatus } from '../lib/api';
import { useAuth } from '../lib/auth';
import { INVITE_REPORT_BUTTON, MAX_PLUS_ONES, STUDIO_URL } from '../lib/config';
import { formatRelative, nameInitials, venueDateTime } from '../lib/format';
import { inviteLink } from '../components/HostFlow';
import { Spinner } from '../components/ui';

type Loaded = { invite: Invite; page: InvitePageResponse };

const STATUS_COPY: Record<RsvpStatus, string> = {
  going: 'You’re going',
  maybe: 'You said maybe',
  no: 'You can’t make it',
  requested: 'Request sent. The host will let you know.',
  declined: 'The host couldn’t fit you in this time.',
};

const TONES = ['#b8323a', '#2f5c58', '#5a3a5e', '#6e5a36', '#2a4a6e'];
function toneOf(id: string | undefined): string {
  const s = id ?? 'invite';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}
const STRIPES = (tone: string) =>
  `repeating-linear-gradient(135deg, ${tone} 0 26px, #1d2e45 26px 52px)`;

function errMsg(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong';
  if (e.code === 'full') return 'It’s full. The host has reached the guest limit.';
  if (e.code === 'plus_ones_not_allowed') return 'This invite doesn’t allow plus-ones.';
  if (e.code === 'host_cannot_rsvp') return 'You’re the host of this one.';
  return e.message;
}

function OutlineBtn({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const cls =
    'flex-none rounded-full border-[1.5px] border-night-border px-4 py-[9px] text-[14px] font-semibold text-sand transition hover:bg-night-surface';
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

function icsHref(invite: Invite): string {
  const stamp = (d: Date) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}00Z`;
  const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const start = new Date(invite.starts_at);
  const end = new Date(start.getTime() + 3 * 3_600_000);
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sahra//Invite//EN',
    'BEGIN:VEVENT',
    `UID:${invite.code}@sahra`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(invite.title)}`,
    invite.place_text ? `LOCATION:${esc(invite.place_text)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}

function mapHref(invite: Invite): string | null {
  const q = invite.place_text ?? invite.area;
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

/** Public invite page `/i/{code}` — spec fInvite: content column left,
 *  sticky RSVP/host card right. Link-only, works signed out. */
export default function InvitePage() {
  const { code = '' } = useParams<{ code: string }>();
  const { user, requireAuth } = useAuth();
  const [data, setData] = useState<Loaded | null>(null);
  const [loadErr, setLoadErr] = useState<{ code?: string; message: string } | null>(null);
  const [plus, setPlus] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [reportErr, setReportErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const page = await api.invite(code);
      const invite = (page.invite ?? page) as Invite;
      setData({ invite, page });
    } catch (e) {
      setLoadErr(
        e instanceof ApiError
          ? { code: e.code, message: e.message }
          : { message: 'Could not load this invite' }
      );
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loadErr) {
    const cancelled = loadErr?.code === 'cancelled';
    return (
      <div className="mx-auto max-w-xl px-8 py-24 text-center">
        <h1 className="font-display text-3xl font-extrabold text-sand">
          {cancelled ? 'This invite was cancelled' : 'Invite not found'}
        </h1>
        <p className="mt-2 text-night-muted">{loadErr.message}</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-night">
          Find something to do
        </Link>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const { invite, page } = data;
  const isHost = Boolean(user && invite.is_host);
  const my = page.my_rsvp ?? null;
  const counts = page.counts ?? {};
  const going = counts.going ?? 0;
  const seatsTaken = counts.going_with_plus_ones ?? going;
  const cap = invite.guest_cap ?? null;
  const cancelled = invite.status === 'cancelled';
  const moved = invite.status === 'moved';
  const past = invite.starts_at
    ? new Date(invite.starts_at).getTime() < Date.now() - 6 * 3_600_000
    : false;
  const closed = cancelled || moved || past;
  const full = cap != null && seatsTaken >= cap && my?.status !== 'going';
  const placeHidden = invite.hide_address_until_going && !invite.place_text;

  async function submit(status: RsvpStatus, plusOnes: number) {
    setBusy(true);
    setError(null);
    try {
      await api.rsvp(code, status, plusOnes);
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  const answer = (status: RsvpStatus) => requireAuth('rsvp', () => void submit(status, plus));

  const dayNum = invite.starts_at ? new Date(invite.starts_at).getDate() : null;
  const link = inviteLink(invite.code);
  const custom = invite.rsvp_labels;

  return (
    <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-11 px-6 pb-14 pt-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)] lg:px-14">
      {/* ——— left: content ——— */}
      <div className="flex min-w-0 flex-col gap-[22px]">
        {isHost ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gold px-[18px] py-3.5 text-night">
            <span className="text-[15px]">
              <strong>You’re hosting.</strong> This is exactly what guests see.
            </span>
            <span className="flex items-center gap-2.5">
              <span className="max-w-[240px] truncate text-[14px] font-semibold">{link}</span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(link).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="rounded-full bg-night px-3.5 py-2 text-[13px] font-semibold text-gold"
              >
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </span>
          </div>
        ) : null}

        <div
          className="relative h-[380px] overflow-hidden rounded-[26px]"
          style={{ background: STRIPES(invite.cover?.tone ?? toneOf(invite.code ?? invite.id)) }}
        >
          {invite.cover?.image_url ? (
            <img src={invite.cover.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <div className="absolute bottom-[22px] left-[22px] flex items-center gap-2.5 rounded-2xl bg-[#16263bdd] px-4 py-3">
            {dayNum != null ? (
              <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-gold text-[15px] font-extrabold text-night">
                {dayNum}
              </span>
            ) : null}
            <span className="text-[32px] font-extrabold leading-[0.98] tracking-[-0.04em] text-sand lg:text-[44px]">
              {invite.title}
            </span>
          </div>
        </div>

        <div className="flex max-w-[620px] flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3.5">
            <div className="flex flex-col gap-0.5 text-[18px] font-semibold text-sand">
              {invite.starts_at ? venueDateTime(invite.starts_at, invite.tz) : 'Date to be decided'}
              <span className="text-[15px] font-normal text-night-muted">
                Hosted by {page.host.name}
              </span>
            </div>
            {invite.starts_at ? <OutlineBtn href={icsHref(invite)}>Add to calendar</OutlineBtn> : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3.5">
            <div className="flex flex-col gap-0.5 text-[18px] font-semibold text-sand">
              {placeHidden ? (
                <span className="italic text-night-muted">Address shown once you’re going</span>
              ) : (
                invite.place_text || invite.area || 'Location shared soon'
              )}
              {invite.area ? (
                <span className="text-[15px] font-normal text-night-muted">{invite.area}</span>
              ) : null}
            </div>
            {mapHref(invite) ? <OutlineBtn href={mapHref(invite)!}>Open map</OutlineBtn> : null}
          </div>
        </div>

        {invite.note ? (
          <p className="max-w-[620px] whitespace-pre-wrap text-[17px] leading-[1.6] text-night-muted">
            {invite.note}
          </p>
        ) : null}

        <InviteExtras
          inviteId={invite.id ?? ''}
          isHost={isHost}
          poll={(page as { poll?: InvitePoll }).poll}
          going={my?.status === 'going' || isHost}
          onChanged={() => void load()}
        />

        {page.updates?.length ? (
          <section className="flex flex-col gap-3.5 border-t border-night-elevated pt-2.5">
            <h2 className="text-[24px] font-extrabold tracking-[-0.02em] text-sand">From the host</h2>
            {page.updates.map((u, i) => (
              <div key={u.id ?? i} className="rounded-2xl bg-night-elevated px-[18px] py-3.5">
                <p className="text-[15px] text-sand">{u.body}</p>
                <p className="mt-1 text-[12px] text-night-muted">{formatRelative(u.sent_at)}</p>
              </div>
            ))}
          </section>
        ) : null}

        {INVITE_REPORT_BUTTON && !isHost ? (
          <div>
            <button
              type="button"
              disabled={reported}
              onClick={() =>
                requireAuth('other', () => {
                  if (!window.confirm('Report this invite to Sahra?')) return;
                  setReportErr(null);
                  api
                    .reportInvite(invite.id)
                    .then(() => setReported(true))
                    .catch((e) => setReportErr(e instanceof ApiError ? e.message : 'Couldn’t send the report. Try again.'));
                })
              }
              className="text-xs font-semibold text-night-muted underline disabled:no-underline"
            >
              {reported ? 'Thanks, we’ll take a look' : 'Report this invite'}
            </button>
            {reportErr ? <p role="alert" className="mt-1 text-xs font-semibold text-rumman">{reportErr}</p> : null}
          </div>
        ) : null}
      </div>

      {/* ——— right: sticky RSVP / host card ——— */}
      <div className="flex flex-col gap-4 rounded-3xl bg-night-elevated p-[26px] lg:sticky lg:top-24">
        {closed ? (
          <>
            <div className="text-center text-[18px] font-extrabold text-sand">
              {cancelled ? 'This was cancelled' : moved ? 'This is now a ticketed event' : 'This has ended'}
            </div>
            {moved && invite.moved_to_event_id ? (
              <Link
                to={`/events/${invite.moved_to_event_id}`}
                className="rounded-full bg-gold px-5 py-3 text-center text-[15px] font-semibold text-night"
              >
                Get tickets
              </Link>
            ) : null}
          </>
        ) : (
          <>
            {my ? (
              <div className="flex items-center gap-3 rounded-2xl bg-night px-4 py-3.5">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold text-sand">{STATUS_COPY[my.status]}</span>
                  <span className="text-[13px] text-night-muted">
                    {my.plus_ones ? `+${my.plus_ones} coming with you` : 'Tap below to change'}
                  </span>
                </span>
              </div>
            ) : null}

            {invite.approve_guests && my?.status !== 'going' ? (
              <button
                type="button"
                disabled={busy || full || my?.status === 'requested'}
                onClick={() => answer('going')}
                className="w-full rounded-full bg-gold py-[15px] text-[16px] font-semibold text-night transition hover:brightness-95 disabled:opacity-60"
              >
                {busy ? '…' : my?.status === 'requested' ? 'Requested' : 'Request to join'}
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['going', 'Going'],
                    ['maybe', 'Maybe'],
                    ['no', 'Can’t'],
                  ] as const
                ).map(([s, label]) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy || (s === 'going' && full)}
                    onClick={() => answer(s)}
                    className={`rounded-full border-[1.5px] px-1.5 py-3.5 text-[15px] font-semibold transition disabled:opacity-50 ${
                      my?.status === s
                        ? 'border-gold bg-gold text-night'
                        : 'border-night-border text-sand hover:bg-night-surface'
                    }`}
                  >
                    {custom?.[s] ?? label}
                  </button>
                ))}
              </div>
            )}

            {full ? (
              <div className="rounded-xl bg-rumman/15 px-3 py-2 text-sm font-semibold text-red-200">
                It’s full. The host has reached the guest limit.
              </div>
            ) : null}
            {invite.approve_guests && my?.status !== 'going' ? (
              <p className="text-center text-[13px] text-night-muted">The host approves each guest.</p>
            ) : null}

            {invite.allow_plus_ones && !full && (my?.status === 'going' || !my) ? (
              <div className="flex items-center justify-between rounded-2xl bg-night px-[18px] py-3">
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold text-sand">Bringing someone?</span>
                  <span className="text-[13px] text-night-muted">Up to {MAX_PLUS_ONES} plus-ones</span>
                </span>
                <span className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Fewer plus-ones"
                    disabled={plus <= 0}
                    onClick={() => setPlus(Math.max(0, plus - 1))}
                    className="h-[34px] w-[34px] rounded-full border-[1.5px] border-night-border text-[18px] font-semibold text-sand disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="min-w-[20px] text-center text-[16px] font-bold text-sand">{plus}</span>
                  <button
                    type="button"
                    aria-label="More plus-ones"
                    disabled={plus >= MAX_PLUS_ONES}
                    onClick={() => setPlus(Math.min(MAX_PLUS_ONES, plus + 1))}
                    className="h-[34px] w-[34px] rounded-full bg-gold text-[18px] font-semibold text-night disabled:opacity-40"
                  >
                    +
                  </button>
                </span>
              </div>
            ) : null}

            {error ? <div role="alert" className="text-sm font-semibold text-rumman">{error}</div> : null}
            {!user ? (
              <p className="text-center text-[13px] text-night-muted">
                No app needed. We’ll text you a code to confirm.
              </p>
            ) : null}
          </>
        )}

        {(invite.show_guest_list || isHost) && (page.faces ?? []).length ? (
          <div className="flex flex-col gap-3 border-t border-night-border pt-4">
            <div className="flex items-center justify-between">
              <span className="flex flex-col gap-0.5">
                <span className="text-[18px] font-extrabold text-sand">Guest list</span>
                <span className="text-[14px] text-night-muted">{going} going</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(page.faces ?? []).slice(0, 12).map((f, i) => {
                const label = typeof f === 'string' ? f : f.initials ?? nameInitials(f.name);
                return (
                  <span
                    key={i}
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[13px] font-bold"
                    style={{ background: TONES[i % TONES.length], color: '#f7f1e6' }}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-4 gap-2 border-t border-night-border pt-4">
          {(
            [
              ['Going', going],
              ['Maybe', counts.maybe ?? 0],
              ['Can’t', counts.no ?? 0],
              ['+1s', (counts.going_with_plus_ones ?? 0) - going],
            ] as const
          ).map(([label, n]) => (
            <div key={label} className="flex flex-col items-center gap-0.5 rounded-2xl bg-night px-1.5 py-3">
              <span className="text-[24px] font-extrabold text-sand">{n}</span>
              <span className="text-[12px] text-night-muted">{label}</span>
            </div>
          ))}
        </div>

        {isHost ? <HostPanel invite={invite} onChanged={() => void load()} /> : null}
      </div>
    </div>
  );
}

/** Host-only blocks inside the sticky card: pending requests, blast,
 *  sell-instead, cancel (spec: "Asking to join", "Message guests"). */
function HostPanel({ invite, onChanged }: { invite: Invite; onChanged: () => void }) {
  const [guests, setGuests] = useState<InviteGuests | null>(null);
  const [msg, setMsg] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.inviteGuests(invite.id).then(setGuests).catch(() => setGuests(null));
  }, [invite.id]);
  useEffect(load, [load]);

  async function act(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    setNote(null);
    try {
      await fn();
      if (ok) setNote(ok);
      load();
      onChanged();
    } catch (e) {
      setNote(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  // I7: move into an org the host admins, then open the draft in Studio.
  async function sellInstead() {
    setBusy(true);
    setNote(null);
    try {
      const orgs = (await api.memberships())
        .filter((m) => m.role === 'admin')
        .map((m) => ({ id: m.org?.id ?? m.org_id ?? '', name: m.org?.name ?? 'your organisation' }))
        .filter((o) => o.id);
      if (!orgs.length) {
        window.location.href = `${STUDIO_URL}/setup`;
        return;
      }
      let org = orgs[0];
      if (orgs.length > 1) {
        const pick = window.prompt(
          `Move into which organisation?\n${orgs.map((o, i) => `${i + 1}. ${o.name}`).join('\n')}`,
          '1'
        );
        if (pick == null) return;
        org = orgs[Math.max(0, Math.min(orgs.length - 1, Number(pick) - 1 || 0))];
      }
      if (!window.confirm(`Move “${invite.title}” into ${org.name} as a draft ticketed event? Going guests keep free spots.`)) return;
      const { event_id } = await api.moveInvite(invite.id, org.id);
      window.location.href = `${STUDIO_URL}/events/${encodeURIComponent(event_id)}`;
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 405 || e.status === 501)) {
        window.location.href = STUDIO_URL;
        return;
      }
      setNote(e instanceof ApiError && e.code === 'already_moved' ? 'This invite was already moved.' : errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const requested = guests?.requested ?? [];

  return (
    <>
      {requested.length ? (
        <div className="flex flex-col gap-3 border-t border-night-border pt-4">
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-night-muted">
            Asking to join
          </span>
          {requested.map((r: InviteRsvp) => (
            <div key={r.user_id ?? r.name} className="flex items-center gap-2.5">
              <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-night-muted text-[13px] font-extrabold text-night">
                {nameInitials(r.name ?? 'Guest')}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] text-sand">
                {r.name ?? 'Guest'}
                {r.plus_ones ? <span className="text-night-muted"> +{r.plus_ones}</span> : null}
              </span>
              <OutlineBtn onClick={() => act(() => api.decideRsvp(invite.id, r.user_id!, false))}>
                Decline
              </OutlineBtn>
              <button
                type="button"
                disabled={busy || !r.user_id}
                onClick={() => act(() => api.decideRsvp(invite.id, r.user_id!, true))}
                className="rounded-full bg-gold px-4 py-[9px] text-[14px] font-semibold text-night disabled:opacity-50"
              >
                Approve
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-night-border pt-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-[18px] font-extrabold text-sand">Message guests</span>
          <span className="text-[13px] leading-[1.5] text-night-muted">
            Push for app users, SMS for everyone else. Shows in Activity.
          </span>
        </span>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Running 20 min late!"
          rows={3}
          className="w-full rounded-xl border border-night-border bg-night px-3.5 py-3 text-[15px] text-sand outline-none placeholder:text-night-muted focus:border-gold"
        />
        <button
          type="button"
          disabled={busy || !msg.trim()}
          onClick={() =>
            act(async () => {
              const r = await api.messageGuests(invite.id, msg.trim());
              setMsg('');
              setNote(`Sent to ${r.recipients} guest${r.recipients === 1 ? '' : 's'}.`);
            })
          }
          className="self-start rounded-full bg-gold px-[18px] py-[11px] text-[15px] font-semibold text-night disabled:opacity-50"
        >
          Send blast
        </button>
        {note ? <div className="text-[14px] font-semibold text-sand/90">{note}</div> : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-night-border pt-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold text-sand">Want to charge for this?</span>
        </span>
        <div className="flex flex-wrap gap-2">
          <OutlineBtn onClick={() => void sellInstead()}>Sell tickets instead</OutlineBtn>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Cancel this invite? Everyone who replied will be told.')) {
                void act(() => api.cancelInvite(invite.id), 'Invite cancelled.');
              }
            }}
            className="rounded-full border-[1.5px] border-rumman/60 px-4 py-[9px] text-[14px] font-semibold text-rumman transition hover:bg-rumman/10 disabled:opacity-50"
          >
            Cancel event
          </button>
        </div>
      </div>
    </>
  );
}

/** PE2/PE5/PE6: date poll, photo album, activity feed — the v3 invite
 *  extras, in spec order (poll → album → activity) on the left column. */
function InviteExtras({
  inviteId,
  isHost,
  poll,
  going,
  onChanged,
}: {
  inviteId: string;
  isHost: boolean;
  poll?: InvitePoll;
  going?: boolean;
  onChanged: () => void;
}) {
  const { requireAuth } = useAuth();
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set(poll?.my_option_ids ?? []));
  const [posts, setPosts] = useState<InvitePost[]>([]);
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const loadExtras = useCallback(() => {
    if (!inviteId) return;
    api.inviteActivity(inviteId).then((r) => setPosts(r.posts)).catch(() => {});
    api.invitePhotos(inviteId).then((r) => setPhotos(r.photos)).catch(() => {});
  }, [inviteId]);

  useEffect(() => {
    loadExtras();
  }, [loadExtras]);

  async function toggleVote(optionId: string) {
    const next = new Set(myVotes);
    next.has(optionId) ? next.delete(optionId) : next.add(optionId);
    setMyVotes(next);
    try {
      await api.voteInvitePoll(inviteId, [...next]);
      onChanged();
    } catch { /* keep optimistic state */ }
  }

  async function post() {
    const body = draft.trim();
    if (!body) return;
    const parent = replyTo;
    setDraft('');
    setReplyTo(null);
    try {
      await api.postInviteActivity(inviteId, body, parent ?? undefined);
      loadExtras();
    } catch {}
  }

  const open = poll && !poll.locked && (poll.options?.length ?? 0) > 0;

  return (
    <>
      {open ? (
        <div className="flex max-w-[620px] flex-col gap-2.5 rounded-[18px] bg-night-elevated px-5 py-[18px]">
          <span className="flex flex-col gap-0.5">
            <span className="text-[18px] font-extrabold text-sand">When works for you?</span>
            <span className="text-[14px] text-night-muted">Tap every time that works.</span>
          </span>
          {poll!.options!.map((o) => {
            const mine = myVotes.has(o.id);
            return (
              <div key={o.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => requireAuth('rsvp', () => void toggleVote(o.id))}
                  className={`flex flex-1 items-center justify-between gap-2 rounded-xl border-[1.5px] px-4 py-2.5 text-start text-[14px] font-medium transition ${
                    mine
                      ? 'border-gold bg-gold/15 text-sand'
                      : 'border-night-border text-sand hover:border-gold/50'
                  }`}
                >
                  <span>{venueDateTime(o.starts_at)}</span>
                  <span className="text-night-muted">{o.votes} {o.votes === 1 ? 'vote' : 'votes'}</span>
                </button>
                {isHost ? (
                  <button
                    type="button"
                    onClick={() => void api.lockInvitePoll(inviteId, o.id).then(onChanged).catch(() => {})}
                    className="rounded-full bg-gold px-[18px] py-[11px] text-[15px] font-semibold text-night"
                  >
                    Lock in
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {photos.length || going ? (
        <div className="flex flex-col gap-3.5 border-t border-night-elevated pt-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-[24px] font-extrabold tracking-[-0.02em] text-sand">Photo album</span>
              <span className="text-[14px] text-night-muted">{photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'}` : 'Shared by everyone invited'}</span>
            </span>
            {going ? <OutlineBtn onClick={() => {
              const url = window.prompt('Photo link');
              if (url) void api.addInvitePhotos(inviteId, [url]).then(loadExtras).catch(() => {});
            }}>+ Add photos</OutlineBtn> : null}
          </div>
          {photos.length ? (
            <div className="grid grid-cols-4 gap-2">
              {photos.map((p) => (
                <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl">
                  <img src={p.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border-[1.5px] border-dashed border-night-border p-[18px] text-[15px] leading-[1.5] text-night-muted">
              No photos yet. Add the first one.
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-3.5 border-t border-night-elevated pt-2.5">
        <span className="flex flex-col gap-0.5">
          <span className="text-[24px] font-extrabold tracking-[-0.02em] text-sand">Activity</span>
          <span className="text-[14px] text-night-muted">Posts and updates from the host and guests.</span>
        </span>

        <div className="flex max-w-[620px] flex-col gap-2.5 rounded-2xl bg-night-elevated p-3.5">
          {replyTo ? (
            <div className="flex items-center gap-2.5 text-[13px] text-gold">
              Replying to a comment
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-night-muted underline"
              >
                Cancel
              </button>
            </div>
          ) : null}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void post()}
            placeholder={replyTo ? 'Reply…' : 'Say something…'}
            className="w-full rounded-xl border border-night bg-night px-3.5 py-3 text-[15px] text-sand outline-none placeholder:text-night-muted focus:border-gold"
          />
          <div className="flex items-center justify-between gap-2.5">
            <span className="text-[12px] text-night-muted">Only people invited can see this.</span>
            <button
              type="button"
              onClick={() => void post()}
              disabled={!draft.trim()}
              className="rounded-full bg-gold px-[18px] py-[11px] text-[15px] font-semibold text-night disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </div>

        {posts.length === 0 ? (
          <p className="text-[15px] text-night-muted">Nothing yet. Say hi or ask what to bring.</p>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="flex max-w-[620px] gap-3.5">
              <span
                className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full text-[13px] font-bold"
                style={{ background: toneOf(p.authorName ?? p.id), color: '#f7f1e6' }}
              >
                {nameInitials(p.authorName ?? 'Guest')}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-[15px] leading-[1.4]">
                  <strong className="text-gold">{p.authorName ?? 'Guest'}</strong>
                  {p.kind === 'blast' ? <span className="text-night-muted"> · host</span> : null}
                </span>
                <span className="whitespace-pre-wrap text-[16px] leading-[1.55] text-sand">{p.body}</span>
                <span className="flex items-center gap-3.5 text-[13px] text-night-muted">
                  {p.legacy !== true ? (
                    <button
                      type="button"
                      onClick={() => void api.likeInviteActivity(inviteId, p.id).then(loadExtras).catch(() => {})}
                      className={`rounded-full px-3 py-[5px] font-semibold ${p.liked_by_me ? 'bg-rumman/20 text-sand' : 'bg-night-elevated text-sand'}`}
                    >
                      ♥ {p.likeCount ?? 0}
                    </button>
                  ) : null}
                  {p.legacy !== true ? (
                    <button type="button" className="font-semibold text-night-muted" onClick={() => setReplyTo(p.id)}>
                      Reply
                    </button>
                  ) : null}
                </span>
                {(p.replies ?? []).map((r) => (
                  <div key={r.id} className="border-l-2 border-night-border py-0.5 pl-3 text-[15px] leading-[1.45]">
                    <strong className="text-sand">{r.authorName ?? 'Guest'}</strong>
                    <p className="text-night-muted">{r.body}</p>
                  </div>
                ))}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
