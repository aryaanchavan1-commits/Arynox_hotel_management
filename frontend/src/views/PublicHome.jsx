import React, { useEffect, useState, Suspense, lazy } from 'react';
import { get } from '../api.js';
const ThreeHero = lazy(() => import('../components/ThreeHero.jsx'));

export default function PublicHome() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    get('/public/hotels').then(setData).catch((e) => setError(e.message));
  }, []);

  const s = data?.settings || {};
  const types = data?.roomTypes || [];
  const facilities = data?.facilities || [];
  const gallery = data?.gallery || [];
  const social = data?.social || {};

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <>
      <section className="public-hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <Suspense fallback={null}><ThreeHero color={s.primary_color || '#fff'} /></Suspense>
        <div className="hero-inner">
          <h1>{s.welcome_message || `Welcome to ${s.hotel_name || 'Hotel Laxmi Elite'}`}</h1>
          <p className="tag">{s.tagline || 'Luxury · Dining · Celebration'}</p>
          <div className="hero-actions">
            <a href="#/rooms" className="btn primary">Explore Rooms</a>
            <a href="#/booking" className="btn ghost">Book a Stay</a>
          </div>
        </div>
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

      <section className="public-section" id="rooms">
        <h2>Our Rooms</h2>
        <p className="sub">Comfortable stays for every traveller</p>
        <div className="room-cards">
          {types.map((t) => (
            <a key={t.id} className="room-card-public" href="#/booking">
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

      {s.about_text && (
        <section className="public-section about">
          <h2>About {s.hotel_name || 'Us'}</h2>
          <p className="about-text">{s.about_text}</p>
        </section>
      )}

      <section className="public-section" id="facilities">
        <h2>Facilities</h2>
        <p className="sub">Everything you need for a perfect stay</p>
        <div className="facilities">
          {facilities.map((f) => (
            <div className="facility" key={f.title}><div className="icon">{f.icon}</div><h3>{f.title}</h3><p>{f.text}</p></div>
          ))}
        </div>
      </section>

      <section className="public-section" id="gallery">
        <h2>Gallery</h2>
        <div className="gallery">
          {gallery.map((g) => (
            <div className="tile" key={g.label} style={{ background: g.color }}>{g.emoji}<span>{g.label}</span></div>
          ))}
        </div>
      </section>

      <section className="public-section" id="contact">
        <h2>Contact &amp; Location</h2>
        <div className="public-form">
          <div style={{ marginBottom: 14 }}>
            <div><b>Address:</b> {s.hotel_address || 'Arynox Hotel ERP, Tech Park, Pune, India'}</div>
            <div style={{ marginTop: 6 }}><b>Phone:</b> {s.hotel_phone || '+91 98765 43210'}</div>
            {s.email && <div style={{ marginTop: 6 }}><b>Email:</b> {s.email}</div>}
          </div>
          {Object.entries(social).filter(([, v]) => v).map(([k, v]) => (
            <a key={k} className="social" href={v} target="_blank" rel="noreferrer">{k}</a>
          ))}
          <a className="btn primary" href="#/booking">Book a room</a>
        </div>
      </section>
    </>
  );
}