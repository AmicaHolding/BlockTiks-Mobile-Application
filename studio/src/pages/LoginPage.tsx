import { useRef, useState } from 'react';
import { ApiError, api, setToken, type User } from '../lib/api';
import { Button, Field, Input } from '../components/ui';

type Step = 'contact' | 'code' | 'name';

export default function LoginPage({
  onAuthenticated,
}: {
  onAuthenticated: (user: User, isNewSignup: boolean) => void;
}) {
  const [step, setStep] = useState<Step>('contact');
  const [contact, setContact] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [channel, setChannel] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const verifiedRef = useRef<{ user: User; isNew: boolean } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');

  function errMsg(err: unknown, fallback = 'Something went wrong. Try again.'): string {
    return err instanceof ApiError ? err.message : fallback;
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!contact.trim()) next.contact = 'Enter an email or phone number.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setBusy(true);
    setServerError('');
    try {
      const res = await api.otpStart(contact.trim());
      setChallengeId(res.challenge_id);
      setChannel(res.channel);
      setStep('code');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'rate_limited') {
        setServerError('Too many codes. Wait a bit and try again.');
      } else {
        setErrors({ contact: errMsg(err, 'Enter an email or a phone number with country code.') });
      }
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setErrors({ code: 'Enter the 6-digit code.' });
      return;
    }
    setBusy(true);
    setServerError('');
    try {
      const res = await api.otpVerify(challengeId, code.trim());
      setToken(res.token);
      if (res.is_new || !(res.user.name ?? res.user.firstName)) {
        verifiedRef.current = { user: res.user, isNew: res.is_new };
        setStep('name');
      } else {
        onAuthenticated(res.user, false);
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'too_many_attempts') {
        setServerError('Too many tries. Ask for a new code.');
      } else {
        setErrors({ code: errMsg(err, 'That code is not right.') });
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: 'Add your name.' });
      return;
    }
    setBusy(true);
    try {
      const res = await api.updateProfile({ name: name.trim(), intent: ['running_events'] });
      const v = verifiedRef.current;
      onAuthenticated(res.user, v?.isNew ?? true);
    } catch (err) {
      setServerError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <img src="/brand/sahra-logo-night.png" alt="Sahra" className="h-9 w-9" />
          <span className="font-display text-2xl font-bold text-night">Sahra Studio</span>
        </div>

        <div className="rounded-2xl border border-dune bg-[#fff9ef] p-8 shadow-[0_2px_12px_rgba(22,38,59,0.05)]">
          {step === 'contact' ? (
            <>
              <h1 className="font-display text-3xl font-bold text-night">Host on Sahra</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink/55">
                Sign in or create an account. No password, just a code.
              </p>
              <form onSubmit={sendCode} className="mt-7 space-y-4">
                <Field label="Email or phone" error={errors.contact}>
                  <Input
                    value={contact}
                    onChange={(e) => {
                      setContact(e.target.value);
                      setErrors({});
                    }}
                    placeholder="you@company.com or +9715…"
                    autoComplete="email"
                  />
                </Field>
                {serverError ? <p className="text-sm font-medium text-rumman">{serverError}</p> : null}
                <Button type="submit" loading={busy} disabled={busy}>
                  Send code
                </Button>
              </form>
            </>
          ) : null}

          {step === 'code' ? (
            <>
              <h1 className="font-display text-3xl font-bold text-night">Check your {channel === 'email' ? 'email' : 'phone'}</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink/55">
                We sent a 6-digit code to {contact}. It expires in 10 minutes.
              </p>
              <form onSubmit={verify} className="mt-7 space-y-4">
                <Field label="Code" error={errors.code}>
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, ''));
                      setErrors({});
                    }}
                    placeholder="123456"
                    className="text-center font-mono text-2xl tracking-[0.4em]"
                  />
                </Field>
                {serverError ? <p className="text-sm font-medium text-rumman">{serverError}</p> : null}
                <Button type="submit" loading={busy} disabled={busy}>
                  Verify
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-sm font-semibold text-ink/50 underline underline-offset-2 hover:text-ink"
                  onClick={() => {
                    setStep('contact');
                    setCode('');
                  }}
                >
                  Use a different email or phone
                </button>
              </form>
            </>
          ) : null}

          {step === 'name' ? (
            <>
              <h1 className="font-display text-3xl font-bold text-night">What's your name?</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink/55">
                Fans see this on your events.
              </p>
              <form onSubmit={saveName} className="mt-7 space-y-4">
                <Field label="Your name" error={errors.name}>
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrors({});
                    }}
                    placeholder="Mazen Khoury"
                    autoComplete="name"
                  />
                </Field>
                {serverError ? <p className="text-sm font-medium text-rumman">{serverError}</p> : null}
                <Button type="submit" loading={busy} disabled={busy}>
                  Continue
                </Button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
