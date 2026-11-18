import { useState } from 'react';
import { ApiError, api, setToken, type User } from '../lib/api';
import { Button, Field, Input } from '../components/ui';

type Mode = 'signup' | 'signin';

export default function LoginPage({
  onAuthenticated,
}: {
  onAuthenticated: (user: User, isNewSignup: boolean) => void;
}) {
  const [mode, setMode] = useState<Mode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (mode === 'signup' && !name.trim()) next.name = 'Add your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email.';
    if (mode === 'signup' && password.length < 8) next.password = 'Password needs 8+ characters.';
    if (mode === 'signin' && !password) next.password = 'Enter your password.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setServerError('');
    try {
      if (mode === 'signup') {
        const parts = name.trim().split(/\s+/);
        const res = await api.signup({
          firstName: parts[0],
          lastName: parts.slice(1).join(' ') || undefined,
          email: email.trim(),
          password,
          role: 'creator',
        });
        setToken(res.token);
        onAuthenticated(res.user, true);
      } else {
        const res = await api.login(email.trim(), password);
        setToken(res.token);
        onAuthenticated(res.user, false);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong. Try again.';
      if (err instanceof ApiError && (err.status === 409 || /registered|exists/i.test(err.message))) {
        setErrors({ email: "There's already an account with this email." });
      } else if (err instanceof ApiError && (err.status === 401 || /invalid|credentials/i.test(err.message))) {
        setServerError('Email or password is wrong.');
      } else {
        setServerError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  const isSignup = mode === 'signup';

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <img src="/brand/sahra-logo-night.png" alt="Sahra" className="h-9 w-9" />
          <span className="font-display text-2xl font-bold text-night">Sahra Studio</span>
        </div>

        <div className="rounded-2xl border border-dune bg-white p-8 shadow-[0_2px_12px_rgba(22,38,59,0.05)]">
          {isSignup ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
                Step 1 of 2 · Your account
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold text-night">Host on Sahra</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink/55">
                One Sahra account for everything. You can still buy tickets with it.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl font-bold text-night">Welcome back</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink/55">
                Sign in to manage your events and payouts.
              </p>
            </>
          )}

          <form onSubmit={submit} className="mt-7 space-y-4">
            {isSignup ? (
              <Field label="Your name" error={errors.name}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mazen Khoury"
                  autoComplete="name"
                />
              </Field>
            ) : null}
            <Field label={isSignup ? 'Work email' : 'Email'} error={errors.email}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </Field>
            <Field label="Password" error={errors.password} hint={isSignup ? '8+ characters' : undefined}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ characters"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
            </Field>

            {serverError ? <p className="text-sm font-medium text-rumman">{serverError}</p> : null}

            <Button type="submit" loading={busy} disabled={busy}>
              {isSignup ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink/55">
            {isSignup ? (
              <>
                Already hosting?{' '}
                <button
                  type="button"
                  className="font-semibold text-ink underline underline-offset-2 hover:text-night"
                  onClick={() => setMode('signin')}
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                New to Sahra?{' '}
                <button
                  type="button"
                  className="font-semibold text-ink underline underline-offset-2 hover:text-night"
                  onClick={() => setMode('signup')}
                >
                  Host on Sahra
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
