import React, { useEffect, useState } from 'react';
import { get } from '../api.js';

export default function PublicHome() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    get('/public/hotels').then(setData).catch((e) => setError(e.message));
  }, []);

  const s = data?.settings || {};
  const types = data?.roomTypes || [];

  return (
    <>
      <section className="public-hero">
        <h1>Welcome to {s.hotel_name || 'Arynox Hotel'}</h1>
        <p>{s.welcome_message || 'Experience luxury and comfort'}</p>
        <a href="#/rooms" className="btn" style={{ background: '#fff', color: '#141a2e', border: 'none' }}>Explore Rooms</a>
      </section>

      <form className="public-search" onSubmit={(e) => { e.preventDefault(); location.hash = '#/booking'; }}>
        <div>
          <label>Check-in</label>
          <input type="date" id="pub-in" required />
        </div>
        <div>
          <label>Check-out</label>
          <input type="date" id="pub-out" required />
        </div>
        <div>
          <label>Guests</label>
          <input type="number" id="pub-adults" min="1" max="10" defaultValue="2" />
        </div>
        <button className="btn primary" type="submit">Check availability</button>
      </form>

      <section className="public-section">
        <h2>Our Rooms</h2>
        <p className="sub">Comfortable stays for every traveller</p>
        <div className="room-cards">
          {types.map((t) => (
            <a key={t.id} className="room-card-public" href="#/rooms">
              <div className="img">🛏️</div>
              <div className="body">
                <div className="name">{t.name}</div>
                <div className="price">{s.currency_symbol || '₹'}{t.price} <small>/ night</small></div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>{t.description}</div>
                <div className="amenities">{(t.amenities || []).slice(0, 4).map((a) => <span key={a}>{a}</span>)}</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="public-section">
        <h2>Facilities</h2>
        <p className="sub">Everything you need for a perfect stay</p>
        <div className="facilities">
          <div className="facility"><div className="icon">🌐</div><h3>Free Wi-Fi</h3><p>High-speed internet in every room</p></div>
          <div className="facility"><div className="icon">🍽️</div><h3>Restaurant</h3><p>Multi-cuisine restaurant &amp; bar</p></div>
          <div className="facility"><div className="icon">🏊</div><h3>Swimming Pool</h3><p>Rooftop infinity pool</p></div>
          <div className="facility"><div className="icon">💼</div><h3>Meeting Rooms</h3><p>Business centre &amp; conference hall</p></div>
          <div className="facility"><div className="icon">🚗</div><h3>Free Parking</h3><p>Secure on-site parking</p></div>
          <div className="facility"><div className="icon">🕒</div><h3>24/7 Front Desk</h3><p>Round-the-clock assistance</p></div>
        </div>
      </section>

      <section className="public-section">
        <h2>Gallery</h2>
        <div className="gallery">
          <div className="tile" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>🛏️</div>
          <div className="tile" style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}>🍽️</div>
          <div className="tile" style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}>🌇</div>
          <div className="tile" style={{ background: 'linear-gradient(135deg,#10b981,#0ea5e9)' }}>🏊</div>
        </div>
      </section>

      <section className="public-section">
        <h2>Contact &amp; Location</h2>
        <div className="public-form">
          <div style={{ marginBottom: 14 }}>
            <div><b>Address:</b> {s.hotel_address || 'Arynox Hotel ERP, Tech Park, Pune, India'}</div>
            <div style={{ marginTop: 6 }}><b>Phone:</b> {s.hotel_phone || '+91 98765 43210'}</div>
          </div>
          <a className="btn primary" href="#/booking">Book a room</a>
        </div>
      </section>
    </>
  );
}