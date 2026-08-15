import React, { useState, useEffect } from 'react';
import Layout from './components/Layout.jsx';
import { post } from './api.js';
import Dashboard from './pages/Dashboard.jsx';
import Rooms from './pages/Rooms.jsx';
import Bookings from './pages/Bookings.jsx';
import Guests from './pages/Guests.jsx';
import Restaurant from './pages/Restaurant.jsx';
import POS from './pages/POS.jsx';
import Reports from './pages/Reports.jsx';
import Assistant from './pages/Assistant.jsx';
import Settings from './pages/Settings.jsx';

function useHashRoute() {
  const [route, setRoute] = useState(() => location.hash.replace('#/', '') || 'dashboard');
  useEffect(() => {
    const fn = () => setRoute(location.hash.replace('#/', '') || 'dashboard');
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  return route;
}

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('arynox_user') || 'null'));
  const [err, setErr] = useState('');
  const route = useHashRoute();

  useEffect(() => {
    if (user) return;
    post('/auth/login', { username: 'admin', password: 'admin123' })
      .then((r) => {
        localStorage.setItem('arynox_token', r.token);
        localStorage.setItem('arynox_user', JSON.stringify(r.user));
        setUser(r.user);
      })
      .catch((e2) => setErr(e2.message));
  }, [user]);

  if (!user) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <img src="/logo.svg" alt="Arynox_Hotel_ERP" width="96" style={{ margin: '0 auto 8px', display: 'block' }} />
          <h2>Arynox_Hotel_ERP</h2>
          {err
            ? <div className="msg err" style={{ marginTop: 14 }}>{err}</div>
            : <p style={{ color: 'var(--muted)' }}>Connecting…</p>}
        </div>
      </div>
    );
  }

  const pages = {
    dashboard: <Dashboard />,
    rooms: <Rooms />,
    bookings: <Bookings />,
    guests: <Guests />,
    restaurant: <Restaurant />,
    pos: <POS />,
    reports: <Reports />,
    assistant: <Assistant />,
    settings: <Settings />,
  };

  return (
    <Layout user={user}>
      {pages[route] || <Dashboard />}
    </Layout>
  );
}