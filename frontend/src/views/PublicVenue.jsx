import React, { useEffect, useState } from 'react';
import { get, post } from '../api.js';

const EMOJI = { wedding: '💍', birthday: '🎂', corporate: '💼', party: '🎉', other: '✨' };

export default function PublicVenue() {
  const [venues, setVenues] = useState([]);
  const [form, setForm] = useState({ venue_id: '', name: '', phone: '', email: '', date: '', event_type: 'Wedding', guests: 100, notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    get('/public/venues').then((v) => {
      setVenues(v || []);
      if (v?.[0]) setForm((f) => ({ ...f, venue_id: String(v[0].id) }));
    }).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.date) return setError('Name, phone and date are required');
    setBusy(true);
    setError('');
    try {
      await post('/public/venue-bookings', form);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not send the enquiry');
    }
    setBusy(false);
  };

  if (done) {
    return (
      <section className="public-section">
        <div className="public-form glass" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 42 }}>🎉</div>
          <h2>Enquiry received!</h2>
          <p className="sub">Thanks {form.name} — our events team will call you at {form.phone} to confirm your function on {form.date}.</p>
          <a className="btn primary" href="#/venue">View venues again</a>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="restaurant-hero">
        <h1>🎪 Venue &amp; Functions</h1>
        <p className="tag">Weddings · Sangeet · Corporate events · Celebrations — grand spaces, perfect memories</p>
      </section>

      <section className="public-section">
        <h2>Our Venues</h2>
        <div className="venues-grid">
          {venues.map((v) => (
            <div key={v.id} className="venue-card glass">
              <div className="venue-emoji">{v.emoji}</div>
              <h3>{v.name}</h3>
              <p>{v.description}</p>
              <div className="venue-meta">
                <span>👥 Up to {v.capacity}</span>
                <span className="menu-price">₹{Number(v.price).toLocaleString('en-IN')}</span>
              </div>
              <button className="btn primary" onClick={() => { setForm((f) => ({ ...f, venue_id: String(v.id) })); document.getElementById('venue-form')?.scrollIntoView({ behavior: 'smooth' }); }}>Enquire for {v.name}</button>
            </div>
          ))}
        </div>
      </section>

      <section className="public-section" id="venue-form">
        <h2>Book a Venue</h2>
        <p className="sub">Send an enquiry — our events team confirms availability by phone</p>
        <form className="public-form glass" onSubmit={submit}>
          <div className="form-grid">
            <div><label>Venue *</label>
              <select value={form.venue_id} onChange={set('venue_id')}>
                {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div><label>Event type</label>
              <select value={form.event_type} onChange={set('event_type')}>
                {Object.keys(EMOJI).map((k) => <option key={k} value={k.charAt(0).toUpperCase() + k.slice(1)}>{EMOJI[k]} {k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
              </select>
            </div>
            <div><label>Full name *</label><input value={form.name} onChange={set('name')} placeholder="Your name" /></div>
            <div><label>Phone *</label><input value={form.phone} onChange={set('phone')} placeholder="+91…" /></div>
            <div><label>Email</label><input type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" /></div>
            <div><label>Function date *</label><input type="date" value={form.date} onChange={set('date')} /></div>
            <div><label>Expected guests</label><input type="number" min="10" max="2000" value={form.guests} onChange={set('guests')} /></div>
            <div className="full"><label>Special requirements</label><textarea rows="3" value={form.notes} onChange={set('notes')} placeholder="Catering, decor, stage, lighting, parking…" /></div>
          </div>
          {error && <div className="msg err" style={{ marginTop: 10 }}>{error}</div>}
          <button className="btn primary" style={{ marginTop: 16, width: '100%' }} disabled={busy}>{busy ? 'Sending…' : 'Send venue enquiry'}</button>
        </form>
      </section>
    </>
  );
}