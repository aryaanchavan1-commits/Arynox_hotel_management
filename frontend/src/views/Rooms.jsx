import React, { useEffect, useState } from 'react';
import { get, post, put } from '../api.js';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

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

  const counts = {
    total: rooms.length,
    occupied: rooms.filter((r) => r.status === 'occupied').length,
    available: rooms.filter((r) => r.status === 'available').length,
    maintenance: rooms.filter((r) => r.status === 'maintenance').length,
    dirty: rooms.filter((r) => r.hk_status === 'dirty').length,
  };

  const hkLabel = { clean: '🧹 Clean', dirty: '🫧 Dirty', inspection: '🔍 Inspect' };

  return (
    <div>
      <div className="between">
        <div>
          <h1>🛏️ Rooms</h1>
          <p className="sub">Live status of every room across the property</p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setShowType(true)}>🏷️ Room Types</button>
          <button className="btn primary" onClick={() => setShowNew(true)}>➕ Add Room</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-top"><div className="kpi-label">Total rooms</div><div className="kpi-icon">🏨</div></div><div className="kpi-value">{counts.total}</div></div>
        <div className="kpi-card ok"><div className="kpi-top"><div className="kpi-label">Available</div><div className="kpi-icon">✅</div></div><div className="kpi-value">{counts.available}</div></div>
        <div className="kpi-card warn"><div className="kpi-top"><div className="kpi-label">Occupied</div><div className="kpi-icon">👤</div></div><div className="kpi-value">{counts.occupied}</div></div>
        <div className="kpi-card"><div className="kpi-top"><div className="kpi-label">Maintenance</div><div className="kpi-icon">🔧</div></div><div className="kpi-value">{counts.maintenance}</div></div>
        <div className="kpi-card"><div className="kpi-top"><div className="kpi-label">Housekeeping dirty</div><div className="kpi-icon">🫧</div></div><div className="kpi-value">{counts.dirty}</div></div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="room-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
          {rooms.map((r) => (
            <div key={r.id} className={'room-card ' + r.status}>
              <div className="between">
                <span className="num" style={{ fontSize: 20 }}>{r.number}</span>
                <span className={'badge ' + r.status}>{r.status === 'available' ? '🟢 Available' : r.status === 'occupied' ? '🟠 Occupied' : '🔴 Maint.'}</span>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{r.type_name} · Floor {r.floor}</div>
              <div style={{ fontWeight: 800, color: 'var(--primary)', marginTop: 6, fontSize: 15 }}>{fmt(r.type_price)} <small style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 11 }}>/night</small></div>
              <div style={{ marginTop: 8 }}>
                <span className={`badge ${r.hk_status === 'clean' ? 'available' : r.hk_status === 'dirty' ? 'occupied' : 'open'}`}>{hkLabel[r.hk_status] || r.hk_status}</span>
              </div>
              <div className="row" style={{ marginTop: 10, flexWrap: 'wrap', gap: 6 }}>
                {r.status !== 'occupied' && <button className="btn sm green" onClick={() => setStatus(r, 'occupied')}>Occupy</button>}
                {r.status !== 'available' && <button className="btn sm" onClick={() => setStatus(r, 'available')}>Release</button>}
                <button className="btn sm red" onClick={() => setStatus(r, r.status === 'maintenance' ? 'available' : 'maintenance')}>{r.status === 'maintenance' ? 'Repaired' : 'Maint.'}</button>
              </div>
              <div className="row" style={{ marginTop: 6, gap: 6 }}>
                {r.hk_status !== 'clean' && <button className="btn sm" onClick={() => setHk(r, 'clean')}>🧹 Clean</button>}
                {r.hk_status !== 'dirty' && <button className="btn sm" onClick={() => setHk(r, 'dirty')}>🫧 Dirty</button>}
              </div>
            </div>
          ))}
        </div>
        {!rooms.length && <div className="empty">No rooms yet — add your first room.</div>}
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
                {types.map((t) => <tr key={t.id}><td>{t.name}</td><td>{fmt(t.price)}</td><td>{t.capacity}</td><td style={{ fontSize: 12, color: 'var(--muted)' }}>{t.amenities}</td></tr>)}
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
