import React, { useEffect, useState } from 'react';
import { get, put } from '../api.js';

export default function Settings() {
  const [form, setForm] = useState({ hotel_name: 'Arynox_Hotel_ERP', hotel_address: '', hotel_phone: '', tax_rate: '5' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    get('/settings').then((s) => setForm((f) => ({ ...f, ...s }))).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await put('/settings', form);
      setMsg('✅ Settings saved — receipts, invoices and the brand now use your values.');
    } catch (err) {
      setMsg('❌ ' + err.message);
    }
  };

  return (
    <div>
      <h1>⚙️ Settings</h1>
      <div className="card" style={{ marginTop: 16, maxWidth: 560 }}>
        <h3>Brand & billing</h3>
        <p style={{ color: 'var(--muted)', margin: '4px 0 14px' }}>These appear on receipts (thermal + print) and invoices.</p>
        {msg && <div className={'msg ' + (msg.startsWith('✅') ? 'ok' : 'err')}>{msg}</div>}
        <form onSubmit={save}>
          <label>Hotel / brand name</label>
          <input value={form.hotel_name} onChange={(e) => setForm({ ...form, hotel_name: e.target.value })} required />
          <label style={{ marginTop: 12 }}>Address</label>
          <input value={form.hotel_address} onChange={(e) => setForm({ ...form, hotel_address: e.target.value })} />
          <label style={{ marginTop: 12 }}>Phone</label>
          <input value={form.hotel_phone} onChange={(e) => setForm({ ...form, hotel_phone: e.target.value })} />
          <label style={{ marginTop: 12 }}>Tax rate (%)</label>
          <input type="number" step="0.1" min="0" max="50" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} style={{ width: 140 }} />
          <div className="modal-actions">
            <button className="btn primary">💾 Save settings</button>
          </div>
        </form>
      </div>
    </div>
  );
}