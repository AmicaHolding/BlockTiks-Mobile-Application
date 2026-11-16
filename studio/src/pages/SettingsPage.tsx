import { useEffect, useMemo, useState } from 'react';
import { api, type User } from '../lib/api';
import { Badge, Button, Card, Field, Input } from '../components/ui';

type SettingsTab = 'organization' | 'payouts' | 'team';

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'organization', label: 'Organization' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'team', label: 'Team' },
];

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<SettingsTab>('organization');

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((res) => {
        if (active) setUser(res.user);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const name = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '—';
  const roleLabel = useMemo(() => {
    const role = (user?.role ?? '').toUpperCase();
    if (role === 'CREATOR') return 'Verified organizer';
    if (role === 'ADMIN') return 'Admin';
    return 'Member';
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-night-muted">Studio</div>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">Settings</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <div className="flex flex-col gap-1 text-sm font-semibold">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-xl px-4 py-2.5 text-left transition ${
                tab === item.id ? 'bg-night text-gold' : 'text-ink hover:bg-dune'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="max-w-3xl space-y-6">
          {tab === 'organization' ? (
            <>
              <Card className="p-6">
                <div className="font-display text-lg font-bold text-ink">Organization</div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-dune font-display text-lg font-extrabold text-night">
                    {initials(name) || 'S'}
                  </div>
                  <div>
                    <div className="font-semibold text-ink">{name}</div>
                    <div className="text-sm text-night-muted">
                      {roleLabel} · {user?.email ?? '—'}
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="Organization name">
                    <Input defaultValue={name === '—' ? '' : name} disabled />
                  </Field>
                  <Field label="Trade licence no.">
                    <Input defaultValue="Not connected" disabled />
                  </Field>
                  <Field label="Default currency">
                    <Input defaultValue="USD" disabled />
                  </Field>
                  <Field label="Region">
                    <Input defaultValue="Not connected" disabled />
                  </Field>
                </div>
                <div className="mt-4 rounded-xl bg-dune/70 px-4 py-3 text-sm text-night-muted">
                  Organization verification, licence numbers, and regional settings need backend fields before they can be edited here.
                </div>
              </Card>
            </>
          ) : null}

          {tab === 'payouts' ? (
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-display text-lg font-bold text-ink">Payouts</div>
                  <div className="mt-2 text-sm text-night-muted">
                    Bank details, payout schedule, and organizer verification need backend fields before Studio can edit them.
                  </div>
                </div>
                <Badge tone="draft">Soon</Badge>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-dune/70 px-4 py-3 text-sm">
                <div>
                  <div className="font-semibold text-ink">Payout method</div>
                  <div className="text-night-muted">Not connected</div>
                </div>
                <Button variant="ghost" disabled type="button">
                  Change
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap justify-between gap-3 rounded-xl bg-dune/70 px-4 py-3 text-sm text-night-muted">
                <span>Schedule</span>
                <span>Not configured</span>
              </div>
            </Card>
          ) : null}

          {tab === 'team' ? (
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-display text-lg font-bold text-ink">Team</div>
                  <div className="mt-2 text-sm text-night-muted">
                    Invite members, admins, co-hosts, and gate staff from one place. This consolidates the mobile team screens into Studio Settings › Team.
                  </div>
                </div>
                <Button disabled type="button">
                  Invite member
                </Button>
              </div>
              <div className="mt-5 divide-y divide-night-border/40">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-semibold text-ink">{name}</div>
                    <div className="text-sm text-night-muted">{user?.email ?? '—'}</div>
                  </div>
                  <Badge tone="gold">Owner</Badge>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-dune/70 px-4 py-3 text-sm text-night-muted">
                Team roles are designed, but the backend does not have team membership endpoints yet.
              </div>
            </Card>
          ) : null}

        </div>
      </div>
    </div>
  );
}
