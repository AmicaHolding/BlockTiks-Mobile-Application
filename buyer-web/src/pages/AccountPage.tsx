import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { api, ApiError, type Earnings, type Faq, type NotificationItem, type PaymentMethod, type Promo, type TransactionRow, type User } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatCents, formatShortDateTime, initials } from '../lib/format';
import { Badge, Button, Card, Field, Input, Select, Spinner } from '../components/ui';
import {
  BellIcon,
  CardIcon,
  CashIcon,
  GlobeIcon,
  HelpIcon,
  LogoutIcon,
  ReceiptIcon,
  ShieldIcon,
  TagIcon,
  UsersIcon,
} from '../components/icons';

const STRIPE_KEY = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ?? '';
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

type Section =
  | 'profile'
  | 'payments'
  | 'notifications'
  | 'language'
  | 'security'
  | 'transactions'
  | 'help'
  | 'earnings'
  | 'referrals';

const NAV: { id: Section; label: string; icon: typeof UsersIcon }[] = [
  { id: 'profile', label: 'Profile', icon: UsersIcon },
  { id: 'payments', label: 'Payment methods', icon: CardIcon },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
  { id: 'language', label: 'Language & region', icon: GlobeIcon },
  { id: 'security', label: 'Security', icon: ShieldIcon },
  { id: 'transactions', label: 'Transactions', icon: ReceiptIcon },
  { id: 'help', label: 'Help', icon: HelpIcon },
  { id: 'earnings', label: 'Earnings & promos', icon: CashIcon },
  { id: 'referrals', label: 'Referrals', icon: UsersIcon },
];

const CITIES = ['Dubai', 'Abu Dhabi', 'Riyadh', 'Doha', 'Kuwait City', 'Muscat', 'Manama', 'Jeddah'];

export default function AccountPage() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>('profile');

  return (
    <div className="min-h-[calc(100vh-76px)] bg-sand text-ink">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-12">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Account</h1>
        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition ${
                    active ? 'bg-night text-sand' : 'text-ink/60 hover:bg-dune hover:text-ink'
                  }`}
                >
                  <Icon size={16} /> {item.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={async () => {
                await api.logout().catch(() => undefined);
                logout();
                navigate('/');
              }}
              className="mt-4 flex items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-rumman transition hover:bg-rumman/10"
            >
              <LogoutIcon size={16} /> Sign out
            </button>
          </nav>

          <div className="min-w-0">
            {section === 'profile' ? <ProfileSection user={user} onSaved={refresh} /> : null}
            {section === 'payments' ? <PaymentsSection /> : null}
            {section === 'notifications' ? <NotificationsSection user={user} onSaved={refresh} /> : null}
            {section === 'language' ? <LanguageSection /> : null}
            {section === 'security' ? <SecuritySection /> : null}
            {section === 'transactions' ? <TransactionsSection /> : null}
            {section === 'help' ? <HelpSection /> : null}
            {section === 'earnings' ? <EarningsSection /> : null}
            {section === 'referrals' ? <ReferralsSection /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card tone="light" className="p-6">
      <h2 className="font-display text-xl font-extrabold text-ink">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-ink/60">{subtitle}</p> : null}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function ProfileSection({ user, onSaved }: { user: User | null; onSaved: () => Promise<void> }) {
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [dob, setDob] = useState(user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setPhone(user?.phone ?? '');
    setCity(user?.city ?? '');
    setDob(user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '');
  }, [user]);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        dateOfBirth: dob || undefined,
      });
      await onSaved();
      setMsg({ ok: true, text: 'Profile saved.' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Could not save profile' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionShell title="Profile" subtitle="How you appear to organizers and friends.">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-night font-display text-xl font-extrabold text-gold">
          {initials(user?.firstName, user?.lastName, user?.email)}
        </div>
        <div>
          <div className="font-display text-lg font-extrabold text-ink">{user?.firstName} {user?.lastName}</div>
          <div className="text-sm text-ink/60">{user?.email}</div>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="First name">
          <Input tone="light" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label="Last name">
          <Input tone="light" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input tone="light" value={user?.email ?? ''} readOnly />
        </Field>
        <Field label="Mobile">
          <Input tone="light" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971 50 000 0000" />
        </Field>
        <Field label="City">
          <Select tone="light" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Select city</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date of birth">
          <Input tone="light" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </Field>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <Button variant="primary" onClick={save} disabled={busy}>
          {busy ? <Spinner className="border-night border-t-transparent" /> : null}
          Save changes
        </Button>
        {msg ? <span className={`text-sm font-semibold ${msg.ok ? 'text-emerald-700' : 'text-rumman'}`}>{msg.text}</span> : null}
      </div>
    </SectionShell>
  );
}

function PaymentsSection() {
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await api.paymentMethods();
      setMethods(res.paymentMethods);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load payment methods');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  async function startAdd() {
    setError(null);
    try {
      const res = await api.paymentMethodSetupIntent();
      setClientSecret(res.clientSecret);
      setAdding(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start card setup');
    }
  }

  async function detach(id: string) {
    try {
      await api.detachPaymentMethod(id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not remove card');
    }
  }

  return (
    <SectionShell title="Payment methods" subtitle="Cards used for checkout and auto-buy offers.">
      {error ? <div className="mb-4 rounded-xl bg-rumman/10 px-4 py-3 text-sm font-semibold text-rumman">{error}</div> : null}
      {methods == null ? (
        <Spinner />
      ) : methods.length === 0 && !adding ? (
        <div className="rounded-xl border border-dashed border-ink/20 px-6 py-10 text-center text-sm text-ink/60">
          No cards saved yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {methods.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border border-ink/10 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <CardIcon size={18} className="text-night/60" />
                <div>
                  <div className="text-sm font-bold text-ink">
                    {m.brand ?? 'Card'} •••• {m.last4 ?? '••••'}
                  </div>
                  {m.expMonth && m.expYear ? (
                    <div className="text-xs text-ink/50">
                      Expires {String(m.expMonth).padStart(2, '0')}/{m.expYear}
                    </div>
                  ) : null}
                </div>
              </div>
              <Button variant="ghost" className="text-xs text-rumman" onClick={() => detach(m.id)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      {adding && clientSecret ? (
        <div className="mt-5 rounded-xl border border-ink/10 bg-white p-4">
          {stripePromise ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: { colorPrimary: '#241C14', colorBackground: '#ffffff', colorText: '#241C14' },
                },
              }}
            >
              <SetupForm
                onDone={async () => {
                  setAdding(false);
                  setClientSecret(null);
                  await load();
                }}
                onError={setError}
              />
            </Elements>
          ) : (
            <div className="text-sm text-rumman">Stripe publishable key missing.</div>
          )}
        </div>
      ) : (
        <Button variant="outline" tone="light" className="mt-5" onClick={startAdd}>
          Add card
        </Button>
      )}
    </SectionShell>
  );
}

function SetupForm({ onDone, onError }: { onDone: () => void; onError: (msg: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!stripe || !elements) return;
    setBusy(true);
    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: `${window.location.origin}/account` },
      redirect: 'if_required',
    });
    setBusy(false);
    if (error) {
      onError(error.message ?? 'Could not save card');
      return;
    }
    onDone();
  }

  return (
    <div className="flex flex-col gap-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      <Button variant="primary" onClick={save} disabled={!stripe || busy}>
        {busy ? <Spinner className="border-night border-t-transparent" /> : null}
        Save card
      </Button>
    </div>
  );
}

function NotificationsSection({ user, onSaved }: { user: User | null; onSaved: () => Promise<void> }) {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [prefs, setPrefs] = useState(user?.notificationPrefs ?? { push: true, email: true, sms: false });

  useEffect(() => {
    api
      .notifications()
      .then((res) => setItems(res.notifications))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    setPrefs(user?.notificationPrefs ?? { push: true, email: true, sms: false });
  }, [user]);

  async function savePrefs() {
    try {
      await api.updateProfile({ notificationPrefs: prefs });
      await onSaved();
    } catch {
      // prefs are best-effort
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionShell title="Notifications" subtitle="Recent activity across your tickets and sales.">
        {items == null ? (
          <Spinner />
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink/20 px-6 py-10 text-center text-sm text-ink/60">
            You’re all caught up.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.slice(0, 30).map((n) => (
              <div key={n.id} className="flex items-start gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold/70" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink">{n.title}</div>
                  <div className="text-sm text-ink/60">{n.body}</div>
                  <div className="mt-0.5 text-xs text-ink/40">{formatShortDateTime(n.createdAt)}</div>
                </div>
              </div>
            ))}
            <Button
              variant="ghost"
              className="self-start text-xs"
              onClick={async () => {
                await api.notificationsRead().catch(() => undefined);
                const res = await api.notifications().catch(() => null);
                if (res) setItems(res.notifications);
              }}
            >
              Mark all as read
            </Button>
          </div>
        )}
      </SectionShell>
      <SectionShell title="Delivery preferences">
        <div className="flex flex-col gap-3">
          {(
            [
              ['push', 'Push notifications'],
              ['email', 'Email'],
              ['sms', 'SMS'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-xl border border-ink/10 bg-white px-4 py-3">
              <span className="text-sm font-semibold text-ink">{label}</span>
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                className="h-4 w-4 accent-[#241C14]"
              />
            </label>
          ))}
          <Button variant="outline" tone="light" className="self-start" onClick={savePrefs}>
            Save preferences
          </Button>
        </div>
      </SectionShell>
    </div>
  );
}

function LanguageSection() {
  return (
    <SectionShell title="Language & region" subtitle="Interface language and regional preferences.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Language">
          <Select tone="light" defaultValue="en">
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </Select>
        </Field>
        <Field label="City">
          <Select tone="light" defaultValue="Dubai">
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <p className="mt-4 rounded-xl bg-dune/60 px-4 py-3 text-sm text-ink/60">
        Full Arabic interface and region-specific pricing are rolling out — your preference is noted for when they land.
      </p>
    </SectionShell>
  );
}

function SecuritySection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function change() {
    setMsg(null);
    if (next.length < 8) {
      setMsg({ ok: false, text: 'New password must be at least 8 characters' });
      return;
    }
    if (next !== confirm) {
      setMsg({ ok: false, text: 'Passwords don’t match' });
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setMsg({ ok: true, text: 'Password changed.' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Could not change password' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionShell title="Security" subtitle="Manage your password.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Current password">
          <Input tone="light" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password">
          <Input tone="light" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirm new password">
          <Input tone="light" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <Button variant="primary" onClick={change} disabled={busy || !current || !next || !confirm}>
          {busy ? <Spinner className="border-night border-t-transparent" /> : null}
          Change password
        </Button>
        {msg ? <span className={`text-sm font-semibold ${msg.ok ? 'text-emerald-700' : 'text-rumman'}`}>{msg.text}</span> : null}
      </div>
      <p className="mt-6 text-xs leading-relaxed text-ink/50">
        There’s no SMS verification yet — if you lose access, contact support from Help.
      </p>
    </SectionShell>
  );
}

function TransactionsSection() {
  const [rows, setRows] = useState<TransactionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .transactions()
      .then((res) => setRows(res.transactions))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load transactions'));
  }, []);

  return (
    <SectionShell title="Transactions" subtitle="Every purchase, sale, refund and payout on one timeline.">
      {error ? <div className="rounded-xl bg-rumman/10 px-4 py-3 text-sm font-semibold text-rumman">{error}</div> : null}
      {rows == null && !error ? (
        <Spinner />
      ) : rows && rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/20 px-6 py-10 text-center text-sm text-ink/60">
          No transactions yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink/10">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 bg-dune/50 text-xs uppercase tracking-wide text-ink/50">
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((row) => {
                const positive = row.direction === 'in';
                const tone = row.status === 'Paid' || row.status === 'Ready' ? 'green' : row.status === 'Pending' ? 'gold' : 'muted';
                return (
                  <tr key={row.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{row.title}</div>
                      {row.subtitle ? <div className="text-xs text-ink/50">{row.subtitle}</div> : null}
                    </td>
                    <td className="px-4 py-3 capitalize text-ink/70">{(row.type ?? '').replace(/_/g, ' ')}</td>
                    <td className={`px-4 py-3 font-semibold ${positive ? 'text-emerald-700' : 'text-ink'}`}>
                      {positive ? '+' : '−'}{formatCents(row.amountCents)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={tone}>{row.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink/60">{formatShortDateTime(row.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionShell>
  );
}

function HelpSection() {
  const [categories, setCategories] = useState<{ name: string; faqs: Faq[] }[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api
      .faqs()
      .then((res) => setCategories(res.categories))
      .catch(() => setCategories([]));
  }, []);

  return (
    <SectionShell title="Help" subtitle="Answers about tickets, resale and payouts.">
      {categories == null ? (
        <Spinner />
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/20 px-6 py-10 text-center text-sm text-ink/60">
          No FAQs published yet.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {categories.map((category) => (
            <div key={category.name}>
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">{category.name}</div>
              <div className="mt-2 flex flex-col gap-2">
                {category.faqs.map((faq, index) => {
                  const key = `${category.name}-${index}`;
                  const isOpen = open === key;
                  return (
                    <div key={key} className="rounded-xl border border-ink/10 bg-white">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                        onClick={() => setOpen(isOpen ? null : key)}
                      >
                        <span className="text-sm font-bold text-ink">{faq.q}</span>
                        <span className="text-ink/40">{isOpen ? '−' : '+'}</span>
                      </button>
                      {isOpen ? <div className="border-t border-ink/5 px-4 py-3 text-sm text-ink/70">{faq.a}</div> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function EarningsSection() {
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [promos, setPromos] = useState<{ ready: Promo[]; used: Promo[] } | null>(null);
  const [payouts, setPayouts] = useState<{ connected: boolean; payoutsEnabled?: boolean; detailsSubmitted?: boolean } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.earnings().then(setEarnings).catch(() => undefined);
    api.accountPromos().then(setPromos).catch(() => undefined);
    api.payouts().then(setPayouts).catch(() => setPayouts({ connected: false }));
  }, []);

  async function refreshAll() {
    api.earnings().then(setEarnings).catch(() => undefined);
    api.payouts().then(setPayouts).catch(() => undefined);
  }

  const available = earnings?.availableCents ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <SectionShell title="Earnings" subtitle="What you’ve made selling tickets.">
        {earnings == null ? (
          <Spinner />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-4">
              {(
                [
                  ['Available', earnings.availableCents],
                  ['Pending', earnings.pendingCents],
                  ['Withdrawn', earnings.withdrawnCents],
                  ['Lifetime', earnings.lifetimeCents],
                ] as const
              ).map(([label, cents]) => (
                <div key={label} className="rounded-xl border border-ink/10 bg-white px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-ink/50">{label}</div>
                  <div className="mt-1 font-display text-2xl font-extrabold text-ink">{formatCents(cents)}</div>
                </div>
              ))}
            </div>

            {/* Payout account */}
            <div className="mt-5 rounded-xl border border-ink/10 bg-dune/40 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-ink">Payout account</div>
                  <div className="text-xs text-ink/60">
                    {payouts?.connected && payouts.payoutsEnabled
                      ? 'Stripe Connect onboarding complete — withdrawals go to your bank.'
                      : payouts?.connected
                        ? 'Finish Stripe onboarding to receive payouts.'
                        : 'Connect Stripe to withdraw your earnings.'}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!payouts?.connected ? (
                    <Button
                      variant="night"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const res = await api.payoutsOnboardingLink();
                          window.location.href = res.url;
                        } catch (e) {
                          setMsg(e instanceof ApiError ? e.message : 'Could not start onboarding');
                          setBusy(false);
                        }
                      }}
                    >
                      Connect payouts
                    </Button>
                  ) : !payouts.payoutsEnabled ? (
                    <Button
                      variant="night"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const res = await api.payoutsOnboardingLink();
                          window.location.href = res.url;
                        } catch (e) {
                          setMsg(e instanceof ApiError ? e.message : 'Could not start onboarding');
                          setBusy(false);
                        }
                      }}
                    >
                      Finish setup
                    </Button>
                  ) : null}
                  {payouts?.connected ? (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await api.payoutsRefresh();
                          await refreshAll();
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Refresh status
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              className="mt-5"
              disabled={busy || available < 100 || !payouts?.payoutsEnabled}
              onClick={async () => {
                setMsg(null);
                setBusy(true);
                try {
                  await api.withdraw(available);
                  setMsg('Withdrawal sent to your payout account.');
                  await refreshAll();
                } catch (e) {
                  setMsg(e instanceof ApiError ? e.message : 'Withdrawal failed');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Withdraw {formatCents(available)}
            </Button>
            {!payouts?.payoutsEnabled ? (
              <p className="mt-2 text-xs text-ink/50">Complete payout onboarding to enable withdrawals.</p>
            ) : null}
            {msg ? <p className="mt-3 text-sm text-ink/60">{msg}</p> : null}
            {earnings.sales.length > 0 ? (
              <div className="mt-5 overflow-x-auto rounded-xl border border-ink/10">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 bg-dune/50 text-xs uppercase tracking-wide text-ink/50">
                      <th className="px-4 py-3 font-semibold">Sale</th>
                      <th className="px-4 py-3 font-semibold">Earned</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.sales.map((sale) => (
                      <tr key={sale.id} className="border-b border-ink/5 last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-ink">{sale.title}</div>
                          <div className="text-xs text-ink/50">{sale.subtitle}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-ink">{formatCents(sale.amountCents)}</td>
                        <td className="px-4 py-3">
                          <Badge tone={sale.status === 'Ready' ? 'green' : 'gold'}>{sale.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-ink/60">{formatShortDateTime(sale.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {earnings.withdrawals.length > 0 ? (
              <div className="mt-5">
                <div className="text-xs font-bold uppercase tracking-wide text-ink/50">Withdrawals</div>
                <div className="mt-2 flex flex-col gap-2">
                  {earnings.withdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm">
                      <span className="font-semibold text-ink">{formatCents(withdrawal.amountCents)}</span>
                      <Badge tone={withdrawal.status === 'PAID' ? 'green' : withdrawal.status === 'FAILED' ? 'muted' : 'gold'}>
                        {withdrawal.status}
                      </Badge>
                      <span className="text-ink/50">{formatShortDateTime(withdrawal.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </SectionShell>

      <SectionShell title="Promo codes" subtitle="Discounts sent to you by organizers or Sahra.">
        {promos == null || (promos.ready.length === 0 && promos.used.length === 0) ? (
          <div className="rounded-xl border border-dashed border-ink/20 px-6 py-10 text-center text-sm text-ink/60">
            No promo codes yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {[...promos.ready, ...promos.used].map((promo) => (
              <div key={promo.code} className="flex items-center justify-between rounded-xl border border-ink/10 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <TagIcon size={16} className="text-night/60" />
                  <div>
                    <div className="font-mono text-sm font-bold text-ink">{promo.code}</div>
                    <div className="text-xs text-ink/50">
                      {promo.percentOff != null
                        ? `${promo.percentOff}% off`
                        : promo.amountOffCents != null
                          ? `${formatCents(promo.amountOffCents)} off`
                          : `${promo.value ?? ''}% off`}
                      {promo.tierName ? ` · ${promo.tierName}` : promo.scope === 'EVENT' ? ' · one event' : ' · all events'}
                    </div>
                  </div>
                </div>
                {promo.state === 'used' || promo.state === 'expired' ? (
                  <Badge tone="muted">{promo.state === 'used' ? 'Used' : 'Expired'}</Badge>
                ) : (
                  <Badge tone="green">{promo.state === 'scheduled' ? 'Scheduled' : 'Ready'}</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionShell>
    </div>
  );
}

function ReferralsSection() {
  const [data, setData] = useState<{
    code: string;
    shareUrl: string;
    bonusCents?: number;
    friendCount?: number;
    friends: { id: string; joinedAt: string }[];
    referredByCode?: string;
  } | null>(null);
  const [applyCode, setApplyCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.referrals().then(setData).catch(() => undefined);
  }, []);

  return (
    <SectionShell title="Referrals" subtitle="Invite friends to Sahra and track who joins.">
      {data == null ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-ink/10 bg-white px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink/50">Your code</div>
            <div className="mt-1 font-mono text-xl font-extrabold text-ink">{data.code || '—'}</div>
            {data.shareUrl ? <div className="mt-2 break-all text-xs text-ink/50">{data.shareUrl}</div> : null}
            <div className="mt-3">
              <Button
                variant="night"
                onClick={() => {
                  void navigator.clipboard?.writeText(data.shareUrl || data.code);
                  setMsg('Copied to clipboard.');
                }}
              >
                Copy link
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-ink/10 bg-white px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink/50">Friends joined</div>
              <div className="mt-1 font-display text-2xl font-extrabold text-ink">{data.friendCount ?? data.friends.length}</div>
            </div>
            <div className="rounded-xl border border-ink/10 bg-white px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink/50">Bonus per referral</div>
              <div className="mt-1 font-display text-2xl font-extrabold text-ink">
                {data.bonusCents ? formatCents(data.bonusCents) : '—'}
              </div>
            </div>
          </div>
          {!data.referredByCode ? (
            <div className="rounded-xl border border-ink/10 bg-white px-4 py-4">
              <div className="text-sm font-bold text-ink">Have a referral code?</div>
              <div className="mt-2 flex gap-2">
                <Input tone="light" value={applyCode} onChange={(e) => setApplyCode(e.target.value.toUpperCase())} placeholder="Enter code" />
                <Button
                  variant="ghost"
                  disabled={applyCode.trim().length < 4}
                  onClick={async () => {
                    setMsg(null);
                    try {
                      await api.applyReferral(applyCode.trim());
                      setMsg('Referral applied.');
                      setApplyCode('');
                      api.referrals().then(setData).catch(() => undefined);
                    } catch (e) {
                      setMsg(e instanceof ApiError ? e.message : 'Could not apply code');
                    }
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>
          ) : null}
          {msg ? <p className="text-sm text-ink/60">{msg}</p> : null}
          {data.friends.length > 0 ? (
            <div className="flex flex-col gap-2">
              {data.friends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm">
                  <span className="font-semibold text-ink">Friend joined</span>
                  <span className="text-ink/50">{formatShortDateTime(friend.joinedAt)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </SectionShell>
  );
}
