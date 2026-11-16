import { Link, NavLink, useNavigate } from 'react-router-dom';
import { getToken, api, setToken, type User } from '../lib/api';
import { initials } from '../lib/format';
import { GlobeIcon, PinIcon, SearchIcon } from './icons';

const NAV = [
  { to: '/explore', label: 'Explore' },
  { to: '/tickets', label: 'Tickets' },
];

export default function SiteHeader({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const authed = Boolean(getToken());

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // token is cleared locally regardless
    }
    setToken(null);
    navigate('/');
    window.location.reload();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-night-border bg-night">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center gap-7 px-6 lg:px-12">
        <Link to="/" className="shrink-0">
          <span className="font-display text-[26px] font-extrabold tracking-tight text-gold">
            Sahra
          </span>
        </Link>

        <button
          type="button"
          onClick={() => navigate('/explore')}
          className="hidden h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-night-surface px-5 text-left text-[15px] text-night-muted transition hover:bg-night-elevated sm:flex sm:max-w-[460px]"
        >
          <SearchIcon size={18} />
          <span className="truncate">Artists, venues, events</span>
        </button>

        <button
          type="button"
          className="hidden items-center gap-1.5 text-[15px] font-medium text-sand/90 md:flex"
        >
          <PinIcon size={18} />
          Dubai
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <nav className="ml-auto flex items-center gap-6 text-[15px] font-medium">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `transition ${isActive ? 'text-gold' : 'text-sand/85 hover:text-sand'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <span className="hidden items-center gap-1.5 text-night-muted sm:flex">
            <GlobeIcon size={18} />
            عربي
          </span>
          {authed && user ? (
            <div className="group relative">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-[14px] font-extrabold text-night"
              >
                {initials(user.firstName, user.lastName, user.email)}
              </button>
              <div className="invisible absolute right-0 top-11 w-44 rounded-2xl border border-night-border bg-night-elevated p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
                <Link to="/account" className="block rounded-xl px-3 py-2 text-sm text-sand hover:bg-night-surface">
                  Account
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm text-sand hover:bg-night-surface"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="rounded-full border border-night-border px-4 py-1.5 text-sm font-semibold text-sand transition hover:bg-night-surface"
            >
              Sign in
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
