import React, { useEffect, useState } from 'react';
import { get, post, put } from '../api.js';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [types, setTypes] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [showType, setShowType] = useState(false);
  const [form, setForm] = useState({ number: '', room_type_id: 1, floor: 1 });
  const [typeForm, setTypeForm] = useState({ name: '', price: '', capacity: 2, description: '', amenities: '' });

  const load = () => { get('/rooms').then(setRooms).catch(() => {}); get('/room-types').then(setTypes).catch(() => {}); };
  useEffect(load, []);

  const addRoom = async (e) => {
    e.preventDefault();
    await post('/rooms', form);
    setShowNew(false); load();
  };
  const addType = async (e) => {
    e.preventDefault();
    await post('/room-types', typeForm);
    setShowType(false); load();
  };
  const setStatus = async (r, status) => { await put(`/rooms/${r.id}`, { status }); load(); };
  const setHk = async (r, hk) => { await put(`/rooms/${r.id}`, { hk_status: hk }); load(); };

  return (
    <div>
      <div className="between">
        <h1>🛏️ Rooms</h1>
        <div className="row">
          <button className="btn" onClick={() => setShowType(true)}>🏷️ Room Types</button>
          <button className="btn primary" onClick={() => setShowNew(true)}>➕ Add Room</button>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="room-grid">
          {rooms.map((r) => (
            <div key={r.id} className={'room-card ' + r.status}>
              <div className="between"><span className="num">{r.number}</span><span className={'badge ' + r.status}>{r.status}</span></div>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>{r.type_name} · Floor {r.floor}</div>
              <div style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{r.type_price}</div>
              <div style={{ marginTop: 6 }}>
                <span className={`badge ${r.hk_status === 'clean' ? 'available' : r.hk_status === 'dirty' ? 'occupied' : 'open'}`}>🧹 {r.hk_status}</span>
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                {r.status !== 'occupied' && <button className="btn sm green" onClick={() => setStatus(r, 'occupied')}>Occupy</button>}
                {r.status !== 'available' && <button className="btn sm" onClick={() => setStatus(r, 'available')}>Release</button>}
                <button className="btn sm red" onClick={() => setStatus(r, r.status === 'maintenance' ? 'available' : 'maintenance')}>Maint.</button>
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                {r.hk_status !== 'clean' && <button className="btn sm" onClick={() => setHk(r, 'clean')}>Clean</button>}
                {r.hk_status !== 'dirty' && <button className="btn sm" onClick={() => setHk(r, 'dirty')}>Dirty</button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNew && (
        <div className="modal-backdrop" onClick={() => setShowNew(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={addRoom}>
            <h3>Add room</h3>
            <label>Room number</label>
            <input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required />
            <label style={{ marginTop: 10 }}>Type</label>
            <select value={form.room_type_id} onChange={(e) => setForm({ ...form, room_type_id: Number(e.target.value) })}>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name} - ₹{t.price}</option>)}
            </select>
            <label style={{ marginTop: 10 }}>Floor</label>
            <input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })} />
            <div className="modal-actions"><button className="btn primary">Save</button><button type="button" className="btn" onClick={() => setShowNew(false)}>Cancel</button></div>
          </form>
        </div>
      )}

      {showType && (
        <div className="modal-backdrop" onClick={() => setShowType(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Room types</h3>
            <table style={{ margin: '10px 0' }}>
              <thead><tr><th>Name</th><th>Price</th><th>Capacity</th><th>Amenities</th></tr></thead>
              <tbody>
                {types.map((t) => <tr key={t.id}><td>{t.name}</td><td>₹{t.price}</td><td>{t.capacity}</td><td style={{ fontSize: 12, color: 'var(--muted)' }}>{t.amenities}</td></tr>)}
              </tbody>
            </table>
            <form onSubmit={addType} className="row" style={{ flexWrap: 'wrap' }}>
              <input placeholder="Name" value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} required style={{ width: 140 }} />
              <input placeholder="Price" type="number" value={typeForm.price} onChange={(e) => setTypeForm({ ...typeForm, price: Number(e.target.value) })} required style={{ width: 90 }} />
              <input placeholder="Cap" type="number" value={typeForm.capacity} onChange={(e) => setTypeForm({ ...typeForm, capacity: Number(e.target.value) })} style={{ width: 70 }} />
              <input placeholder="Amenities (comma sep)" value={typeForm.amenities} onChange={(e) => setTypeForm({ ...typeForm, amenities: e.target.value })} style={{ minWidth: 180 }} />
              <button className="btn primary">Add</button>
            </form>
            <button className="btn ghost" onClick={() => setShowType(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}