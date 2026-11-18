import { useCallback, useEffect, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { api, setToken, setOrgId, type User } from './lib/api';
import { OrgProvider, useOrg } from './lib/org';
import StudioLayout from './components/StudioLayout';
import { LoadingBlock } from './components/ui';
import LoginPage from './pages/LoginPage';
import OrgSetupPage from './pages/OrgSetupPage';
import OverviewPage from './pages/OverviewPage';
import EventsPage from './pages/EventsPage';
import CreateEventPage from './pages/CreateEventPage';
import ManageEventPage from './pages/ManageEventPage';
import OrdersPage from './pages/OrdersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PromoCodesPage from './pages/PromoCodesPage';
import PayoutsPage from './pages/PayoutsPage';
import TeamPage from './pages/TeamPage';
import VenuesPage from './pages/VenuesPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

function AdminRoute({ children }: { children: JSX.Element }) {
  const { role } = useOrg();
  if (role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function AuthedApp({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { orgs, ready, refresh } = useOrg();
  const location = useLocation();
  const navigate = useNavigate();

  // No orgs → the only place to be is the "Who's hosting?" step (W2).
  useEffect(() => {
    if (ready && orgs.length === 0 && location.pathname !== '/setup') {
      navigate('/setup', { replace: true });
    }
  }, [ready, orgs.length, location.pathname, navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand">
        <LoadingBlock label="Opening Studio…" />
      </div>
    );
  }

  if (location.pathname === '/setup') {
    return (
      <OrgSetupPage user={user} hasOrgs={orgs.length > 0} onCreated={refresh} />
    );
  }

  return (
    <Routes>
      <Route element={<StudioLayout onLogout={onLogout} />}>
        <Route index element={<OverviewPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/new" element={<CreateEventPage />} />
        <Route path="events/:id" element={<ManageEventPage />} />
        {/* legacy route → venues tab for the event's venue */}
        <Route path="events/:id/venue" element={<VenueRedirect />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="promos" element={<PromoCodesPage />} />
        <Route path="venues" element={<VenuesPage />} />
        <Route
          path="payouts"
          element={
            <AdminRoute>
              <PayoutsPage />
            </AdminRoute>
          }
        />
        <Route
          path="team"
          element={
            <AdminRoute>
              <TeamPage />
            </AdminRoute>
          }
        />
        <Route
          path="settings"
          element={
            <AdminRoute>
              <SettingsPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function VenueRedirect() {
  const location = useLocation();
  const id = location.pathname.split('/')[2];
  return <Navigate to={`/venues?event=${id}`} replace />;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const onLogout = useCallback(() => {
    api.logout();
    setToken(null);
    setOrgId(null);
    setUser(null);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand">
        <LoadingBlock label="Opening Studio…" />
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onAuthenticated={(u) => {
          setUser(u);
        }}
      />
    );
  }

  return (
    <BrowserRouter>
      <OrgProvider user={user}>
        <AuthedApp user={user} onLogout={onLogout} />
      </OrgProvider>
    </BrowserRouter>
  );
}
