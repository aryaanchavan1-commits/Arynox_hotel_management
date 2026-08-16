import React, { useState, useEffect } from 'react';
import { ROLE_MODULES } from '../lib/roles.js';
import { get } from '../api.js';

const NAV = {
  dashboard: ['dashboard', '📊', 'Dashboard'],
  rooms: ['rooms', '🚪', 'Rooms'],
  availability: ['availability', '📅', 'Availability'],
  bookings: ['bookings', '🗓️', 'Bookings'],
  guests: ['guests', '👥', 'Guests'],
  users: ['users', '🔐', 'Users & Roles'],
  restaurant: ['restaurant', '🍽️', 'Restaurant'],
  kitchen: ['kitchen', '👨‍🍳', 'Kitchen'],
  housekeeping: ['housekeeping', '🧹', 'Housekeeping'],
  pos: ['pos', '🧾', 'POS / Billing'],
  venue: ['venue', '🎪', 'Venue Hall'],
  channels: ['channels', '📡', 'Channel Manager'],
  reports: ['reports', '📈', 'Reports'],
  assistant: ['assistant', '🤖', 'AI Assistant'],
  settings: ['settings', '⚙️', 'Settings'],
};

const SECTIONS = [
  ['Operations', ['dashboard', 'rooms', 'availability', 'bookings', 'guests']],
  ['Restaurant', ['restaurant', 'kitchen', 'pos']],
  ['Events', ['venue', 'channels']],
  ['Management', ['users', 'reports', 'assistant', 'settings']],
];

function logout() {
  localStorage.removeItem('arynox_token');
  localStorage.removeItem('arynox_user');
  location.hash = '#/staff/login';
  location.reload();
}

export default function Layout({ user, children }) {
  const route = (location.hash.replace('#/', '') || 'staff/dashboard').split('/')[1] || 'dashboard';
  const [dark, setDark] = useState(() => (localStorage.getItem('arynox_theme') || 'light') === 'dark');
  const [brand, setBrand] = useState('Hotel Lakshmi Deluxe');
  const mods = ROLE_MODULES[user?.role] || [];
  const items = mods.map((m) => NAV[m]).filter(Boolean);

  useEffect(() => { get('/settings').then((s) => setBrand(s?.hotel_name || 'Hotel Lakshmi Deluxe')).catch(() => {}); }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    localStorage.setItem('arynox_theme', next ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  }
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, []);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="erp">
      <aside className="erp-sidebar">
        <div className="erp-brand">
          <img src="/logo.svg" alt="" className="erp-logo" />
          <div className="erp-brand-text">
            <h1>Arynoxtech</h1>
            <p>{brand}</p>
          </div>
        </div>
        <nav className="erp-nav">
          {SECTIONS.map(([label, keys]) => {
            const vis = keys.filter((k) => items.some((i) => i[0] === k));
            if (vis.length === 0) return null;
            return (
              <div key={label} className="erp-nav-section">
                <p className="erp-nav-label">{label}</p>
                {vis.map((k) => {
                  const [key, icon, lbl] = NAV[k];
                  return (
                    <a key={key} href={`#/staff/${key}`} className={route === key ? 'active' : ''}>
                      <span className="erp-nav-icon">{icon}</span> {lbl}
                    </a>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="erp-sidebar-foot">
          <span className="dot-live" /> Live · v2.0
        </div>
      </aside>

      <div className="erp-main">
        <header className="erp-topbar">
          <div className="erp-topbar-left">
            <span className="erp-date">{today}</span>
          </div>
          <div className="erp-topbar-right">
            <span className="erp-live"><span className="dot-live" /> Connected</span>
            <button className="erp-icon-btn" onClick={toggleDark} title="Toggle theme">{dark ? '☀️' : '🌙'}</button>
            <div className="erp-user">
              <div className="erp-avatar">{String(user?.name || 'U').charAt(0).toUpperCase()}</div>
              <div className="erp-user-text">
                <b>{user?.name}</b>
                <span>{user?.role}</span>
              </div>
              <button className="erp-icon-btn" onClick={logout} title="Logout">⎋</button>
            </div>
          </div>
        </header>
        <main className="erp-content">
          <div className="erp-wrap">{children}</div>
        </main>
      </div>
    </div>
  );
}