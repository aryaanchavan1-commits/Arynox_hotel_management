import React, { useState, useEffect } from 'react';
import { get } from '../api.js';
import ChatWidget from './ChatWidget.jsx';

export default function RestaurantLayout({ children }) {
  const route = location.hash.replace('#/', '') || 'menu';
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
      if (d.settings?.primary_color) document.documentElement.style.setProperty('--pub-primary', d.settings.primary_color);
    }).catch(() => {});
  }, []);

  const name = brand?.hotel_name || 'Hotel Lakshmi Deluxe';
  const links = [
    ['menu', 'Menu'],
    ['booking', 'Book a Table'],
    ['contact', 'Contact'],
  ];
  const active = (key) => route === key || (key === 'menu' && !['booking', 'contact'].includes(route));

  return (
    <div className="public restaurant-site">
      <header className="public-head">
        <a href="#/" className="public-brand">
          <img src="/logo.svg" alt={name} className="public-logo" />
          {name} <span className="brand-tag">Restaurant</span>
        </a>
        <nav className={`public-nav${open ? ' open' : ''}`}>
          {links.map(([key, label]) => (
            <a key={key} href={`#/${key}`} className={active(key) ? 'active' : ''}>{label}</a>
          ))}
          <a href="#/guest/login">Sign in</a>
          <a href="#/booking" className="btn">Book a Table</a>
        </nav>
        <button className="public-theme" onClick={toggleDark} aria-label="Toggle theme">{dark ? '☀️' : '🌙'}</button>
        <button className="public-hamburger" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
      </header>
      <main className="public-main">{children}</main>
      <footer className="public-footer">
        <div className="big">🍽️ Aadhya Restaurant · {name}</div>
        <p style={{ marginTop: 6 }}>{brand?.hotel_address || 'Near Rajwadu Resort, Mumbai-Pune Expressway, Pune, India'}</p>
        <p style={{ marginTop: 4 }}>📞 {brand?.hotel_phone || '+91 98765 43210'}{brand?.email ? ` · ✉️ ${brand.email}` : ''}</p>
        <p style={{ marginTop: 4 }}>🕐 {brand?.restaurant_hours || 'Daily 7:00 AM – 11:00 PM'}</p>
        <p style={{ marginTop: 8, fontSize: 12, color: '#8b93ad' }}>{brand?.footer_text || `${name}. All rights reserved.`}</p>
      </footer>
      <ChatWidget brand={brand} />
    </div>
  );
}