import React, { useState, useEffect } from 'react';
import { get } from '../api.js';

export default function PublicLayout({ guest, onGuestLogout, children }) {
  const route = location.hash.replace('#/', '') || 'home';
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState(null);
  useEffect(() => { setOpen(false); }, [route]);

  useEffect(() => {
    get('/public/hotels').then((d) => {
      setBrand(d.settings || {});
      if (d.settings?.primary_color) {
        document.documentElement.style.setProperty('--pub-primary', d.settings.primary_color);
      }
    }).catch(() => {});
  }, []);

  const name = brand?.hotel_name || 'Arynox Hotel';
  const short = name.replace(/_(hotel|hotels?|resort|inn)/gi, '');

  const links = [
    ['home', 'Home'],
    ['rooms', 'Rooms'],
    ['booking', 'Book Now'],
    ['contact', 'Contact'],
  ];

  return (
    <div className="public">
      <header className="public-head">
        <a href="#/" className="public-brand">🏨 {short}</a>
        <nav className={`public-nav${open ? ' open' : ''}`}>
          {links.map(([key, label]) => (
            <a key={key} href={`#/${key}`} className={route === key || (key === 'home' && !['rooms', 'booking', 'contact'].includes(route)) ? 'active' : ''}>{label}</a>
          ))}
          {guest ? (
            <div className="guest-bar">
              <span className="hello">Hi, {guest.name}</span>
              <a href="#/guest/my-bookings" className={route === 'guest/my-bookings' ? 'active' : ''}>My Bookings</a>
              <a href="#/" className="btn" onClick={() => { onGuestLogout(); }}>Logout</a>
            </div>
          ) : (
            <>
              <a href="#/guest/login">Sign in</a>
              <a href="#/guest/signup" className="btn">Sign up</a>
            </>
          )}
        </nav>
        <button className="public-hamburger" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
      </header>
      <main className="public-main">{children}</main>
      <footer className="public-footer">
        <div className="big">🏨 {name}</div>
        <p style={{ marginTop: 6 }}>{brand?.hotel_address || 'Arynox Hotel ERP, Tech Park, Pune, India'}</p>
        <p style={{ marginTop: 4 }}>📞 {brand?.hotel_phone || '+91 98765 43210'}{brand?.email ? ` · ✉️ ${brand.email}` : ''}</p>
        <div style={{ marginTop: 8, display: 'flex', gap: 14, justifyContent: 'center' }}>
          <a className="link" href="#/guest/login">Guest sign in</a> ·{' '}
          <a className="link" href="#/staff/login">Staff sign in</a>
        </div>
        <p style={{ marginTop: 8, fontSize: 12, color: '#8b93ad' }}>{brand?.footer_text || `${name}. All rights reserved.`}</p>
      </footer>
    </div>
  );
}