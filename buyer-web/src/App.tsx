import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
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
