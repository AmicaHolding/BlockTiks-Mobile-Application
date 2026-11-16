import { useState, type FormEvent } from 'react';
import { api, setToken, type User } from '../lib/api';
import { Button, Card, Field, Input } from '../components/ui';

export default function LoginPage({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res =
        mode === 'signin'
          ? await api.login(email, password)
          : await api.signup({
              firstName,
              lastName: lastName || undefined,
              email,
              password,
              role: 'creator',
            });
      setToken(res.token);
      onAuth(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-night px-6">
      <Card className="w-full max-w-md bg-sand p-8">
        <div className="mb-6">
          <div className="font-display text-2xl font-extrabold text-ink">Sahra Studio</div>
          <div className="mt-1 text-sm text-night-muted">Organizer dashboard for Sahra events.</div>
        </div>
        <div className="mb-5 grid grid-cols-2 rounded-full bg-dune p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`rounded-full py-2 transition ${mode === 'signin' ? 'bg-night text-sand' : 'text-ink'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`rounded-full py-2 transition ${mode === 'signup' ? 'bg-night text-sand' : 'text-ink'}`}
          >
            Create account
          </button>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          {mode === 'signup' ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name">
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </Field>
              <Field label="Last name">
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </Field>
            </div>
          ) : null}
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'signup' ? 8 : 1}
            />
          </Field>
          {error ? <div className="rounded-xl bg-rumman/10 px-3 py-2 text-sm text-rumman">{error}</div> : null}
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create organizer account'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
