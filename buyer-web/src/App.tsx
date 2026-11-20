import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth, type SignInReason } from './lib/auth';
import { setStoredReferralCode } from './lib/api';
import { HostProvider } from './components/HostFlow';
import SiteHeader from './components/SiteHeader';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import SearchPage from './pages/SearchPage';
import EventPage from './pages/EventPage';
import SeatsPage from './pages/SeatsPage';
import CheckoutPage from './pages/CheckoutPage';
import TicketsPage from './pages/TicketsPage';
import SellPage from './pages/SellPage';
import OfferPage from './pages/OfferPage';
import AccountPage from './pages/AccountPage';
import InvitePage from './pages/InvitePage';
import PlansPage from './pages/PlansPage';
import { Spinner } from './components/ui';

function reasonFor(path: string): SignInReason {
  if (path.startsWith('/plans') || path.startsWith('/tickets')) return 'plans';
  if (path.startsWith('/account')) return 'profile';
  if (path.startsWith('/checkout') || path.includes('/seats')) return 'buy';
  if (path.startsWith('/sell')) return 'sell';
  if (path.startsWith('/offers')) return 'offer';
  return 'other';
}

/** Rule A2/A8: nothing redirects away. Signed-out visitors get in-context
 *  sign-in and land back on the same screen. */
function Protected({ children }: { children: JSX.Element }) {
  const { authed, booting, requireAuth } = useAuth();
  const { pathname } = useLocation();
  const reason = reasonFor(pathname);
  useEffect(() => {
    if (!booting && !authed) requireAuth(reason);
  }, [booting, authed, reason, requireAuth]);
  if (booting) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!authed) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="font-display text-3xl font-extrabold text-sand">Sign in to continue</div>
        <p className="mt-2 text-sm text-night-muted">No password. We’ll send you a 6-digit code.</p>
        <button
          type="button"
          onClick={() => requireAuth(reason)}
          className="mt-6 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-night"
        >
          Sign in
        </button>
      </div>
    );
  }
  return children;
}

function SiteLayout() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-night">
      <SiteHeader user={user} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/events/:id" element={<EventPage />} />
          <Route
            path="/events/:id/seats"
            element={
              <Protected>
                <SeatsPage />
              </Protected>
            }
          />
          <Route
            path="/checkout"
            element={
              <Protected>
                <CheckoutPage />
              </Protected>
            }
          />
          <Route
            path="/tickets"
            element={
              <Protected>
                <TicketsPage />
              </Protected>
            }
          />
          <Route
            path="/sell"
            element={
              <Protected>
                <SellPage />
              </Protected>
            }
          />
          <Route
            path="/offers/new"
            element={
              <Protected>
                <OfferPage />
              </Protected>
            }
          />
          <Route
            path="/account"
            element={
              <Protected>
                <AccountPage />
              </Protected>
            }
          />
          <Route
            path="/plans"
            element={
              <Protected>
                <PlansPage />
              </Protected>
            }
          />
          <Route path="/i/:code" element={<InvitePage />} />
          <Route path="/home" element={<HomeAlias />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/verify-email" element={<Navigate to="/" replace />} />
          <Route path="/r/:code" element={<ReferralRedirect />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function HomeAlias() {
  const { search } = useLocation();
  return <Navigate to={`/${search}`} replace />;
}

/** Legacy `/login?next=` links: open code sign-in over the front door, then
 *  continue to `next`. */
function LoginRoute() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { requireAuth, booting } = useAuth();
  const raw = params.get('next') ?? '/';
  const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
  useEffect(() => {
    if (booting) return;
    navigate('/', { replace: true });
    requireAuth('menu', () => navigate(next));
  }, [booting, next, navigate, requireAuth]);
  return null;
}

function ReferralRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { requireAuth } = useAuth();
  useEffect(() => {
    // TODO(api-gap): OTP verify takes no referral code; it is kept locally and
    // applied from Account → Referrals after sign-in.
    if (code) setStoredReferralCode(code);
    navigate('/', { replace: true });
    requireAuth('menu');
  }, [code, navigate, requireAuth]);
  return null;
}

function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <div className="font-display text-4xl font-extrabold text-sand">Page not found</div>
      <p className="mt-2 text-night-muted">That page doesn’t exist on Sahra.</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <HostProvider>
          <SiteLayout />
        </HostProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
