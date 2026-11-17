import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { api, getToken, setToken, type User } from './lib/api';
import StudioLayout from './components/StudioLayout';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import CreateEventPage from './pages/CreateEventPage';
import ManageEventPage from './pages/ManageEventPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import OrdersPage from './pages/OrdersPage';
import PromoCodesPage from './pages/PromoCodesPage';
import PayoutsPage from './pages/PayoutsPage';
import VenueLayoutPage from './pages/VenueLayoutPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let active = true;
    if (!getToken()) {
      setBooting(false);
      return;
    }
    api
      .me()
      .then((res) => {
        if (active) setUser(res.user);
      })
      .catch(() => {
        if (active) setToken(null);
      })
      .finally(() => {
        if (active) setBooting(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function logout() {
    setToken(null);
    setUser(null);
  }

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-night text-sand">
        <div className="font-display text-2xl font-bold text-gold">Sahra Studio</div>
      </div>
    );
  }

  if (!user) {
    return (
      <BrowserRouter>
        <LoginPage onAuth={setUser} />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <StudioLayout user={user} onLogout={logout}>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/events" element={<OverviewPage />} />
          <Route path="/events/new" element={<CreateEventPage />} />
          <Route path="/events/:id" element={<ManageEventPage />} />
          <Route path="/events/:id/venue" element={<VenueLayoutPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/promos" element={<PromoCodesPage />} />
          <Route path="/payouts" element={<PayoutsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </StudioLayout>
    </BrowserRouter>
  );
}
