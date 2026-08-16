import React, { useState, useEffect } from 'react';
import { get } from '../api.js';
import ChatWidget from './ChatWidget.jsx';

export default function PublicLayout({ guest, onGuestLogout, children }) {
  const route = location.hash.replace('#/', '') || 'home';
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => (localStorage.getItem('arynox_theme') || 'light') === 'dark');
  const [brand, setBrand] = useState(null);
  useEffect(() => { setOpen(false); }, [route]);
  useEffect(() => { document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light'); }, [dark]);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('arynox_theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    get('/public/hotels').then((d) => {
      setBrand(d.settings || {});
      if (d.settings?.primary_color) {
        document.documentElement.style.setProperty('--pub-primary', d.settings.primary_color);
      }
    }).catch(() => {});
  }, []);

  const name = brand?.hotel_name || 'Hotel Lakshmi Deluxe';
  const short = name.replace(/_(hotel|hotels?|resort|inn)/gi, '');

  const links = [
    ['home', 'Home'],
    ['rooms', 'Rooms'],
    ['booking', 'Book Now'],
    ['restaurant', 'Restaurant'],
    ['venue', 'Venue Hall'],
    ['contact', 'Contact'],
  ];

  return (
    <div className="public">
      <header className="public-head">
        <a href="#/" className="public-brand">
          <img src="/logo.svg" alt={name} className="public-logo" />
          <span>{short}</span>
        </a>
        <nav className={`public-nav${open ? ' open' : ''}`}>
          {links.map(([key, label]) => (
            <a key={key} href={`#/${key}`} className={route === key || (key === 'home' && !['rooms', 'booking', 'restaurant', 'venue', 'contact'].includes(route)) ? 'active' : ''}>{label}</a>
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
        <button className="public-theme" onClick={toggleDark} aria-label="Toggle theme" title={dark ? 'Light mode' : 'Dark mode'}>{dark ? '☀️' : '🌙'}</button>
        <button className="public-hamburger" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
      </header>
      <main className="public-main">{children}</main>
      <footer className="public-footer">
        <a href="#/" className="big"><img src="/logo.svg" alt={name} className="footer-logo" style={{ marginRight: 6, verticalAlign: -7 }} /> {name}</a>
        <h4 style={{ fontSize: 20, margin: '18px 0 4px', fontWeight: 600 }}>Contact</h4>
        <div className="hm-footer-grid">
          <div className="hm-footer-col">
            <p>{brand?.hotel_address || 'Near Rajwadu Resort, Mumbai-Pune Expressway, Pune, India'}</p>
            <p>📞 {brand?.hotel_phone || '+91 98765 43210'}</p>
            {brand?.email && <p>✉️ {brand.email}</p>}
          </div>
          <div className="hm-footer-col">
            <p><a className="link" href="#/contact">Our Story</a></p>
            <p><a className="link" href="#/contact">Get in Touch</a></p>
            <p><a className="link" href="#/guest/login">Guest sign in</a></p>
          </div>
          <div className="hm-footer-col">
            <p><a className="link" href="#/restaurant">Dining Experience</a></p>
            <p><a className="link" href="#/venue">Events &amp; Functions</a></p>
            <p><a className="link" href="#/booking">Book a Room</a></p>
          </div>
        </div>
        <p style={{ marginTop: 14, fontSize: 12, color: '#8b93ad' }}>{brand?.footer_text || `${name}. All rights reserved.`}</p>
        <div className="hm-footer-bar" />
      </footer>
      <ChatWidget brand={brand} />
    </div>
  );
}