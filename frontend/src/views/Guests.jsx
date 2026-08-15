import React, { useEffect, useState } from 'react';
import { get, post } from '../api.js';

export default function Guests() {
  const [guests, setGuests] = useState([]);
  const [q, setQ] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', id_type: 'passport', id_number: '', address: '' });

  const load = () => get(q ? `/guests/search?q=${encodeURIComponent(q)}` : '/guests').then(setGuests).catch(() => {});
  useEffect(load, [q]);

  const add = async (e) => {
    e.preventDefault();
    await post('/guests', form);
    setShow(false);
    setForm({ name: '', phone: '', email: '', id_type: 'passport', id_number: '', address: '' });
    load();
  };

  return (
    <div>
      <div className="between">
        <h1>👥 Guests</h1>
        <div className="row">
          <input placeholder="Search name or phone…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} />
          <button className="btn primary" onClick={() => setShow(true)}>➕ Add Guest</button>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Phone</th><th>Email</th><th>ID</th><th>Address</th></tr></thead>
          <tbody>
            {guests.map((g) => (
              <tr key={g.id}>
                <td>#{g.id}</td><td><b>{g.name}</b></td><td>{g.phone}</td><td>{g.email}</td>
                <td>{g.id_type}: {g.id_number}</td><td>{g.address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="modal-backdrop" onClick={() => setShow(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={add}>
            <h3>Add guest</h3>
            <label>Full name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div className="row" style={{ marginTop: 10 }}>
              <div style={{ flex: 1 }}><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div style={{ flex: 1 }}><label>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <div><label>ID type</label>
                <select value={form.id_type} onChange={(e) => setForm({ ...form, id_type: e.target.value })}>
                  <option>passport</option><option>aadhaar</option><option>driving_license</option><option>pan</option>
                </select>
              </div>
              <div style={{ flex: 1 }}><label>ID number</label><input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} /></div>
            </div>
            <label style={{ marginTop: 10 }}>Address</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <div className="modal-actions"><button className="btn primary">Save guest</button><button type="button" className="btn" onClick={() => setShow(false)}>Cancel</button></div>
          </form>
        </div>
      )}
    </div>
  );
}