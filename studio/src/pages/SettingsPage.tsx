import { useEffect, useState } from 'react';
import { api, type User } from '../lib/api';
import { Badge, Card, Field, Input } from '../components/ui';

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);

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

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-night-muted">Studio</div>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">Settings</h1>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-display text-lg font-bold text-ink">Organization</div>
            <div className="mt-1 text-sm text-night-muted">
              {name} · {user?.email ?? '—'}
            </div>
          </div>
          <Badge tone="gold">{user?.role === 'creator' ? 'Creator' : 'Member'}</Badge>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Field label="Organization name">
            <Input defaultValue="Your organization" disabled />
          </Field>
          <Field label="Trade licence no.">
            <Input defaultValue="Not connected" disabled />
          </Field>
          <Field label="Default currency">
            <Input defaultValue="USD" disabled />
          </Field>
        </div>
        <div className="mt-3 rounded-xl bg-dune/70 px-4 py-3 text-sm text-night-muted">
          Organization verification, licence numbers, and payout destinations need backend fields before they can be edited here.
        </div>
      </Card>

      <Card className="p-6">
        <div className="font-display text-lg font-bold text-ink">Payouts</div>
        <div className="mt-2 text-sm text-night-muted">
          Weekly payouts and bank details are part of the Studio spec, but the MVP backend does not expose payout accounts yet.
        </div>
      </Card>

      <Card className="p-6">
        <div className="font-display text-lg font-bold text-ink">Team</div>
        <div className="mt-2 text-sm text-night-muted">
          Invite members, admins, co-hosts, and gate staff from one place. This consolidates the mobile team screens into Studio Settings › Team.
        </div>
        <div className="mt-4 rounded-xl bg-dune/70 px-4 py-3 text-sm text-night-muted">
          Team roles are designed, but the backend does not have team membership endpoints yet.
        </div>
      </Card>
    </div>
  );
}
