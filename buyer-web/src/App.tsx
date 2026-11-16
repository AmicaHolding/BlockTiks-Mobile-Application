import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { api, setStoredReferralCode } from './lib/api';
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
import AuthPage from './pages/AuthPage';
import { Spinner } from './components/ui';

function Protected({ children }: { children: JSX.Element }) {
  const { authed, booting } = useAuth();
  const location = useLocation();
  if (booting) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!authed) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
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
          <Route path="/login" element={<AuthPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/r/:code" element={<ReferralRedirect />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function ReferralRedirect() {
  const { code } = useParams<{ code: string }>();
  useEffect(() => {
    if (code) setStoredReferralCode(code);
  }, [code]);
  return <Navigate to="/login?ref=1" replace />;
}

function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const { authed } = useAuth();
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('This verification link is missing its token.');
      return;
    }
    api
      .verifyEmailConfirm(token)
      .then(() => setState('done'))
      .catch((e) => {
        setState('error');
        setMessage(e instanceof Error ? e.message : 'Verification failed');
      });
  }, [token]);

  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      {state === 'working' ? (
        <>
          <Spinner />
          <p className="mt-4 text-sm text-night-muted">Verifying your email…</p>
        </>
      ) : state === 'done' ? (
        <>
          <div className="font-display text-3xl font-extrabold text-sand">Email verified</div>
          <p className="mt-2 text-sm text-night-muted">Your Sahra account email is confirmed.</p>
          <button
            type="button"
            onClick={() => navigate(authed ? '/' : '/login')}
            className="mt-6 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-night"
          >
            Continue
          </button>
        </>
      ) : (
        <>
          <div className="font-display text-3xl font-extrabold text-sand">Verification failed</div>
          <p className="mt-2 text-sm text-night-muted">{message}</p>
          <Link to="/account" className="mt-6 inline-block text-sm font-semibold text-gold underline">
            Go to account
          </Link>
        </>
      )}
    </div>
  );
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
        <SiteLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}
