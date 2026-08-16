import React, { useEffect, useState } from 'react';
import { get, post, put, del } from '../api.js';
import { useToast } from '../components/Toast.jsx';

export default function Venue() {
  const toast = useToast();
  const [venues, setVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ name: '', capacity: 100, price: 0, description: '', emoji: '🎪' });
  const [error, setError] = useState('');

  const load = () => {
    get('/venues').then(setVenues).catch(() => {});
    get('/venue-bookings').then(setBookings).catch(() => {});
  };
  useEffect(load, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const openNew = () => { setEdit(null); setForm({ name: '', capacity: 100, price: 0, description: '', emoji: '🎪' }); };
  const openEdit = (v) => { setEdit(v); setForm({ name: v.name, capacity: v.capacity, price: v.price, description: v.description, emoji: v.emoji }); };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name) return setError('Venue name is required');
    setError('');
    if (edit) { await put(`/venues/${edit.id}`, form); toast('Venue updated'); }
    else { await post('/venues', form); toast('Venue added'); }
    setEdit(null);
    load();
  };

  const remove = async (v) => {
    if (!confirm(`Delete venue "${v.name}"?`)) return;
    await del(`/venues/${v.id}`);
    toast('Venue deleted');
    load();
  };

  const setStatus = async (b, status) => {
    await put(`/venue-bookings/${b.id}`, { status });
    toast(`Booking ${status}`);
    load();
  };

  return (
    <div>
      <div className="between">
        <h1>🎪 Venue Hall &amp; Functions</h1>
        <button className="btn primary" onClick={openNew}>➕ Add Venue</button>
      </div>
      {error && <div className="msg err" style={{ marginTop: 12 }}>{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', marginTop: 14, alignItems: 'start' }}>
        <div className="card">
          <h3>Venues</h3>
          <div className="venues-grid">
            {venues.map((v) => (
              <div key={v.id} className="venue-card">
                <div className="venue-emoji">{v.emoji}</div>
                <h3>{v.name}</h3>
                <p style={{ fontSize: 12 }}>{v.description}</p>
                <div className="venue-meta">
                  <span>👥 {v.capacity}</span>
                  <span>₹{Number(v.price).toLocaleString('en-IN')}</span>
                  <span className={'badge ' + (v.status === 'available' ? 'available' : 'maintenance')}>{v.status}</span>
                </div>
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn sm" onClick={() => openEdit(v)}>Edit</button>
                  <button className="btn sm red" onClick={() => remove(v)}>Delete</button>
                </div>
              </div>
            ))}
          </div>

          {edit !== undefined && (
            <form className="card" style={{ marginTop: 14, padding: 16 }} onSubmit={save}>
              <h3>{edit ? `Edit ${edit.name}` : 'New venue'}</h3>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label>Name *</label><input value={form.name} onChange={set('name')} placeholder="Grand Banquet Hall" /></div>
                <div><label>Emoji</label><input value={form.emoji} onChange={set('emoji')} /></div>
                <div><label>Capacity</label><input type="number" value={form.capacity} onChange={set('capacity')} /></div>
                <div><label>Price (₹)</label><input type="number" value={form.price} onChange={set('price')} /></div>
              </div>
              <label style={{ marginTop: 8 }}>Description</label>
              <textarea rows="2" value={form.description} onChange={set('description')} />
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn sm" onClick={() => setEdit(undefined)}>Cancel</button>
                <button className="btn primary sm">Save</button>
              </div>
            </form>
          )}
        </div>

        <div className="card">
          <h3>📅 Venue Bookings <span className="badge open" style={{ fontSize: 11 }}>from website</span></h3>
          {bookings.length === 0 ? (
            <div className="empty">No venue bookings yet — enquiries from the website appear here.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bookings.map((b) => (
                <div key={b.id} className="venue-booking">
                  <div className="between"><b>{b.venue_name || `Venue #${b.venue_id}`}</b><span className={'badge ' + (b.status === 'confirmed' ? 'available' : b.status === 'cancelled' ? 'cancelled' : 'open')}>{b.status}</span></div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>{b.customer_name} · {b.customer_phone}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{b.event_type} · {b.event_date} · {b.guests} guests</div>
                  {b.notes && <div style={{ fontSize: 12, color: 'var(--muted)' }}>📝 {b.notes}</div>}
                  <div className="row" style={{ marginTop: 8 }}>
                    {b.status !== 'confirmed' && <button className="btn sm green" onClick={() => setStatus(b, 'confirmed')}>Confirm</button>}
                    {b.status !== 'completed' && <button className="btn sm" onClick={() => setStatus(b, 'completed')}>Complete</button>}
                    {b.status !== 'cancelled' && <button className="btn sm red" onClick={() => setStatus(b, 'cancelled')}>Cancel</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}