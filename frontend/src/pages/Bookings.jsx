import React, { useEffect, useState } from 'react';
import { get, post, put } from '../api.js';
import ReceiptModal from '../components/ReceiptModal.jsx';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [guests, setGuests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [show, setShow] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [form, setForm] = useState({ guest_id: '', room_id: '', check_in: '', check_out: '', adults: 1, children: 0 });

  const load = () => {
    get('/bookings').then(setBookings).catch(() => {});
    get('/guests').then((g) => setGuests(g.slice(0, 50))).catch(() => {});
    get('/rooms').then((r) => setRooms(r.filter((x) => x.status === 'available'))).catch(() => {});
  };
  useEffect(load, []);

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const create = async (e) => {
    e.preventDefault();
    await post('/bookings', { ...form, status: 'confirmed' });
    setShow(false);
    load();
  };
  const act = async (b, action, extra = {}) => {
    const r = await post(`/bookings/${b.id}/${action}`, extra);
    if (r.billId) setReceipt(r.billId);
    load();
  };

  return (
    <div>
      <div className="between">
        <h1>📅 Bookings</h1>
        <button className="btn primary" onClick={() => { setForm({ guest_id: '', room_id: '', check_in: today, check_out: tomorrow, adults: 1, children: 0 }); setShow(true); }}>➕ New Booking</button>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <table>
          <thead><tr><th>ID</th><th>Guest</th><th>Room</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>#{b.id}</td><td>{b.guest_name}<br /><small style={{ color: 'var(--muted)' }}>{b.guest_phone}</small></td>
                <td>{b.room_number}</td><td>{b.check_in}</td><td>{b.check_out}</td>
                <td><span className={'badge ' + b.status}>{b.status}</span></td>
                <td>{fmt(b.total)}</td>
                <td>
                  <div className="row" style={{ gap: 6 }}>
                    {b.status === 'confirmed' && <button className="btn sm green" onClick={() => act(b, 'checkin')}>Check-in</button>}
                    {b.status === 'checked_in' && <button className="btn sm primary" onClick={() => act(b, 'checkout', { method: 'cash' })}>Check-out</button>}
                    {(b.status === 'confirmed' || b.status === 'checked_in') && <button className="btn sm red" onClick={() => act(b, 'cancel')}>Cancel</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="modal-backdrop" onClick={() => setShow(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={create}>
            <h3>New booking</h3>
            <label>Guest</label>
            <select value={form.guest_id} onChange={(e) => setForm({ ...form, guest_id: Number(e.target.value) })} required>
              <option value="">Select guest…</option>
              {guests.map((g) => <option key={g.id} value={g.id}>{g.name} — {g.phone}</option>)}
            </select>
            <a href="#/guests" style={{ fontSize: 12, color: 'var(--primary)' }}>➕ or add a guest first</a>
            <label style={{ marginTop: 10 }}>Room (available only)</label>
            <select value={form.room_id} onChange={(e) => setForm({ ...form, room_id: Number(e.target.value) })} required>
              <option value="">Select room…</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.number} — {r.type_name} ₹{r.type_price}</option>)}
            </select>
            <div className="row" style={{ marginTop: 10 }}>
              <div><label>Check-in</label><input type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} required /></div>
              <div><label>Check-out</label><input type="date" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} required /></div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <div><label>Adults</label><input type="number" min="1" value={form.adults} onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })} /></div>
              <div><label>Children</label><input type="number" min="0" value={form.children} onChange={(e) => setForm({ ...form, children: Number(e.target.value) })} /></div>
            </div>
            <div className="modal-actions"><button className="btn primary">Create booking</button><button type="button" className="btn" onClick={() => setShow(false)}>Cancel</button></div>
          </form>
        </div>
      )}

      {receipt && <ReceiptModal bill={{ id: receipt }} onClose={() => setReceipt(null)} isMinimal />}
    </div>
  );
}