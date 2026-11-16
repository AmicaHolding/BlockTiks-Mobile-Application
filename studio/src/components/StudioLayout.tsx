import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { User } from '../lib/api';
import { Button } from './ui';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/events', label: 'Events' },
  { to: '/orders', label: 'Orders' },
  { to: '/promos', label: 'Promo codes' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/payouts', label: 'Payouts' },
  { to: '/settings', label: 'Settings' },
];

export default function StudioLayout({
  user,
  onLogout,
  children,
}: {
  user: User;
  onLogout: () => void;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

  return (
    <div className="min-h-screen bg-sand text-ink">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col bg-night text-sand">
        <button
          className="px-6 pb-6 pt-7 text-left"
          onClick={() => navigate('/')}
          type="button"
        >
          <div className="font-display text-xl font-extrabold tracking-tight text-gold">
            Sahra Studio
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-night-muted">
            For organizers
          </div>
        </button>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  isActive ? 'bg-night-surface text-gold' : 'text-sand/75 hover:bg-night-surface/60 hover:text-sand'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4">
          <Button className="w-full" onClick={() => navigate('/events/new')} type="button">
            Create event
          </Button>
        </div>
      </aside>

      <div className="pl-60">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-night-border/40 bg-sand/90 px-8 backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-night-muted">
            Studio
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-semibold text-ink">{name}</div>
              <div className="text-xs text-night-muted">{user.email}</div>
            </div>
            <Button variant="ghost" className="px-3 py-2 text-xs" onClick={onLogout} type="button">
              Sign out
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
