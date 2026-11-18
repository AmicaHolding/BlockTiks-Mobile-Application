import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError, getStoredReferralCode, type User } from '../lib/api';
import { STUDIO_URL } from '../lib/config';
import { useAuth } from '../lib/auth';
import { Button, Card, Input, Select, Spinner } from '../components/ui';

const CITIES = ['Dubai', 'Abu Dhabi', 'Riyadh', 'Doha', 'Kuwait City', 'Muscat', 'Manama', 'Jeddah'];
const INTERESTS = ['Concerts', 'Comedy', 'Festivals', 'Football', 'Theatre', 'Nightlife', 'Arts', 'Family'];

export default function AuthPage() {
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/';
  const navigate = useNavigate();
  const { login } = useAuth();

  const [tab, setTab] = useState<'signin' | 'signup'>(() =>
    new URLSearchParams(window.location.search).get('ref') ? 'signup' : 'signin'
  );
  const [referralCode, setReferralCode] = useState(getStoredReferralCode() ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // A3, after signup we collect city + at least three interests.
  const [step, setStep] = useState<'auth' | 'personalize'>('auth');
  const [city, setCity] = useState('Dubai');
  const [interests, setInterests] = useState<Set<string>>(new Set());

  function finish() {
    navigate(next.startsWith('/') ? next : '/', { replace: true });
  }

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
              referralCode: referralCode.trim() || undefined,
            });
      login(res.token, res.user);
      if (tab === 'signup') {
        setStep('personalize');
      } else {
        finish();
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  function toggleInterest(tag: string) {
    setInterests((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(tag)) nextSet.delete(tag);
      else nextSet.add(tag);
      return nextSet;
    });
  }

  async function savePersonalization() {
    setBusy(true);
    try {
      await api.updateProfile({ city, interests: [...interests] });
    } catch {
      // best-effort, personalization can be completed later from Profile
    } finally {
      setBusy(false);
      finish();
    }
  }

  const valid =
    tab === 'signin'
      ? email.includes('@') && password.length >= 8
      : firstName.trim().length > 0 && email.includes('@') && password.length >= 8;
  const personalizeValid = Boolean(city) && interests.size >= 3;

  return (
    <div className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-night px-6 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <img src="/brand/sahra-logo-gold.png" alt="Sahra" className="mx-auto h-14 w-auto" />
          <p className="mt-3 text-sm text-night-muted">Your night starts here</p>
        </div>

        <Card className="mt-8 p-6">
          {step === 'personalize' ? (
            <div>
              <h2 className="font-display text-xl font-extrabold text-sand">Make it yours</h2>
              <p className="mt-1 text-sm text-night-muted">
                Pick your city and at least three things you’re into · For You gets better from there.
              </p>
              <div className="mt-5">
                <span className="mb-1.5 block text-sm font-semibold text-night-muted">City</span>
                <Select tone="dark" value={city} onChange={(e) => setCity(e.target.value)}>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="mt-5">
                <span className="mb-1.5 block text-sm font-semibold text-night-muted">
                  Interests · {interests.size} picked
                </span>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((tag) => {
                    const on = interests.has(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleInterest(tag)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          on ? 'bg-gold text-night' : 'bg-night-surface text-sand hover:bg-night-elevated'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button
                variant="primary"
                className="mt-6 w-full py-3 text-base"
                disabled={!personalizeValid || busy}
                onClick={savePersonalization}
              >
                {busy ? <Spinner className="border-night border-t-transparent" /> : null}
                {personalizeValid ? 'Done' : `Pick ${3 - interests.size} more`}
              </Button>
              <button
                type="button"
                onClick={finish}
                className="mt-3 w-full text-center text-xs text-night-muted hover:text-sand"
              >
                Skip for now
              </button>
            </div>
          ) : (
            <>
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
                      <Input
                        tone="dark"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Layla"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-night-muted">Last name</span>
                      <Input
                        tone="dark"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Al-Amin"
                      />
                    </label>
                  </div>
                ) : null}
                {tab === 'signup' ? (
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-night-muted">
                      Referral code (optional)
                    </span>
                    <Input
                      tone="dark"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="e.g. LAYLA1A2B"
                    />
                  </label>
                ) : null}
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-night-muted">Email</span>
                  <Input
                    tone="dark"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                  />
                </label>
                {tab === 'signup' ? (
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-night-muted">Mobile (optional)</span>
                    <Input
                      tone="dark"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+971 50 000 0000"
                    />
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

                {error ? (
                  <div className="rounded-xl bg-rumman/15 px-4 py-3 text-sm font-semibold text-red-200">{error}</div>
                ) : null}

                <Button type="submit" variant="primary" className="w-full py-3 text-base" disabled={!valid || busy}>
                  {busy ? <Spinner className="border-night border-t-transparent" /> : null}
                  {tab === 'signin' ? 'Sign in' : 'Create account'}
                </Button>
              </form>

              {tab === 'signup' ? (
                <p className="mt-4 text-center text-xs text-night-muted">
                  By continuing you agree to the Terms and Resale policy.
                </p>
              ) : null}
            </>
          )}
        </Card>

        <p className="mt-5 text-center text-xs text-night-muted">
          Hosting events?{' '}
          <a href={STUDIO_URL} target="_blank" rel="noreferrer" className="font-semibold text-gold hover:underline">
            Open Sahra Studio
          </a>{' '}
          · organisers manage events there.
        </p>
        <p className="mt-3 text-center text-xs text-night-muted">
          <Link to="/" className="hover:text-sand">← Back to browsing</Link>
        </p>
      </div>
    </div>
  );
}

export type { User };
