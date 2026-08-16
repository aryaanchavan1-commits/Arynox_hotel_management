import React, { useState, useEffect } from 'react';
import Layout from './components/Layout.jsx';
import PublicLayout from './components/PublicLayout.jsx';
import RestaurantLayout from './components/RestaurantLayout.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { ROLE_MODULES } from './lib/roles.js';
import Dashboard from './views/Dashboard.jsx';
import Rooms from './views/Rooms.jsx';
import Availability from './views/Availability.jsx';
import Bookings from './views/Bookings.jsx';
import Guests from './views/Guests.jsx';
import Users from './views/Users.jsx';
import Restaurant from './views/Restaurant.jsx';
import Kitchen from './views/Kitchen.jsx';
import Housekeeping from './views/Housekeeping.jsx';
import POS from './views/POS.jsx';
import Reports from './views/Reports.jsx';
import Assistant from './views/Assistant.jsx';
import Settings from './views/Settings.jsx';
import Login from './views/Login.jsx';
import PublicHome from './views/PublicHome.jsx';
import PublicRooms from './views/PublicRooms.jsx';
import PublicBooking from './views/PublicBooking.jsx';
import PublicConfirm from './views/PublicConfirm.jsx';
import GuestSignup from './views/GuestSignup.jsx';
import GuestLogin from './views/GuestLogin.jsx';
import GuestMyBookings from './views/GuestMyBookings.jsx';
import PublicRestaurant from './views/PublicRestaurant.jsx';
import PublicVenue from './views/PublicVenue.jsx';
import Venue from './views/Venue.jsx';

function useHashRoute() {
  const [route, setRoute] = useState(() => location.hash.replace('#/', '') || '');
  useEffect(() => {
    const fn = () => setRoute(location.hash.replace('#/', '') || '');
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  return route;
}

const getSiteMode = () => (typeof document !== 'undefined' ? (document.querySelector('meta[name="site-mode"]')?.getAttribute('content') || 'erp') : 'erp');

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('arynox_user') || 'null'));
  const [guest, setGuest] = useState(() => JSON.parse(localStorage.getItem('arynox_guest_user') || 'null'));
  const [confirm, setConfirm] = useState(null);
  const route = useHashRoute();
  const seg = route.split('/');

  const siteMode = getSiteMode();
  const publicOnly = siteMode === 'public' || siteMode === 'restaurant';

  // hotel + restaurant + venue all live on the public website (merged single site)

  // ERP deployment: every route belongs to the staff interface (login screen when no session).
  // Website deployment: only public/guest routes; staff routes render the website home.
  const isStaffArea = siteMode === 'erp' || seg[0] === 'staff';
  const staffKey = isStaffArea ? (seg[1] || 'dashboard') : '';
  const publicKey = isStaffArea ? '' : (seg[0] || 'home');

  // staff logged in + visited a staff area -> show ERP
  const showErp = user && isStaffArea;
  // staff area without a session -> staff login screen
  const showStaffLogin = !user && isStaffArea;
  // public site routes (guest or anonymous)
  const publicRoutes = {
    home: <PublicHome />,
    rooms: <PublicRooms />,
    booking: <PublicBooking setConfirm={setConfirm} />,
    confirm: <PublicConfirm confirm={confirm} setConfirm={setConfirm} />,
    restaurant: <PublicRestaurant />,
    venue: <PublicVenue />,
    'guest/login': <GuestLogin onLogin={setGuest} />,
    'guest/signup': <GuestSignup onLogin={setGuest} />,
    'guest/my-bookings': <GuestMyBookings guest={guest} onLogout={() => { localStorage.removeItem('arynox_guest_token'); localStorage.removeItem('arynox_guest_user'); setGuest(null); }} />,
    contact: <PublicHome />,
  };

  const staffPages = {
    dashboard: <Dashboard />,
    rooms: <Rooms />,
    availability: <Availability />,
    bookings: <Bookings />,
    guests: <Guests />,
    users: <Users user={user} />,
    restaurant: <Restaurant />,
    kitchen: <Kitchen />,
    housekeeping: <Housekeeping />,
    pos: <POS />,
    venue: <Venue />,
    reports: <Reports />,
    assistant: <Assistant />,
    settings: <Settings />,
  };

  // render public site
  if (!isStaffArea) {
    const page = publicRoutes[route] || publicRoutes.home;
    return (
      <PublicLayout guest={guest} publicOnly={publicOnly} onGuestLogout={() => { localStorage.removeItem('arynox_guest_token'); localStorage.removeItem('arynox_guest_user'); setGuest(null); }}>
        {page}
      </PublicLayout>
    );
  }

  // staff login screen
  if (showStaffLogin) {
    return <Login onLogin={setUser} />;
  }

  // staff ERP
  const mods = user ? ROLE_MODULES[user.role] || [] : [];
  const allowedKey = mods.includes(staffKey) ? staffKey : (mods[0] || 'dashboard');
  const page = staffPages[allowedKey] || <Dashboard />;
  return (
    <Layout user={user}>
      <ToastProvider>
        {page}
      </ToastProvider>
    </Layout>
  );
}