import React, { useState, useEffect } from 'react';

export default function PublicLayout({ guest, onGuestLogout, children }) {
  const route = location.hash.replace('#/', '') || 'home';
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [route]);

  const links = [
    ['home', 'Home'],
    ['rooms', 'Rooms'],
    ['booking', 'Book Now'],
    ['contact', 'Contact'],
  ];

  return (
    <div className="public">
      <header className="public-head">
        <a href="#/" className="public-brand">Arynox <span>Hotel</span></a>
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
        <div className="big">Arynox Hotel</div>
        <p style={{ marginTop: 6 }}>Arynox Hotel ERP, Tech Park, Pune, India · +91 98765 43210</p>
        <p style={{ marginTop: 8 }}>
          <a className="link" href="#/guest/login">Guest sign in</a> ·{' '}
          <a className="link" href="#/staff/login">Staff sign in</a>
        </p>
      </footer>
    </div>
  );
}