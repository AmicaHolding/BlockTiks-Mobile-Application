import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api, type Intent, type OtpVerify } from '../lib/api';
import { useAuth, type SignInReason } from '../lib/auth';
import { STUDIO_URL } from '../lib/config';
import Modal from './Modal';
import { Button, Input, Spinner } from './ui';

const CITIES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Riyadh', 'Jeddah', 'Doha', 'Manama', 'Kuwait City', 'Muscat'];
const INTERESTS = ['Music', 'Nightlife', 'Comedy', 'Food', 'Arts', 'Sports', 'Wellness', 'Family', 'Community'];
const INTENTS: { id: Intent; title: string; sub: string }[] = [
  { id: 'going_out', title: 'Going out', sub: 'Find things to do and buy tickets' },
  { id: 'hosting_friends', title: 'Hosting friends', sub: 'Send invites to people you know' },
  { id: 'running_events', title: 'Running events', sub: 'Sell tickets with Sahra Studio' },
];

const REASON_COPY: Record<SignInReason, string> = {
  menu: 'Sign in or create an account. No password, just a code.',
  buy: 'Sign in to get your tickets. You’ll come right back here.',
  rsvp: 'Sign in so the host knows who’s coming. Your answer is kept.',
  plans: 'Sign in to see your plans.',
  profile: 'Sign in to see your profile.',
  host: 'Sign in to host. It takes a minute.',
  sell: 'Sign in to sell your tickets.',
  offer: 'Sign in to set your price.',
  other: 'Sign in to continue.',
};

type Step = 'contact' | 'code' | 'name' | 'intent' | 'city' | 'org';

function errorText(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (e.code) {
    case 'code_invalid':
    case 'invalid_code':
      return 'That code isn’t right. Check it and try again.';
    case 'code_expired':
      return 'That code has expired. Send a new one.';
    case 'too_many_attempts':
      return 'Too many wrong tries. Send a new code.';
    case 'rate_limited':
      return 'Too many codes sent. Wait a moment and try again.';
    case 'invalid_contact':
      return 'Enter a phone number or an email address.';
    default:
      return e.message;
  }
}

function resendSeconds(v: number | string | undefined): number {
  if (typeof v === 'number') return Math.max(0, Math.round(v));
  if (typeof v === 'string') {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return Math.max(0, Math.round((t - Date.now()) / 1000));
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return 30;
}

/** In-context code sign-in (rules A1, A2). */
export default function SignInModal({
  reason,
  onClose,
  onDone,
}: {
  reason: SignInReason;
  onClose: () => void;
  onDone: () => void;
}) {
  const { login, setUser } = useAuth();
  const actionTriggered = reason !== 'menu';
  const [step, setStep] = useState<Step>('contact');
  const [contact, setContact] = useState('');
  const [challenge, setChallenge] = useState<{ id: string; channel: string } | null>(null);
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [name, setName] = useState('');
  const [intent, setIntent] = useState<Intent[]>([]);
  const [city, setCity] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [verified, setVerified] = useState<OtpVerify | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const sendCode = () =>
    run(async () => {
      const res = await api.otpStart(contact.trim());
      setChallenge({ id: res.challenge_id, channel: res.channel });
      setResendIn(resendSeconds(res.resend_after));
      setCode('');
      setStep('code');
    });

  function finish(v: OtpVerify | null) {
    const landing = v?.landing;
    const toStudio =
      !actionTriggered &&
      ((typeof landing === 'string' && landing.toLowerCase().includes('studio')) ||
        (typeof landing === 'object' && landing?.mode === 'org'));
    onDone();
    if (toStudio) window.location.href = STUDIO_URL;
  }

  const verify = (value: string) =>
    run(async () => {
      if (!challenge) return;
      const res = await api.otpVerify(challenge.id, value);
      login(res.token, res.user, res.refreshToken);
      setVerified(res);
      if (res.is_new || !res.user.name?.trim()) {
        setStep('name');
      } else {
        finish(res);
      }
    });

  const saveName = () =>
    run(async () => {
      const u = await api.updateProfile({ name: name.trim() });
      setUser(u);
      // A2: action-triggered sign-up skips intent / city / interests.
      if (actionTriggered) finish(verified);
      else setStep('intent');
    });

  const saveOnboarding = () =>
    run(async () => {
      const u = await api.updateProfile({ intent, city, interests });
      setUser(u);
      // A3: "Running events" leads to a skippable Create organisation step.
      if (intent.includes('running_events')) setStep('org');
      else finish(verified);
    });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (step === 'contact') void sendCode();
    else if (step === 'code') void verify(code);
    else if (step === 'name') void saveName();
    else if (step === 'intent') setStep('city');
    else if (step === 'city') void saveOnboarding();
  }

  const channelLabel = challenge?.channel === 'email' ? 'email' : challenge?.channel === 'whatsapp' ? 'WhatsApp' : 'text';

  return (
    <Modal onClose={onClose} label="Sign in">
      <form onSubmit={submit} className="space-y-5">
        {step === 'contact' ? (
          <>
            <div>
              <div className="font-display text-2xl font-extrabold">Sign in to Sahra</div>
              <p className="mt-1 text-sm text-ink/60">{REASON_COPY[reason]}</p>
            </div>
            <Input
              autoFocus
              dir="ltr"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="+971 50 123 4567 or you@email.com"
              autoComplete="username"
              aria-label="Phone or email"
            />
            <Button type="submit" className="w-full" disabled={busy || contact.trim().length < 5}>
              {busy ? <Spinner className="border-night border-t-transparent" /> : null}
              Send code
            </Button>
            <p className="text-center text-xs text-ink/50">We’ll send a 6-digit code. New here? This creates your account.</p>
          </>
        ) : null}

        {step === 'code' ? (
          <>
            <div>
              <div className="font-display text-2xl font-extrabold">Enter your code</div>
              <p className="mt-1 text-sm text-ink/60">
                We sent a 6-digit code by {channelLabel} to <span dir="ltr" className="font-semibold text-ink">{contact}</span>.
              </p>
            </div>
            <Input
              autoFocus
              dir="ltr"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(v);
                if (v.length === 6 && !busy) void verify(v);
              }}
              placeholder="••••••"
              className="text-center font-display text-2xl tracking-[0.5em]"
              aria-label="6-digit code"
            />
            <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
              {busy ? <Spinner className="border-night border-t-transparent" /> : null}
              Continue
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" className="font-semibold text-ink/60 hover:text-ink" onClick={() => setStep('contact')}>
                Change number or email
              </button>
              <button
                type="button"
                disabled={resendIn > 0 || busy}
                onClick={() => void sendCode()}
                className="font-semibold text-night underline disabled:text-ink/40 disabled:no-underline"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
          </>
        ) : null}

        {step === 'name' ? (
          <>
            <div>
              <div className="font-display text-2xl font-extrabold">What’s your name?</div>
              <p className="mt-1 text-sm text-ink/60">This is how hosts and friends will see you.</p>
            </div>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
            <Button type="submit" className="w-full" disabled={busy || !name.trim()}>
              {busy ? <Spinner className="border-night border-t-transparent" /> : null}
              Continue
            </Button>
          </>
        ) : null}

        {step === 'intent' ? (
          <>
            <div>
              <div className="font-display text-2xl font-extrabold">What brings you to Sahra?</div>
              <p className="mt-1 text-sm text-ink/60">Pick any that fit.</p>
            </div>
            <div className="space-y-2">
              {INTENTS.map((it) => {
                const on = intent.includes(it.id);
                return (
                  <button
                    key={it.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setIntent((cur) => (on ? cur.filter((x) => x !== it.id) : [...cur, it.id]))}
                    className={`block w-full rounded-xl border px-4 py-3 text-start transition ${on ? 'border-night bg-night text-sand' : 'border-ink/15 bg-white hover:border-ink/30'}`}
                  >
                    <div className="font-semibold">{it.title}</div>
                    <div className={`text-xs ${on ? 'text-sand/70' : 'text-ink/55'}`}>{it.sub}</div>
                  </button>
                );
              })}
            </div>
            <Button type="submit" className="w-full" disabled={intent.length === 0}>
              Continue
            </Button>
          </>
        ) : null}

        {step === 'city' ? (
          <>
            <div>
              <div className="font-display text-2xl font-extrabold">Where are you, and what do you like?</div>
              <p className="mt-1 text-sm text-ink/60">Pick your city and at least one interest.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={city === c}
                  onClick={() => setCity(c)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${city === c ? 'bg-night text-gold' : 'bg-dune text-ink/70'}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-ink/10 pt-4">
              {INTERESTS.map((i) => {
                const on = interests.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setInterests((cur) => (on ? cur.filter((x) => x !== i) : [...cur, i]))}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${on ? 'bg-gold text-night' : 'bg-white text-ink/70 ring-1 ring-ink/10'}`}
                  >
                    {i}
                  </button>
                );
              })}
            </div>
            <Button type="submit" className="w-full" disabled={busy || !city || interests.length === 0}>
              {busy ? <Spinner className="border-night border-t-transparent" /> : null}
              Start exploring
            </Button>
          </>
        ) : null}

        {step === 'org' ? (
          <>
            <div>
              <div className="font-display text-2xl font-extrabold">Set up your organisation</div>
              <p className="mt-1 text-sm text-ink/60">Create it in Sahra Studio to build events and sell tickets. You can do this later.</p>
            </div>
            <a
              href={`${STUDIO_URL}/setup`}
              onClick={() => onDone()}
              className="inline-flex w-full items-center justify-center rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-night hover:brightness-95"
            >
              Create organisation
            </a>
            <Button type="button" variant="outline" tone="light" className="w-full" onClick={() => finish(null)}>
              Skip for now
            </Button>
          </>
        ) : null}

        {error ? (
          <div role="alert" className="rounded-xl bg-rumman/10 px-3 py-2 text-sm font-semibold text-rumman">
            {error}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
