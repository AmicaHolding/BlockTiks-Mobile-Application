import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useOrg } from '../lib/org';
import type { OrgRole } from '../lib/store';

const NAV: { to: string; label: string; adminOnly?: boolean }[] = [
  { to: '/', label: 'Overview' },
  { to: '/events', label: 'Events' },
  { to: '/orders', label: 'Orders' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/promos', label: 'Promo codes' },
  { to: '/venues', label: 'Venues' },
  { to: '/payouts', label: 'Payouts', adminOnly: true },
  { to: '/team', label: 'Team', adminOnly: true },
  { to: '/settings', label: 'Settings', adminOnly: true },
];

const ROLE_LABELS: Record<OrgRole, string> = {
  admin: 'Admin',
  cohost: 'Co-host',
  gate: 'Gate staff',
};

export default function StudioLayout({ onLogout }: { onLogout: () => void }) {
  const { user, org, orgs, role, actualRole, setRoleOverride, setActiveOrg, refresh } = useOrg();
  const navigate = useNavigate();

  const isAdmin = role === 'admin';

  return (
    <div className="min-h-screen bg-sand">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-white/5 bg-night">
        <div className="flex items-center gap-2.5 px-5 pb-6 pt-6">
          <img src="/brand/sahra-logo-gold.png" alt="Sahra" className="h-7 w-7" />
          <span className="font-display text-lg font-bold tracking-wide text-sand">STUDIO</span>
        </div>

        {/* Organisation switcher */}
        <div className="px-4">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sand/35">
            Organisation
          </p>
          <div className="space-y-1">
            {orgs.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setActiveOrg(o.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  org?.id === o.id
                    ? 'bg-white/10 text-sand'
                    : 'text-sand/55 hover:bg-white/5 hover:text-sand'
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gold/20 font-display text-[11px] font-bold text-gold">
                  {o.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate">{o.name}</span>
                {o.verificationStatus === 'approved' ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" title="Verified" />
                ) : null}
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate('/setup')}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gold/80 transition-colors hover:bg-white/5 hover:text-gold"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-gold/40 text-xs text-gold">
                +
              </span>
              New organisation
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="mt-6 flex-1 space-y-1 px-4">
          {NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-sand'
                    : 'text-sand/55 hover:bg-white/5 hover:text-sand'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-4">
          <p className="truncate text-xs font-semibold text-sand">
            {org?.name ?? '-'} · {user.firstName} · {ROLE_LABELS[role]}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-sand/40">{user.email}</p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-2 text-xs font-medium text-sand/50 hover:text-sand"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="ml-60 flex min-h-screen flex-col">
        {/* Slim header: dev role preview lives here so gating can be reviewed */}
        <header className="flex items-center justify-end gap-3 border-b border-dune/60 px-8 py-3">
          {import.meta.env.DEV ? (
            <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink/40">
              Preview role
              <select
                className="rounded-md border border-ink/15 bg-white py-1 pl-2 pr-7 text-xs font-medium normal-case tracking-normal text-ink focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
                value={role}
                onChange={(e) => {
                  const next = e.target.value as OrgRole;
                  setRoleOverride(next === actualRole ? null : next);
                }}
              >
                <option value="admin">Admin</option>
                <option value="cohost">Co-host</option>
                <option value="gate">Gate staff</option>
              </select>
            </label>
          ) : null}
          <span className="text-sm text-ink/60">
            {user.firstName} {user.lastName}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-pill border border-ink/15 px-3.5 py-1.5 text-xs font-semibold text-ink/70 hover:border-ink/30"
          >
            Sign out
          </button>
        </header>

        {/* Verification banners, org-scoped states, block publish/invite/payout */}
        {org?.verificationStatus === 'rejected' ? (
          <div className="border-b border-rumman/20 bg-rumman/5 px-8 py-3 text-sm text-rumman">
            <span className="font-semibold">Verification rejected.</span>{' '}
            {org.rejectionReason ?? 'The licence details did not match.'}{' '}
            Resubmit in{' '}
            <button
              type="button"
              className="font-semibold underline underline-offset-2"
              onClick={() => navigate('/settings')}
            >
              Settings
            </button>
            . Payouts are on hold; sales auto-pause 7 days after rejection if unresolved.
          </div>
        ) : null}

        <main className="flex-1 px-8 py-8">
          {role === 'gate' ? (
            <GateScreen name={user.firstName} />
          ) : (
            <Outlet context={{ refreshOrg: refresh }} />
          )}
        </main>
      </div>
    </div>
  );
}

function GateScreen({ name }: { name: string }) {
  // Gate staff use door mode on mobile · Studio is intentionally empty for them.
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-night">
          <img src="/brand/sahra-logo-gold.png" alt="" className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-bold text-night">Gate staff, {name}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/55">
          Gate staff don't use Studio. Open the Sahra app and you'll find scan mode and the
          guest list for the events you're assigned to.
        </p>
      </div>
    </div>
  );
}
