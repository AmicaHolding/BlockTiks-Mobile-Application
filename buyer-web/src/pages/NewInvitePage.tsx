import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import { venueDateTime } from '../lib/format';

const TONES = [
  { c: '#f2d9a0', label: 'Gold' },
  { c: '#b8323a', label: 'Rumman' },
  { c: '#2f5c58', label: 'Palm' },
  { c: '#2a4a6e', label: 'Sea' },
  { c: '#5a3a5e', label: 'Plum' },
];
const STRIPES = (tone: string) =>
  `repeating-linear-gradient(135deg, ${tone} 0 18px, #2a3b52 18px 36px)`;

const DEADLINES = [
  { id: 'none', n: 'No deadline', txt: 'Guests can reply until it starts.' },
  { id: '1d', n: '1 day before', txt: 'Replies close the day before it starts.' },
  { id: '3d', n: '3 days before', txt: 'Replies close 3 days before it starts.' },
  { id: '1w', n: '1 week before', txt: 'Replies close a week before it starts.' },
] as const;
type Deadline = (typeof DEADLINES)[number]['id'];

const REMINDER_OPTS = [
  { id: '1w', n: 'A week before' },
  { id: '1d', n: 'A day before' },
  { id: '2h', n: '2 hours before' },
] as const;
type Reminder = (typeof REMINDER_OPTS)[number]['id'];

const STYLES = [
  { id: 'words', n: 'Words' },
  { id: 'emoji', n: 'Emoji' },
  { id: 'custom', n: 'Custom' },
] as const;
type RsvpStyle = (typeof STYLES)[number]['id'];

const input =
  'w-full rounded-xl border-[1.5px] border-night-surface bg-night-surface px-3.5 py-3 text-base text-sand outline-none transition focus:border-gold placeholder:text-night-muted/70';
const chip = (on: boolean) =>
  `rounded-full border-none px-3.5 py-2 text-[14px] font-medium cursor-pointer transition ${
    on ? 'bg-gold text-night' : 'bg-night-surface text-night-subtle hover:text-sand'
  }`;

type PollOpt = { d: string; t: string };

/** fCreate — "New invite" page (spec): form left, live guest preview right. */
export default function NewInvitePage() {
  const navigate = useNavigate();
  const [tone, setTone] = useState(TONES[0].c);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'one' | 'poll'>('one');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('20:00');
  const [opts, setOpts] = useState<PollOpt[]>([
    { d: '', t: '20:00' },
    { d: '', t: '20:00' },
  ]);
  const [place, setPlace] = useState('');
  const [about, setAbout] = useState('');
  const [deadline, setDeadline] = useState<Deadline>('none');
  const [cap, setCap] = useState(0);
  const [style, setStyle] = useState<RsvpStyle>('words');
  const [labels, setLabels] = useState({ going: '', maybe: '', no: '' });
  const [reminders, setReminders] = useState<Reminder[]>(['1d', '2h']);
  const [approve, setApprove] = useState(false);
  const [plusOnes, setPlusOnes] = useState(true);
  const [showList, setShowList] = useState(true);
  const [hideAddr, setHideAddr] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const rsvpLabels = {
    going: labels.going || (style === 'emoji' ? '👍' : 'Going'),
    maybe: labels.maybe || (style === 'emoji' ? '🤔' : 'Maybe'),
    no: labels.no || (style === 'emoji' ? '🙅' : "Can't go"),
  };
  const previewWhen =
    mode === 'one' && date
      ? venueDateTime(new Date(`${date}T${time}`).toISOString())
      : mode === 'poll'
        ? 'Guests vote on the date'
        : 'Pick a date';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError('Give it a name');
    if (!place.trim()) return setError('Add a place');
    if (mode === 'one' && !date) return setError('Pick a date and time');
    setBusy(true);
    try {
      const body: Parameters<typeof api.createInvite>[0] = {
        title: title.trim(),
        place_text: place.trim(),
        cover: { tone },
        note: about.trim(),
        approve_guests: approve,
        allow_plus_ones: plusOnes,
        guest_cap: cap > 0 ? cap : null,
        show_guest_list: showList,
        hide_address_until_going: hideAddr,
        rsvp_deadline: deadline,
        rsvp_style: style,
        reminders,
      };
      if (mode === 'one') {
        body.starts_at = new Date(`${date}T${time}`).toISOString();
      } else {
        const filled = opts.filter((o) => o.d);
        if (filled.length < 2) {
          setBusy(false);
          return setError('Add at least 2 dates for guests to vote on');
        }
        body.poll_options = filled.map((o) => ({
          starts_at: new Date(`${o.d}T${o.t || '20:00'}`).toISOString(),
        }));
      }
      if (style === 'custom') {
        body.rsvp_labels = {
          going: labels.going || undefined,
          maybe: labels.maybe || undefined,
          no: labels.no || undefined,
        };
      }
      const res = await api.createInvite(body);
      navigate(`/i/${res.invite.code}`, { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the invite');
      setBusy(false);
    }
  }

  const toggle = (id: Reminder) =>
    setReminders((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));

  return (
    <form
      onSubmit={submit}
      className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-11 px-6 pb-14 pt-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,1fr)] lg:px-14"
    >
      {/* ——— left: the form ——— */}
      <div className="flex min-w-0 flex-col gap-[18px]">
        <Link to="/plans" className="self-start text-[14px] text-night-muted transition hover:text-sand">
          ← Plans
        </Link>
        <h1 className="text-[40px] font-extrabold leading-none tracking-[-0.03em] text-sand">
          New invite
        </h1>

        {/* Cover — spec allows a photo; upload endpoint doesn't exist yet,
            so the tone swatches cover it (TODO: file pick → upload). */}
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-night-muted">Cover</span>
          <div className="flex items-center gap-2">
            {TONES.map((t) => (
              <button
                key={t.c}
                type="button"
                aria-label={t.label}
                onClick={() => setTone(t.c)}
                className="h-[30px] w-[30px] rounded-full transition"
                style={{ background: t.c, border: `2.5px solid ${tone === t.c ? '#f2d9a0' : 'transparent'}` }}
              />
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] text-night-muted">
          What’s happening
          <input
            className={input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Friday rooftop dinner"
            maxLength={120}
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-night-muted">When</span>
          <div className="flex self-start rounded-full bg-night-surface p-[3px]">
            {(
              [
                ['one', 'One date'],
                ['poll', 'Ask guests'],
              ] as const
            ).map(([id, n]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`rounded-full border-none px-4 py-[9px] text-[14px] font-semibold cursor-pointer transition ${
                  mode === id ? 'bg-gold text-night' : 'bg-transparent text-night-subtle'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          {mode === 'one' ? (
            <div className="grid grid-cols-[1.4fr_1fr] gap-2.5">
              <input
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Date"
                className={`${input} min-w-0 [color-scheme:dark]`}
              />
              <input
                type="time"
                step={900}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                aria-label="Start time"
                className={`${input} min-w-0 [color-scheme:dark]`}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-2xl bg-night-surface p-3.5">
              <span className="text-[13px] leading-snug text-night-muted">
                Add 2 to 4 options. Guests vote, then you lock one in and everyone’s told.
              </span>
              {opts.map((o, i) => (
                <div key={i} className="grid grid-cols-[1.4fr_1fr_40px] items-center gap-2">
                  <input
                    type="date"
                    min={today}
                    value={o.d}
                    onChange={(e) => setOpts(opts.map((x, j) => (j === i ? { ...x, d: e.target.value } : x)))}
                    aria-label="Option date"
                    className={`${input} min-w-0 border-night bg-night [color-scheme:dark]`}
                  />
                  <input
                    type="time"
                    step={900}
                    value={o.t}
                    onChange={(e) => setOpts(opts.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)))}
                    aria-label="Option time"
                    className={`${input} min-w-0 border-night bg-night [color-scheme:dark]`}
                  />
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => setOpts(opts.filter((_, j) => j !== i))}
                    disabled={opts.length <= 2}
                    className="h-9 w-9 rounded-full border-none bg-night text-night-subtle text-base cursor-pointer disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              ))}
              {opts.length < 4 ? (
                <button
                  type="button"
                  onClick={() => setOpts([...opts, { d: '', t: '20:00' }])}
                  className="self-start border-none bg-transparent pt-1.5 text-[15px] font-semibold text-gold cursor-pointer"
                >
                  + Add a date
                </button>
              ) : null}
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] text-night-muted">
          Where
          <input
            className={input}
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="Address or place name"
            maxLength={300}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-[13px] text-night-muted">
          Description
          <textarea
            className={`${input} resize-y leading-relaxed`}
            rows={5}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="What’s the plan? What to bring, dress code, a playlist link"
            maxLength={2000}
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-night-muted">RSVP by</span>
          <div className="flex flex-wrap gap-2">
            {DEADLINES.map((d) => (
              <button key={d.id} type="button" onClick={() => setDeadline(d.id)} className={chip(deadline === d.id)}>
                {d.n}
              </button>
            ))}
          </div>
          <span className="text-[12px] text-night-muted">{DEADLINES.find((d) => d.id === deadline)?.txt}</span>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-night-surface px-4 py-3.5">
          <span className="flex flex-col gap-0.5">
            <strong className="text-[15px] text-sand">Guest limit</strong>
            <span className="text-[13px] text-night-muted">
              {cap > 0 ? `Only ${cap} can say going. The rest get told it's full.` : 'Everyone can come.'}
            </span>
          </span>
          <span className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Lower limit"
              onClick={() => setCap(Math.max(0, cap - 5))}
              className="h-[34px] w-[34px] rounded-full border-[1.5px] border-night-border text-[18px] text-sand cursor-pointer"
            >
              −
            </button>
            <strong className="min-w-[40px] text-center text-sand">{cap > 0 ? cap : '∞'}</strong>
            <button
              type="button"
              aria-label="Raise limit"
              onClick={() => setCap(Math.min(10000, cap + 5))}
              className="h-[34px] w-[34px] rounded-full border-none bg-gold text-[18px] text-night cursor-pointer"
            >
              +
            </button>
          </span>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-night-surface px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <strong className="text-[15px] text-sand">RSVP buttons</strong>
            <div className="flex rounded-full bg-night p-[3px]">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className={`rounded-full border-none px-3 py-[7px] text-[13px] font-semibold cursor-pointer transition ${
                    style === s.id ? 'bg-gold text-night' : 'bg-transparent text-night-subtle'
                  }`}
                >
                  {s.n}
                </button>
              ))}
            </div>
          </div>
          {style === 'custom' ? (
            <div className="grid grid-cols-3 gap-2">
              {(['going', 'maybe', 'no'] as const).map((k) => (
                <input
                  key={k}
                  value={labels[k]}
                  onChange={(e) => setLabels({ ...labels, [k]: e.target.value })}
                  maxLength={16}
                  placeholder={{ going: 'Going', maybe: 'Maybe', no: "Can't go" }[k]}
                  className="min-w-0 rounded-[10px] border-[1.5px] border-night bg-night px-2 py-2.5 text-center text-[14px] text-sand outline-none transition focus:border-gold placeholder:text-night-muted/60"
                />
              ))}
            </div>
          ) : null}
          <span className="text-[12px] text-night-muted">
            What guests tap. Behind the scenes it’s still going, maybe or can’t go.
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-night-muted">Reminders · push or SMS to going and maybe</span>
          <div className="flex flex-wrap gap-2">
            {REMINDER_OPTS.map((r) => (
              <button key={r.id} type="button" onClick={() => toggle(r.id)} className={chip(reminders.includes(r.id))}>
                {r.n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          {(
            [
              ['Approve guests', 'People request, you say yes', approve, setApprove],
              ['Allow plus-ones', 'Up to 2 each', plusOnes, setPlusOnes],
              ['Show who’s going', 'Guest list on the invite page', showList, setShowList],
              ['Hide address', 'Only shown to people who are going', hideAddr, setHideAddr],
            ] as const
          ).map(([n, d, on, set]) => (
            <div key={n} className="flex items-center justify-between gap-3 border-b border-night-elevated py-3 last:border-b-0">
              <span className="flex flex-col gap-0.5 text-[15px] text-sand">
                {n}
                <span className="text-[13px] text-night-muted">{d}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => set(!on)}
                className={`relative h-7 w-12 flex-none rounded-full border-none transition ${on ? 'bg-gold' : 'bg-night-border'}`}
              >
                <span
                  className="absolute top-[3px] h-[22px] w-[22px] rounded-full transition-all"
                  style={{ left: on ? 23 : 3, background: on ? '#16263b' : '#9fb0c6' }}
                />
              </button>
            </div>
          ))}
        </div>

        {error ? <span role="alert" className="text-[14px] text-rumman">{error}</span> : null}

        <button
          type="submit"
          disabled={busy}
          className="rounded-full border-none bg-gold py-[15px] text-base font-semibold text-night transition hover:brightness-95 disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create invite'}
        </button>
      </div>

      {/* ——— right: live preview ——— */}
      <div className="overflow-hidden rounded-3xl bg-night-surface lg:sticky lg:top-5">
        <div className="relative h-[240px]" style={{ background: STRIPES(tone) }} />
        <div className="flex flex-col gap-2.5 px-[22px] pb-6 pt-5">
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-night-muted">
            Preview · what guests see
          </span>
          <strong className="text-[24px] font-extrabold leading-tight tracking-[-0.02em] text-sand">
            {title || 'Friday rooftop dinner'}
          </strong>
          <span className="text-[15px] text-night-subtle">{previewWhen}</span>
          <span className="text-[15px] text-night-muted">{place || 'Address or place name'}</span>
          <div className="grid grid-cols-3 gap-2 pt-1.5">
            {[rsvpLabels.going, rsvpLabels.maybe, rsvpLabels.no].map((l) => (
              <span
                key={l}
                className="truncate whitespace-nowrap rounded-full border-[1.5px] border-night-border px-1 py-[11px] text-center text-[14px] font-semibold text-sand"
              >
                {l}
              </span>
            ))}
          </div>
          <span className="text-[13px] leading-relaxed text-night-muted">
            Link-only and never listed on Sahra. Guests reply with their phone number, no app needed.
          </span>
        </div>
      </div>
    </form>
  );
}
