import React, { useState, useEffect } from 'react';
import { ROLE_MODULES } from '../lib/roles.js';
import { get } from '../api.js';

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
  const route = (location.hash.replace('#/', '') || 'staff/dashboard').split('/')[1] || 'dashboard';
  const [dark, setDark] = useState(() => (localStorage.getItem('arynox_theme') || 'light') === 'dark');
  const [brand, setBrand] = useState('Hotel Laxmi Elite');
  const mods = ROLE_MODULES[user?.role] || [];
  const items = mods.map((m) => NAV[m]).filter(Boolean);

  useEffect(() => { get('/settings').then((s) => setBrand(s?.hotel_name || 'Hotel Laxmi Elite')).catch(() => {}); }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    localStorage.setItem('arynox_theme', next ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  }
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, []);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">🏨 <b>{brand}</b></div>
        <nav>
          {items.map(([key, icon, label]) => (
            <a key={key} href={`#/staff/${key}`} className={route === key ? 'active' : ''}>{icon} {label}</a>
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