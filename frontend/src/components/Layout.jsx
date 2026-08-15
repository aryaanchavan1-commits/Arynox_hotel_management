import React, { useState } from 'react';
import { ROLE_MODULES } from '../lib/roles.js';

const NAV = {
  dashboard: ['dashboard', '📊', 'Dashboard'],
  rooms: ['rooms', '🛏️', 'Rooms'],
  availability: ['availability', '🔍', 'Availability'],
  bookings: ['bookings', '📅', 'Bookings'],
  guests: ['guests', '👥', 'Guests'],
  users: ['users', '🧑‍💼', 'Users'],
  restaurant: ['restaurant', '🍽️', 'Restaurant'],
  kitchen: ['kitchen', '👨‍🍳', 'Kitchen'],
  housekeeping: ['housekeeping', '🧹', 'Housekeeping'],
  pos: ['pos', '💳', 'POS / Billing'],
  reports: ['reports', '📈', 'Reports'],
  assistant: ['assistant', '🤖', 'AI Assistant'],
  settings: ['settings', '⚙️', 'Settings'],
};

function logout() {
  localStorage.removeItem('arynox_token');
  localStorage.removeItem('arynox_user');
  location.hash = '#/staff/login';
  location.reload();
}

export default function Layout({ user, children }) {
  const route = (location.hash.replace('#/', '') || 'dashboard').split('/')[0];
  const [dark, setDark] = useState(() => (localStorage.getItem('arynox_theme') || 'light') === 'dark');
  const mods = ROLE_MODULES[user?.role] || [];
  const items = mods.map((m) => NAV[m]).filter(Boolean);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    localStorage.setItem('arynox_theme', next ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  }
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, []);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">🏨 <b>Arynox_Hotel_ERP</b></div>
        <nav>
          {items.map(([key, icon, label]) => (
            <a key={key} href={`#/${key}`} className={route === key ? 'active' : ''}>{icon} {label}</a>
          ))}
        </nav>
        <div className="side-user">
          <div className="side-user-row">
            <div>👤 {user.name} <small>({user.role})</small></div>
          </div>
          <button className="btn sm" onClick={toggleDark}>{dark ? '☀️ Light' : '🌙 Dark'}</button>{' '}
          <button className="btn sm danger" onClick={logout}>Logout</button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}