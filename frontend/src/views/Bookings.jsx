import React, { useEffect, useState } from 'react';
import { get, post, put } from '../api.js';
import ReceiptModal from '../components/ReceiptModal.jsx';
import { useToast } from '../components/Toast.jsx';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function Bookings() {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [guests, setGuests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [show, setShow] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ guest_id: '', room_id: '', check_in: '', check_out: '', adults: 1, children: 0, meal_plan: 'room_only', extras: [] });

  const load = () => {
    get('/bookings').then(setBookings).catch(() => {});
    get('/guests').then((g) => setGuests(g.slice(0, 50))).catch(() => {});
    get('/rooms').then((r) => setRooms(r.filter((x) => x.status === 'available'))).catch(() => {});
  };
  useEffect(load, []);

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // prefill from Availability view
  useEffect(() => {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const type = params.get('type');
    const room = params.get('room');
    if (type || room) {
      get('/rooms').then((r) => {
        const free = room
          ? r.filter((x) => String(x.id) === room)
          : r.filter((x) => x.status === 'available' && String(x.room_type_id) === type);
        if (free[0]) setForm((f) => ({ ...f, room_id: free[0].id, check_in: params.get('ci') || today, check_out: params.get('co') || tomorrow }));
      }).catch(() => {});
      location.hash = '#/bookings';
    }
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await post('/bookings', { ...form, status: 'confirmed' });
      setShow(false);
      toast('Booking created');
      load();
    } catch (err) { setError(err.message); }
  };

  const act = async (b, action, extra = {}) => {
    setError('');
    try {
      const r = await post(`/bookings/${b.id}/${action}`, extra);
      if (r.billId) setReceipt(r.billId);
      toast(`Booking ${action.replace('_', ' ')}`);
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <div className="between">
        <h1>📅 Bookings</h1>
        <div className="row">
          <button className="btn primary" onClick={() => { setForm({ guest_id: '', room_id: '', check_in: today, check_out: tomorrow, adults: 1, children: 0, meal_plan: 'room_only', extras: [] }); setShow(true); }}>➕ New Booking</button>
        </div>
      </div>
      {error && <div className="msg err" style={{ marginTop: 12 }}>{error}</div>}
      <div className="card" style={{ marginTop: 16 }}>
        <table>
          <thead><tr><th>Ref</th><th>Guest</th><th>Room</th><th>Dates</th><th>Plan</th><th>Source</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td><b style={{ color: 'var(--primary)' }}>{b.reference || '#' + b.id}</b></td>
                <td>{b.guest_name}<br /><small style={{ color: 'var(--muted)' }}>{b.guest_phone}</small></td>
                <td>{b.room_number} <small style={{ color: 'var(--muted)' }}>({b.room_type})</small></td>
                <td>{b.check_in} → {b.check_out}</td>
                <td><small>{b.meal_plan?.replace('_', ' ')}</small></td>
                <td><span className={`badge ${b.source === 'online' ? 'open' : 'available'}`}>{b.source}</span></td>
                <td><span className={'badge ' + b.status}>{b.status}</span></td>
                <td>{fmt(b.total)}</td>
                <td>
                  <div className="row" style={{ gap: 6 }}>
                    {b.status === 'pending' && <button className="btn sm primary" onClick={() => act(b, 'confirm')}>Confirm</button>}
                    {b.status === 'confirmed' && <button className="btn sm green" onClick={() => act(b, 'checkin')}>Check-in</button>}
                    {b.status === 'checked_in' && <button className="btn sm primary" onClick={() => setCheckout(b)}>Check-out</button>}
                    {['pending', 'confirmed'].includes(b.status) && <button className="btn sm red" onClick={() => act(b, 'cancel')}>Cancel</button>}
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
            <div style={{ marginTop: 10 }}>
              <label>Meal plan</label>
              <select value={form.meal_plan} onChange={(e) => setForm({ ...form, meal_plan: e.target.value })}>
                <option value="room_only">Room only</option>
                <option value="breakfast">Breakfast</option>
                <option value="half_board">Half board</option>
                <option value="full_board">Full board</option>
              </select>
            </div>
            <div style={{ marginTop: 10 }}>
              <label>Extras (folio charges)</label>
              <div className="row">
                <input type="text" placeholder="e.g. Mini bar, Spa" id="extra-name" style={{ maxWidth: 180 }} />
                <input type="number" placeholder="₹" id="extra-price" style={{ maxWidth: 90 }} />
                <button type="button" className="btn sm" onClick={() => {
                  const n = document.getElementById('extra-name').value;
                  const p = Number(document.getElementById('extra-price').value || 0);
                  if (!n) return;
                  setForm({ ...form, extras: [...form.extras, { name: n, price: p, qty: 1 }] });
                  document.getElementById('extra-name').value = '';
                  document.getElementById('extra-price').value = '';
                }}>Add</button>
              </div>
              {form.extras.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  {form.extras.map((x, i) => (
                    <div key={i} className="between" style={{ borderBottom: '1px dashed var(--line)', padding: '4px 0' }}>
                      <span>{x.name}</span>
                      <span>₹{x.price}
                        <button type="button" className="btn ghost sm" onClick={() => setForm({ ...form, extras: form.extras.filter((_, j) => j !== i) })}>✕</button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions"><button className="btn primary">Create booking</button><button type="button" className="btn" onClick={() => setShow(false)}>Cancel</button></div>
          </form>
        </div>
      )}

      {checkout && (
        <div className="modal-backdrop" onClick={() => setCheckout(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Check-out · {checkout.guest_name}</h3>
            <p style={{ margin: '8px 0', color: 'var(--muted)' }}>Room {checkout.room_number} · {fmt(checkout.total)} base</p>
            <label>Extra charges</label>
            <input type="number" id="co-extra" defaultValue="0" min="0" />
            <label style={{ marginTop: 10 }}>Payment method</label>
            <select id="co-method">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
            </select>
            <div className="modal-actions">
              <button className="btn green" onClick={async () => {
                const extra = Number(document.getElementById('co-extra').value || 0);
                const method = document.getElementById('co-method').value;
                await act(checkout, 'checkout', { method, extra });
                setCheckout(null);
              }}>Confirm &amp; bill</button>
              <button className="btn" onClick={() => setCheckout(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {receipt && <ReceiptModal bill={{ id: receipt }} onClose={() => setReceipt(null)} isMinimal />}
    </div>
  );
}