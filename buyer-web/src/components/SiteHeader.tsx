import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api, type User } from '../lib/api';
import { STUDIO_URL } from '../lib/config';
import { displayName, nameInitials } from '../lib/format';
import { useAuth } from '../lib/auth';
import { useHost } from './HostFlow';
import { BellIcon, GlobeIcon, SearchIcon } from './icons';

const NAV = [
  { to: '/', label: 'Events', end: true },
  { to: '/plans', label: 'Plans', end: false },
];

export default function SiteHeader({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const { requireAuth, logout } = useAuth();
  const { openHost } = useHost();
  const { pathname } = useLocation();
  // Prototype hides the nav search on fHome, the hero carries its own.
  const navSearch = pathname !== '/';
  const [q, setQ] = useState('');
  const [unread, setUnread] = useState(0);
  const [rtl, setRtl] = useState(() => document.documentElement.dir === 'rtl');

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let active = true;
    api
      .notifications()
      .then((res) => {
        if (active) setUnread(res.unreadCount ?? res.notifications.length);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user]);

  function submitSearch() {
    const term = q.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
  }

  function toggleDir() {
    const next = !rtl;
    setRtl(next);
    document.documentElement.dir = next ? 'rtl' : 'ltr';
    document.documentElement.lang = next ? 'ar' : 'en';
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-night-surface bg-night">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center gap-6 px-6 lg:px-8">
        <Link to="/" className="shrink-0" aria-label="Sahra home">
          <img src="/brand/sahra-logo-gold.png" alt="Sahra" className="h-10 w-auto" />
        </Link>

        {navSearch ? (
        <form
          className="hidden min-w-0 max-w-[420px] flex-1 sm:block"
          onSubmit={(e) => {
            e.preventDefault();
            submitSearch();
          }}
        >
          <div className="relative">
            <SearchIcon size={17} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-night-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search events, venues, artists"
              className="h-11 w-full rounded-xl border-2 border-night-surface bg-night-surface ps-10 pe-4 text-[15px] text-sand outline-none transition placeholder:text-night-muted focus:border-gold"
            />
          </div>
        </form>
        ) : null}

        <span className="flex-1" />

        <nav className="flex items-center gap-5 text-[15px] font-semibold">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={(e) => {
                if (!user && item.to === '/plans') {
                  e.preventDefault();
                  requireAuth('plans', () => navigate('/plans'));
                }
              }}
              className={({ isActive }) =>
                `transition ${isActive ? 'text-gold' : 'text-sand/85 hover:text-sand'}`
              }
            >
              {item.label}
            </NavLink>
          ))}

          {user ? (
            <Link
              to="/account?section=notifications"
              className="relative text-sand/85 transition hover:text-sand"
              aria-label="Notifications"
            >
              <BellIcon size={19} />
              {unread > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rumman px-1 text-[10px] font-bold text-sand">
                  {unread > 9 ? '9+' : unread}
                </span>
              ) : null}
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => openHost()}
            className="rounded-full border-[1.5px] border-night-border px-4 py-2 text-sm text-sand transition hover:bg-night-surface"
          >
            + Host
          </button>

          <button
            type="button"
            onClick={toggleDir}
            title={rtl ? 'Switch to English' : 'التبديل إلى العربية'}
            className="hidden items-center gap-1.5 text-night-muted transition hover:text-sand sm:flex"
          >
            <GlobeIcon size={17} />
            {rtl ? 'EN' : 'عربي'}
          </button>

          {user ? (
            <div className="group relative">
              <button
                type="button"
                aria-label="Account menu"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-[14px] font-extrabold text-night"
              >
                {nameInitials(displayName(user))}
              </button>
              <div className="invisible absolute end-0 top-11 w-48 rounded-2xl border border-night-border bg-night-elevated p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
                <Link to="/tickets" className="block rounded-xl px-3 py-2 text-sm text-sand hover:bg-night-surface">
                  My tickets
                </Link>
                <Link to="/account" className="block rounded-xl px-3 py-2 text-sm text-sand hover:bg-night-surface">
                  Account
                </Link>
                <a
                  href={STUDIO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl px-3 py-2 text-sm text-sand hover:bg-night-surface"
                >
                  Host events · Studio
                </a>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded-xl px-3 py-2 text-start text-sm text-sand hover:bg-night-surface"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => requireAuth('menu')}
              className="rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-night transition hover:brightness-95"
            >
              Sign in
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
