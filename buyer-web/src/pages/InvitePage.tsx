import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api, type Invite, type InviteGuests, type InvitePageResponse, type InviteRsvp, type RsvpStatus } from '../lib/api';
import { useAuth } from '../lib/auth';
import { INVITE_REPORT_BUTTON, MAX_PLUS_ONES, STUDIO_URL } from '../lib/config';
import { formatRelative, nameInitials, venueDateTime } from '../lib/format';
import { ShareRow, coverClass, inviteLink } from '../components/HostFlow';
import { Button, Card, Spinner, Textarea } from '../components/ui';

type Loaded = { invite: Invite; page: InvitePageResponse };

const STATUS_COPY: Record<RsvpStatus, string> = {
  going: 'You’re going',
  maybe: 'You said maybe',
  no: 'You can’t make it',
  requested: 'Request sent. The host will let you know.',
  declined: 'The host couldn’t fit you in this time.',
};

function errMsg(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong';
  if (e.code === 'full') return 'It’s full. The host has reached the guest limit.';
  if (e.code === 'plus_ones_not_allowed') return 'This invite doesn’t allow plus-ones.';
  if (e.code === 'host_cannot_rsvp') return 'You’re the host of this one.';
  return e.message;
}

function Faces({ faces, going }: { faces: InvitePageResponse['faces']; going: number }) {
  const list = (faces ?? []).slice(0, 6);
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2 rtl:space-x-reverse">
        {list.map((f, i) => {
          const label = typeof f === 'string' ? f : f.initials ?? nameInitials(f.name);
          return (
            <span key={i} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-night bg-night-elevated text-xs font-bold text-gold">
              {label}
            </span>
          );
        })}
      </div>
      <span className="text-sm text-night-muted">{going} going</span>
    </div>
  );
}

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

  const bucket = (title: string, rows: InviteRsvp[] | undefined, approvable = false) =>
    rows && rows.length ? (
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/50">
          {title} · {rows.length}
        </div>
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.user_id ?? r.name} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm">
              <span className="font-semibold">
                {r.name ?? 'Guest'}
                {r.plus_ones ? <span className="text-ink/50"> +{r.plus_ones}</span> : null}
              </span>
              {approvable && r.user_id ? (
                <span className="flex gap-1.5">
                  <Button className="px-3 py-1" disabled={busy} onClick={() => act(() => api.decideRsvp(invite.id, r.user_id!, true))}>
                    Approve
                  </Button>
                  <Button variant="outline" tone="light" className="px-3 py-1" disabled={busy} onClick={() => act(() => api.decideRsvp(invite.id, r.user_id!, false))}>
                    Decline
                  </Button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  const checkedIn = guests ? (typeof guests.checked_in === 'number' ? guests.checked_in : guests.checked_in.length) : 0;

  return (
    <Card tone="light" className="space-y-5 bg-sand p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="font-display text-lg font-extrabold text-ink">You’re hosting</div>
        {guests ? <span className="text-xs font-semibold text-ink/50">{checkedIn} checked in</span> : null}
      </div>
      <ShareRow link={inviteLink(invite.code)} title={invite.title} />
      {guests ? (
        <div className="space-y-4">
          {bucket('Requests', guests.requested, true)}
          {bucket('Going', guests.going)}
          {bucket('Maybe', guests.maybe)}
          {bucket('Can’t', guests.no)}
        </div>
      ) : (
        <Spinner className="border-night border-t-transparent" />
      )}
      <div className="space-y-2 border-t border-ink/10 pt-4">
        <div className="text-sm font-semibold text-ink">Message guests</div>
        <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Running 20 min late!" />
        <Button
          variant="night"
          disabled={busy || !msg.trim()}
          onClick={() =>
            act(async () => {
              const r = await api.messageGuests(invite.id, msg.trim());
              setMsg('');
              setNote(`Sent to ${r.recipients} guest${r.recipients === 1 ? '' : 's'}.`);
            })
          }
        >
          Send update
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-ink/10 pt-4">
        <a href={STUDIO_URL} className="inline-flex items-center rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink hover:bg-dune/60">
          Sell tickets instead
        </a>
        <Button
          variant="danger"
          disabled={busy}
          onClick={() => {
            if (window.confirm('Cancel this invite? Everyone who replied will be told.')) {
              void act(() => api.cancelInvite(invite.id), 'Invite cancelled.');
            }
          }}
        >
          Cancel invite
        </Button>
      </div>
      {note ? <div className="text-sm font-semibold text-ink/70">{note}</div> : null}
    </Card>
  );
}

/** Public invite page `/i/{code}` (rules I1–I10). Link-only, works signed out. */
export default function InvitePage() {
  const { code = '' } = useParams<{ code: string }>();
  const { user, requireAuth } = useAuth();
  const [data, setData] = useState<Loaded | null>(null);
  const [loadErr, setLoadErr] = useState<{ code?: string; message: string } | null>(null);
  const [plus, setPlus] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);

  const load = useCallback(async () => {
    try {
      const page = await api.invite(code);
      const invite = (page.invite ?? page) as Invite;
      setData({ invite, page });
      setPlus(page.my_rsvp?.plus_ones ?? 0);
      setLoadErr(null);
    } catch (e) {
      setLoadErr(e instanceof ApiError ? { code: e.code, message: e.message } : { message: 'Could not load invite' });
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load, user?.id]);

  if (!data && !loadErr) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (loadErr || !data) {
    const cancelled = loadErr?.code === 'cancelled';
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <div className="font-display text-3xl font-extrabold text-sand">{cancelled ? 'This was cancelled' : 'Invite not found'}</div>
        <p className="mt-2 text-sm text-night-muted">{cancelled ? 'The host called it off.' : 'Check the link with whoever sent it.'}</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-night">
          See what’s on
        </Link>
      </div>
    );
  }

  const { invite, page } = data;
  const isHost = Boolean(page.is_host || (user && invite.host_user_id && invite.host_user_id === user.id));
  const my = page.my_rsvp ?? null;
  const counts = page.counts ?? {};
  const going = counts.going ?? 0;
  const seatsTaken = going + (counts.plus_ones ?? 0);
  const cap = invite.guest_cap ?? null;
  const cancelled = invite.status === 'cancelled';
  const moved = invite.status === 'moved';
  const past = new Date(invite.starts_at).getTime() < Date.now() - 6 * 3_600_000;
  const closed = cancelled || moved || past;
  const full = cap != null && seatsTaken >= cap && my?.status !== 'going';
  const placeHidden = invite.hide_address_until_going && !invite.place_text;

  async function submit(status: RsvpStatus, plusOnes: number) {
    setBusy(true);
    setError(null);
    try {
      await api.rsvp(invite.id, status, status === 'going' && invite.allow_plus_ones ? plusOnes : 0);
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  // A2: action-triggered sign-in, then the RSVP continues.
  const answer = (status: RsvpStatus) => requireAuth('rsvp', () => void submit(status, plus));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <div className={`relative overflow-hidden rounded-card bg-gradient-to-br ${coverClass(invite.cover)} p-6 sm:p-8`}>
        <div className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/40 to-transparent" />
        <div className="relative pt-24">
          <div className="flex items-center gap-2 text-sm text-sand/80">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-night text-[11px] font-bold text-gold">
              {page.host.initials || nameInitials(page.host.name)}
            </span>
            {page.host.name} invited you
          </div>
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-sand">{invite.title}</h1>
          <p className="mt-2 text-sm font-semibold text-sand/90">{venueDateTime(invite.starts_at, invite.tz)}</p>
          <p className="mt-1 text-sm text-sand/80">
            {placeHidden ? (
              <>
                {invite.area ? `${invite.area} · ` : ''}
                <span className="italic">Address shown once you’re going</span>
              </>
            ) : (
              invite.place_text
            )}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {invite.note ? <p className="whitespace-pre-line text-base text-sand/90">{invite.note}</p> : null}

        {invite.show_guest_list || isHost ? <Faces faces={page.faces} going={going} /> : null}

        {isHost ? (
          <HostPanel invite={invite} onChanged={() => void load()} />
        ) : closed ? (
          <Card className="p-5 text-center">
            <div className="font-display text-lg font-bold text-sand">
              {cancelled ? 'This was cancelled' : moved ? 'This is now a ticketed event' : 'This has ended'}
            </div>
            {moved && invite.moved_to_event_id ? (
              <Link to={`/events/${invite.moved_to_event_id}`} className="mt-3 inline-block rounded-full bg-gold px-5 py-2 text-sm font-bold text-night">
                Get tickets
              </Link>
            ) : null}
          </Card>
        ) : (
          <Card className="space-y-4 p-5">
            {my ? <div className="text-sm font-semibold text-gold">{STATUS_COPY[my.status]}{my.plus_ones ? ` · +${my.plus_ones}` : ''}</div> : null}
            {full ? (
              <div className="rounded-xl bg-rumman/15 px-3 py-2 text-sm font-semibold text-red-200">It’s full. The host has reached the guest limit.</div>
            ) : null}
            {invite.allow_plus_ones && !full ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-sand">Bringing anyone?</span>
                <div className="flex items-center gap-1 rounded-full bg-night-deep p-1">
                  {Array.from({ length: MAX_PLUS_ONES + 1 }, (_, n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={plus === n}
                      onClick={() => setPlus(n)}
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${plus === n ? 'bg-gold text-night' : 'text-sand/70'}`}
                    >
                      {n === 0 ? 'Just me' : `+${n}`}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {invite.approve_guests && my?.status !== 'going' ? (
              <div className="space-y-2">
                <Button className="w-full" disabled={busy || full || my?.status === 'requested'} onClick={() => answer('going')}>
                  {busy ? <Spinner className="border-night border-t-transparent" /> : null}
                  {my?.status === 'requested' ? 'Requested' : 'Request to join'}
                </Button>
                <p className="text-center text-xs text-night-muted">The host approves each guest.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['going', 'Going'],
                    ['maybe', 'Maybe'],
                    ['no', 'Can’t'],
                  ] as const
                ).map(([s, label]) => (
                  <Button
                    key={s}
                    variant={my?.status === s ? 'gold' : 'ghost'}
                    disabled={busy || (s === 'going' && full)}
                    onClick={() => answer(s)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
            {error ? <div role="alert" className="text-sm font-semibold text-red-200">{error}</div> : null}
            {!user ? <p className="text-center text-xs text-night-muted">No app needed. We’ll text you a code to confirm.</p> : null}
          </Card>
        )}

        {page.updates?.length ? (
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-night-muted">From the host</h2>
            <ul className="space-y-2">
              {page.updates.map((u, i) => (
                <li key={u.id ?? i} className="rounded-xl bg-night-surface px-4 py-3">
                  <p className="text-sm text-sand">{u.body}</p>
                  <p className="mt-1 text-[11px] text-night-muted">{formatRelative(u.sent_at)}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {INVITE_REPORT_BUTTON && !isHost ? (
          <div className="text-center">
            <button
              type="button"
              disabled={reported}
              onClick={() =>
                requireAuth('other', () => {
                  if (!window.confirm('Report this invite to Sahra?')) return;
                  api
                    .reportInvite(invite.id)
                    .then(() => setReported(true))
                    .catch(() => setReported(true));
                })
              }
              className="text-xs font-semibold text-night-muted underline disabled:no-underline"
            >
              {reported ? 'Thanks, we’ll take a look' : 'Report this invite'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
