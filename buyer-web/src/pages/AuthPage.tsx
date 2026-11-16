import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError, type User } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, Input, Spinner } from '../components/ui';

export default function AuthPage() {
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/';
  const navigate = useNavigate();
  const { login } = useAuth();

  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res =
        tab === 'signin'
          ? await api.login(email.trim(), password)
          : await api.signup({
              firstName: firstName.trim(),
              lastName: lastName.trim() || undefined,
              email: email.trim(),
              phone: phone.trim() || undefined,
              password,
            });
      login(res.token, res.user);
      navigate(next.startsWith('/') ? next : '/', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const valid =
    tab === 'signin'
      ? email.includes('@') && password.length >= 8
      : firstName.trim().length > 0 && email.includes('@') && password.length >= 8;

  return (
    <div className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-night px-6 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="font-display text-4xl font-extrabold tracking-tight text-gold">Sahra</div>
          <p className="mt-2 text-sm text-night-muted">Every night out, in one place</p>
        </div>

        <Card className="mt-8 p-6">
          <div className="flex rounded-full bg-night p-1">
            {(['signin', 'signup'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setError(null);
                }}
                className={`flex-1 rounded-full py-2 text-sm font-bold transition ${
                  tab === t ? 'bg-sand text-night' : 'text-night-muted hover:text-sand'
                }`}
              >
                {t === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) void submit();
            }}
          >
            {tab === 'signup' ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-night-muted">First name</span>
                  <Input tone="dark" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Layla" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-night-muted">Last name</span>
                  <Input tone="dark" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Al-Amin" />
                </label>
              </div>
            ) : null}
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-night-muted">Email</span>
              <Input tone="dark" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            </label>
            {tab === 'signup' ? (
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-night-muted">Mobile (optional)</span>
                <Input tone="dark" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971 50 000 0000" />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-night-muted">Password</span>
              <Input
                tone="dark"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </label>

            {error ? <div className="rounded-xl bg-rumman/15 px-4 py-3 text-sm font-semibold text-red-200">{error}</div> : null}

            <Button type="submit" variant="primary" className="w-full py-3 text-base" disabled={!valid || busy}>
              {busy ? <Spinner className="border-night border-t-transparent" /> : null}
              {tab === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          {tab === 'signin' ? (
            <p className="mt-4 text-center text-xs text-night-muted">
              Hosting events?{' '}
              <span className="text-gold">Sahra Studio</span> is where organizers manage events.
            </p>
          ) : (
            <p className="mt-4 text-center text-xs text-night-muted">
              By continuing you agree to the Terms and Resale policy.
            </p>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-night-muted">
          <Link to="/" className="hover:text-sand">← Back to browsing</Link>
        </p>
      </div>
    </div>
  );
}

export type { User };
