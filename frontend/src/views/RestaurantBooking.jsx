import React, { useState } from 'react';
import { post } from '../api.js';

export default function RestaurantBooking() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', date: '', time: '19:00', guests: 2, notes: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.date) return setError('Name, phone and date are required');
    setBusy(true);
    setError('');
    try {
      await post('/public/reservations', form);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not place the reservation');
    }
    setBusy(false);
  };

  if (done) {
    return (
      <section className="public-section">
        <div className="public-form glass" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 42 }}>🎉</div>
          <h2>Table reserved!</h2>
          <p className="sub">Thanks {form.name} — your table for {form.guests} on {form.date} at {form.time} is booked at Aadhya Restaurant.</p>
          <p className="sub">We will call you at {form.phone} to confirm. See you soon!</p>
          <a className="btn primary" href="#/">Back to menu</a>
        </div>
      </section>
    );
  }

  return (
    <section className="public-section">
      <h2>Book a Table</h2>
      <p className="sub">Reserve your table at Aadhya Restaurant — confirmation by phone</p>
      <form className="public-form glass" onSubmit={submit}>
        <div className="form-grid">
          <div className="full"><label>Full name *</label><input value={form.name} onChange={set('name')} placeholder="Your name" /></div>
          <div><label>Phone *</label><input value={form.phone} onChange={set('phone')} placeholder="+91…" /></div>
          <div><label>Email</label><input type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" /></div>
          <div><label>Date *</label><input type="date" value={form.date} onChange={set('date')} /></div>
          <div><label>Time</label><input type="time" value={form.time} onChange={set('time')} /></div>
          <div><label>Guests</label><input type="number" min="1" max="40" value={form.guests} onChange={set('guests')} /></div>
          <div className="full"><label>Special requests</label><textarea rows="3" value={form.notes} onChange={set('notes')} placeholder="Birthday, window seat, dietary needs…" /></div>
        </div>
        {error && <div className="msg err" style={{ marginTop: 10 }}>{error}</div>}
        <button className="btn primary" style={{ marginTop: 16, width: '100%' }} disabled={busy}>{busy ? 'Reserving…' : 'Reserve my table'}</button>
      </form>
    </section>
  );
}