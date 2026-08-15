import React, { useState, useEffect } from 'react';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Rooms from './pages/Rooms.jsx';
import Bookings from './pages/Bookings.jsx';
import Guests from './pages/Guests.jsx';
import Restaurant from './pages/Restaurant.jsx';
import POS from './pages/POS.jsx';
import Reports from './pages/Reports.jsx';
import Assistant from './pages/Assistant.jsx';

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
  const route = useHashRoute();

  if (!user) return <Login onLogin={(u) => { setUser(u); location.hash = '#/dashboard'; }} />;

  const pages = {
    dashboard: <Dashboard />,
    rooms: <Rooms />,
    bookings: <Bookings />,
    guests: <Guests />,
    restaurant: <Restaurant />,
    pos: <POS />,
    reports: <Reports />,
    assistant: <Assistant />,
  };

  return (
    <Layout user={user} onLogout={() => { localStorage.removeItem('arynox_token'); localStorage.removeItem('arynox_user'); setUser(null); }}>
      {pages[route] || <Dashboard />}
    </Layout>
  );
}