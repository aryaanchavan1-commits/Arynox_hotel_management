import React, { useEffect, useState } from 'react';
import { get, post } from '../api.js';

export default function RestaurantBooking() {
  const [data, setData] = useState(null);
  const [tables, setTables] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', email: '', date: '', time: '19:00', guests: 2, notes: '' });
  const [tableId, setTableId] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    get('/public/hotels').then(setData).catch(() => {});
    get('/public/tables').then(setTables).catch(() => {});
  }, []);

  const s = data?.settings || {};
  const name = s.hotel_name || 'Hotel Lakshmi Elite';
  const fits = tables.filter((t) => Number(t.seats) >= form.guests);
  const free = fits.filter((t) => t.status === 'free');
  const maxSeats = Math.max(...tables.map((t) => Number(t.seats)), 4);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.date) return setError('Name, phone and date are required');
    if (form.guests > maxSeats) return setError(`We can seat up to ${maxSeats} guests at one table — call us for larger groups`);
    setBusy(true);
    setError('');
    try {
      const r = await post('/public/reservations', { ...form, table_id: tableId });
      setDone(r);
    } catch (err) {
      setError(err.message || 'Could not place the reservation');
    }
    setBusy(false);
  };

  if (done) {
    return (
      <section className="public-section" style={{ marginTop: 8 }}>
        <div className="hm-done" style={{ textAlign: 'center', padding: '48px 28px', maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 46 }}>🎉</div>
          <h2 style={{ color: '#fff' }}>Table reserved!</h2>
          <p style={{ color: '#c9c9d8', marginTop: 8 }}>
            Thanks {form.name} — {done.table ? <b style={{ color: '#d4af37' }}>Table {done.table}</b> : 'a table'} for {form.guests} on {form.date} at {form.time} is reserved at {name}.
          </p>
          <p style={{ color: '#c9c9d8', marginTop: 6 }}>We will call you at {form.phone} to confirm. See you soon!</p>
          <a className="hm-btn hm-btn-primary" style={{ marginTop: 18, display: 'inline-block' }} href="#/restaurant">Back to menu</a>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="public-section" style={{ marginTop: 8 }}>
        <h2>🪑 Book a Table</h2>
        <p className="sub">Reserve your table at {name} — live availability from the restaurant</p>
        <form className="public-form glass" onSubmit={submit} style={{ maxWidth: 640, margin: '0 auto' }}>
          <div className="form-grid">
            <div className="full"><label>Full name *</label><input value={form.name} onChange={set('name')} placeholder="Your name" /></div>
            <div><label>Phone *</label><input value={form.phone} onChange={set('phone')} placeholder="+91…" /></div>
            <div><label>Email</label><input type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" /></div>
            <div><label>Date *</label><input type="date" value={form.date} onChange={set('date')} /></div>
            <div><label>Time</label><input type="time" value={form.time} onChange={set('time')} /></div>
            <div><label>Guests</label><input type="number" min="1" max={maxSeats} value={form.guests} onChange={set('guests')} /></div>
            <div className="full"><label>Special requests</label><textarea rows="3" value={form.notes} onChange={set('notes')} placeholder="Birthday, window seat, dietary needs…" /></div>
          </div>

          <div style={{ marginTop: 18 }}>
            <label style={{ display: 'block', color: '#d4af37', fontSize: 12, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: 8 }}>
              Choose a table {free.length === 0 && tables.length > 0 && <span style={{ color: '#f2641b', textTransform: 'none' }}>— no free tables for {form.guests} guests right now</span>}
            </label>
            <div className="tb-grid">
              {fits.map((t) => {
                const isFree = t.status === 'free';
                const active = tableId === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    disabled={!isFree}
                    onClick={() => setTableId(active ? 0 : t.id)}
                    className="tb-opt"
                    style={{
                      border: active ? '2px solid #d4af37' : isFree ? '1px solid rgba(212,175,55,.35)' : '1px solid rgba(255,255,255,.08)',
                      opacity: isFree ? 1 : .45,
                      cursor: isFree ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{isFree ? '🟢' : '🔴'}</span>
                    <b style={{ display: 'block', color: '#fff', marginTop: 4 }}>Table {t.number}</b>
                    <span style={{ fontSize: 12, color: '#8d8d9e' }}>{t.seats} seats · {isFree ? 'Free' : t.status}</span>
                    {active && <span className="tb-selected">✓ Selected</span>}
                  </button>
                );
              })}
              {!fits.length && <div style={{ gridColumn: '1 / -1', color: '#8d8d9e', fontSize: 13, textAlign: 'center', padding: 12 }}>No tables fit {form.guests} guests — reduce guest count or call us directly.</div>}
            </div>
            <p style={{ color: '#8d8d9e', fontSize: 12, marginTop: 10 }}>
              {tableId ? 'Table picked — we will hold it for you after phone confirmation.' : 'Pick a table, or book without one and we will seat you on arrival.'}
            </p>
          </div>

          {error && <div className="msg err" style={{ marginTop: 10 }}>{error}</div>}
          <button className="hm-btn hm-btn-primary" style={{ marginTop: 18, width: '100%' }} disabled={busy}>{busy ? 'Reserving…' : `Reserve my table${tableId ? ` · Table ${tables.find((t) => t.id === tableId)?.number}` : ''}`}</button>
        </form>
      </section>
    </>
  );
}