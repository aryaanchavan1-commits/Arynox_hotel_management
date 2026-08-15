import React, { useEffect, useState } from 'react';
import { get, post } from '../api.js';

const STATUS_BADGE = { pending: 'open', confirmed: 'confirmed', checked_in: 'checked_in', checked_out: 'checked_out', cancelled: 'cancelled' };

export default function GuestMyBookings({ guest, onLogout }) {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/guest/my-bookings', true).then(setBookings).catch((e) => { setError(e.message); if (e.message.includes('Unauthorized')) onLogout(); }).finally(() => setLoading(false));
  }, []);

  async function cancel(b) {
    if (!window.confirm(`Cancel booking ${b.reference}?`)) return;
    try {
      await post(`/guest/bookings/${b.id}/cancel`, {}, true);
      setBookings(bookings.map((x) => x.id === b.id ? { ...x, status: 'cancelled' } : x));
    } catch (e) { setError(e.message); }
  }

  if (loading) return <div className="empty">Loading…</div>;

  return (
    <section className="public-section" style={{ maxWidth: 760, margin: '24px auto' }}>
      <div className="between" style={{ marginBottom: 16 }}>
        <h2>My bookings</h2>
        <span className="guest-bar">
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{guest?.name}</span>
        </span>
      </div>
      {error && <div className="msg err">{error}</div>}
      {bookings.length === 0 && (
        <div className="public-form" style={{ textAlign: 'center' }}>
          <div className="empty">You have no bookings yet.</div>
          <a className="btn primary" href="#/booking" style={{ marginTop: 12 }}>Book a room</a>
        </div>
      )}
      {bookings.map((b) => (
        <div key={b.id} className="public-form" style={{ marginBottom: 14 }}>
          <div className="between">
            <b style={{ color: 'var(--primary)' }}>{b.reference}</b>
            <span className={`badge ${STATUS_BADGE[b.status] || 'open'}`}>{b.status}</span>
          </div>
          <div style={{ marginTop: 10, display: 'grid', gap: 6, fontSize: 14 }}>
            <div>🏨 {b.room_type} · Room {b.room_number}</div>
            <div>📅 {b.check_in} → {b.check_out}</div>
            <div>👥 {b.adults} adults · {b.children} children · {b.meal_plan.replace('_', ' ')}</div>
            <div><b>Total: ₹{b.total}</b></div>
          </div>
          {['pending', 'confirmed'].includes(b.status) && (
            <button className="btn sm red" style={{ marginTop: 12 }} onClick={() => cancel(b)}>Cancel booking</button>
          )}
        </div>
      ))}
    </section>
  );
}