import React from 'react';

const NAV = [
  ['dashboard', '📊', 'Dashboard'],
  ['rooms', '🛏️', 'Rooms'],
  ['bookings', '📅', 'Bookings'],
  ['guests', '👥', 'Guests'],
  ['restaurant', '🍽️', 'Restaurant'],
  ['pos', '💳', 'POS / Billing'],
  ['reports', '📈', 'Reports'],
  ['assistant', '🤖', 'AI Assistant'],
  ['settings', '⚙️', 'Settings'],
];

export default function Layout({ user, onLogout, children }) {
  const route = location.hash.replace('#/', '') || 'dashboard';
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">🏨 <b>Arynox_Hotel_ERP</b></div>
        <nav>
          {NAV.map(([key, icon, label]) => (
            <a key={key} href={`#/${key}`} className={route === key ? 'active' : ''}>{icon} {label}</a>
          ))}
        </nav>
        <div className="side-user">
          <div>👤 {user.name} <small>({user.role})</small></div>
          <button className="btn ghost" onClick={onLogout}>Logout</button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}