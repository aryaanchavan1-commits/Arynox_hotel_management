import React, { useEffect, useState } from 'react';
import { get, post } from '../api.js';

export default function PublicBooking({ setConfirm }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', id_type: 'passport', id_number: '', address: '' });
  const [savedGuest, setSavedGuest] = useState(() => JSON.parse(localStorage.getItem('arynox_guest_user') || 'null'));

  useEffect(() => {
    get('/public/hotels').then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const type = params.get('type');
    if (type && data) {
      const t = data.roomTypes.find((x) => String(x.id) === type);
      if (t) setSelected(t);
    }
  }, [data]);

  const s = data?.settings || {};

  async function search(e) {
    e.preventDefault();
    const ci = e.target.ci.value;
    const co = e.target.co.value;
    const adults = e.target.adults.value || 2;
    if (!ci || !co) return setError('Select both dates');
    if (new Date(co) <= new Date(ci)) return setError('Check-out must be after check-in');
    setSearching(true);
    setError('');
    try {
      const r = await get(`/availability?check_in=${ci}&check_out=${co}&adults=${adults}`);
      setResults(r);
      setSelected(null);
    } catch (e2) { setError(e2.message); }
    setSearching(false);
  }

  async function submit(e) {
    e.preventDefault();
    if (!selected) return setError('Pick a room type');
    if (!form.name || !form.phone) return setError('Name and phone are required');
    setSubmitting(true);
    setError('');
    try {
      const r = await post('/public/bookings', {
        room_type_id: selected.id,
        check_in: results.check_in,
        check_out: results.check_out,
        adults: results.adults,
        children: 0,
        ...form,
      });
      setConfirm(r);
      location.hash = '#/confirm';
    } catch (e2) { setError(e2.message); }
    setSubmitting(false);
  }

  return (
    <>
      <section className="public-section" style={{ marginTop: 8 }}>
        <h2>Book your stay</h2>
        <p className="sub">Find a room and confirm your reservation</p>
        {error && <div className="msg err">{error}</div>}
        <form className="public-search" onSubmit={search}>
          <div><label>Check-in</label><input type="date" name="ci" required /></div>
          <div><label>Check-out</label><input type="date" name="co" required /></div>
          <div><label>Guests</label><input type="number" name="adults" min="1" max="10" defaultValue="2" /></div>
          <button className="btn primary" disabled={searching}>{searching ? 'Checking…' : 'Search'}</button>
        </form>
      </section>

      {results && (
        <section className="public-section">
          <h2>Available rooms</h2>
          <p className="sub">{results.nights} night(s) · {results.adults} guest(s)</p>
          <div className="room-cards">
            {results.roomTypes.filter((t) => t.freeCount > 0).map((t) => (
              <div key={t.id} className={`room-card-public${selected?.id === t.id ? '' : ''}`} style={{ cursor: 'pointer', border: selected?.id === t.id ? '2px solid var(--primary)' : '1px solid var(--line)' }}
                onClick={() => setSelected({ ...t, nights: results.nights })}>
                <div className="img">🛏️</div>
                <div className="body">
                  <div className="name">{t.name}</div>
                  <div className="price">{s.currency_symbol || '₹'}{t.price} <small>/ night</small></div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Up to {t.capacity} guests · {t.freeCount} free</div>
                  <div className="price" style={{ marginTop: 4 }}>Total: {s.currency_symbol || '₹'}{t.total}</div>
                  <span className="btn primary" style={{ textAlign: 'center' }}>{selected?.id === t.id ? '✓ Selected' : 'Select'}</span>
                </div>
              </div>
            ))}
          </div>
          {results.roomTypes.every((t) => t.freeCount === 0) && <div className="empty">No rooms available for these dates.</div>}
        </section>
      )}

      {selected && results && (
        <section className="public-section">
          <h2>Guest details</h2>
          <form className="public-form" onSubmit={submit}>
            <div className="form-grid">
              <div className={savedGuest ? 'full' : ''}>
                <label>Full name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Riya Sharma" required />
              </div>
              <div>
                <label>Phone *</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 …" required />
              </div>
              <div>
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@email.com" />
              </div>
              <div>
                <label>ID type</label>
                <select value={form.id_type} onChange={(e) => setForm({ ...form, id_type: e.target.value })}>
                  <option value="passport">Passport</option>
                  <option value="aadhar">Aadhaar</option>
                  <option value="driving_license">Driving license</option>
                  <option value="pan">PAN</option>
                </select>
              </div>
              <div>
                <label>ID number</label>
                <input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} />
              </div>
              <div className="full">
                <label>Address</label>
                <textarea rows="2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <button className="btn green" style={{ marginTop: 16, width: '100%' }} disabled={submitting}>
              {submitting ? 'Booking…' : `Confirm booking — ${s.currency_symbol || '₹'}${selected.total}`}
            </button>
            <p className="sub" style={{ textAlign: 'center', marginTop: 10, fontSize: 12 }}>
              {savedGuest ? `Signed in as ${savedGuest.name} — your booking will be linked to your account.` : 'Sign in with your guest account to manage bookings later.'}
            </p>
          </form>
        </section>
      )}
    </>
  );
}