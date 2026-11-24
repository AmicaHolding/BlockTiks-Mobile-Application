import { createContext, useCallback, useContext, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api, type Invite } from '../lib/api';
import { useAuth } from '../lib/auth';
import { STUDIO_URL } from '../lib/config';
import Modal from './Modal';
import { Button, Field, Input, Spinner, Textarea } from './ui';

type HostMode = 'who' | 'personal' | 'public';

interface HostState {
  /** "+ Host" (web prototype v2): Who's it for → personal invite or Studio. */
  openHost: (mode?: HostMode) => void;
}

const HostContext = createContext<HostState | null>(null);

// Prototype covers: tone swatches, no upload on web.
const COVERS = [
  { id: 'night', cls: 'from-night-elevated via-night-surface to-night-deep' },
  { id: 'gold', cls: 'from-gold via-gold/70 to-night-elevated' },
  { id: 'rumman', cls: 'from-rumman via-rumman/70 to-night-deep' },
  { id: 'sand', cls: 'from-sand via-dune to-gold/60' },
];

export function coverClass(cover?: string | null): string {
  return (COVERS.find((c) => c.id === cover) ?? COVERS[0]).cls;
}

export function inviteLink(code: string): string {
  return `${window.location.origin}/i/${encodeURIComponent(code)}`;
}

export function ShareRow({ link, title }: { link: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const wa = `https://wa.me/?text=${encodeURIComponent(`${title}\n${link}`)}`;
  return (
    <div className="space-y-3">
      <div dir="ltr" className="truncate rounded-xl bg-dune px-3.5 py-2.5 text-sm font-semibold text-ink/80">
        {link}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-night px-4 py-2.5 text-sm font-semibold text-sand"
        >
          WhatsApp
        </a>
        <Button
          variant="outline"
          tone="light"
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(link).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1800);
            });
          }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
    </div>
  );
}

function WhoModal({ onPersonal, onClose }: { onPersonal: () => void; onClose: () => void }) {
  return (
    <Modal onClose={onClose} label="Who's it for?">
      <div className="font-display text-2xl font-extrabold">Who’s it for?</div>
      <p className="mt-1 text-sm text-ink/60">It’s about who can come, not how big it is.</p>
      <div className="mt-5 space-y-3">
        <button
          type="button"
          onClick={onPersonal}
          className="block w-full rounded-card border border-ink/15 bg-white p-5 text-start transition hover:border-night"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">Hosted by you</span>
          <div className="mt-1 font-display text-lg font-extrabold">People I invite</div>
          <div className="text-sm text-ink/60">Free. Share a link, people RSVP.</div>
        </button>
        <a
          href={STUDIO_URL}
          className="block w-full rounded-card border border-ink/15 bg-white p-5 text-start transition hover:border-night"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">Hosted by an organisation</span>
          <div className="mt-1 font-display text-lg font-extrabold">Anyone, with tickets</div>
          <div className="text-sm text-ink/60">Build and sell in Sahra Studio.</div>
        </a>
      </div>
    </Modal>
  );
}

function Toggle({ label, sub, on, onChange }: { label: string; sub?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {sub ? <span className="block text-xs text-ink/55">{sub}</span> : null}
      </span>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-night" />
    </label>
  );
}

function NewInviteModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('20:00');
  const [place, setPlace] = useState('');
  const [cover, setCover] = useState('night');
  const [note, setNote] = useState('');
  const [cap, setCap] = useState('');
  const [approve, setApprove] = useState(false);
  const [plusOnes, setPlusOnes] = useState(false);
  const [showList, setShowList] = useState(true);
  const [hideAddr, setHideAddr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ invite: Invite; link: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Host-local date/time → UTC instant. Backend stores the host's tz.
      const startsAt = new Date(`${date}T${time}`);
      if (Number.isNaN(startsAt.getTime())) throw new Error('Pick a date and time');
      const capN = cap.trim() ? Math.max(1, Math.floor(Number(cap))) : null;
      const res = await api.createInvite({
        title: title.trim(),
        starts_at: startsAt.toISOString(),
        place_text: place.trim(),
        cover: cover ? { tone: cover } : null,
        note: note.trim(),
        approve_guests: approve,
        allow_plus_ones: plusOnes,
        guest_cap: capN,
        show_guest_list: showList,
        hide_address_until_going: hideAddr,
      });
      setCreated({ invite: res.invite, link: res.link || inviteLink(res.invite.code) });
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Could not create invite');
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <Modal onClose={onClose} label="Share your invite">
        <div className="font-display text-2xl font-extrabold">Your invite is ready</div>
        <p className="mt-1 text-sm text-ink/60">Only people with the link can see it.</p>
        <div className="mt-5">
          <ShareRow link={created.link} title={created.invite.title} />
        </div>
        <Button
          variant="night"
          className="mt-4 w-full"
          onClick={() => {
            onClose();
            navigate(`/i/${encodeURIComponent(created.invite.code)}`);
          }}
        >
          Open invite page
        </Button>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} label="New invite" wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="font-display text-2xl font-extrabold">New invite</div>
        <div className="flex gap-2" role="radiogroup" aria-label="Cover">
          {COVERS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={cover === c.id}
              aria-label={c.id}
              onClick={() => setCover(c.id)}
              className={`h-12 flex-1 rounded-xl bg-gradient-to-br ${c.cls} ${cover === c.id ? 'ring-2 ring-night ring-offset-2 ring-offset-sand' : ''}`}
            />
          ))}
        </div>
        <Field label="Name">
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dinner at mine" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Time">
            <Input required type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label="Where">
          <Input required value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Address or place" />
        </Field>
        <Field label="Note">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bring something sweet." />
        </Field>
        <Field label="Guest limit">
          <Input type="number" min={1} inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="No limit" />
        </Field>
        <div className="divide-y divide-ink/10 rounded-xl bg-white px-4">
          <Toggle label="Approve guests" sub="People request, you say yes" on={approve} onChange={setApprove} />
          <Toggle label="Allow plus-ones" sub="Up to 2 each" on={plusOnes} onChange={setPlusOnes} />
          <Toggle label="Show who’s going" on={showList} onChange={setShowList} />
          <Toggle label="Hide address" sub="Only shown to people who are going" on={hideAddr} onChange={setHideAddr} />
        </div>
        {error ? (
          <div role="alert" className="rounded-xl bg-rumman/10 px-3 py-2 text-sm font-semibold text-rumman">
            {error}
          </div>
        ) : null}
        <Button type="submit" className="w-full" disabled={busy || !title.trim() || !date || !place.trim()}>
          {busy ? <Spinner className="border-night border-t-transparent" /> : null}
          Create invite
        </Button>
        <p className="text-center text-xs text-ink/50">Personal invites are free. Want to charge? Use Sahra Studio.</p>
      </form>
    </Modal>
  );
}

export function HostProvider({ children }: { children: ReactNode }) {
  const { requireAuth } = useAuth();
  const [open, setOpen] = useState<'who' | 'personal' | null>(null);

  const openHost = useCallback(
    (mode: HostMode = 'who') => {
      if (mode === 'public') {
        window.location.href = STUDIO_URL;
        return;
      }
      if (mode === 'personal') requireAuth('host', () => setOpen('personal'));
      else setOpen('who');
    },
    [requireAuth]
  );

  return (
    <HostContext.Provider value={{ openHost }}>
      {children}
      {open === 'who' ? (
        <WhoModal
          onClose={() => setOpen(null)}
          onPersonal={() => {
            setOpen(null);
            requireAuth('host', () => setOpen('personal'));
          }}
        />
      ) : null}
      {open === 'personal' ? <NewInviteModal onClose={() => setOpen(null)} /> : null}
    </HostContext.Provider>
  );
}

export function useHost(): HostState {
  const ctx = useContext(HostContext);
  if (!ctx) throw new Error('useHost must be used within HostProvider');
  return ctx;
}
