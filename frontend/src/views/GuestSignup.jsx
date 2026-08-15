import React, { useState } from 'react';
import { post } from '../api.js';

export default function GuestSignup({ onLogin }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setBusy(true);
    setError('');
    try {
      const r = await post('/guest/signup', { name: form.name, email: form.email, phone: form.phone, password: form.password }, true);
      localStorage.setItem('arynox_guest_token', r.token);
      localStorage.setItem('arynox_guest_user', JSON.stringify(r.user));
      onLogin(r.user);
      location.hash = '#/';
    } catch (err) { setError(err.message); }
    setBusy(false);
  }

  return (
    <section className="public-section" style={{ maxWidth: 440, margin: '30px auto' }}>
      <h2 style={{ textAlign: 'center' }}>Create guest account</h2>
      <p className="sub" style={{ textAlign: 'center' }}>Book rooms and manage your stays online</p>
      <form className="public-form" onSubmit={submit}>
        {error && <div className="msg err">{error}</div>}
        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div><label>Full name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><label>Email *</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label>Password * (min 6)</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
          <div><label>Confirm password *</label><input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required /></div>
        </div>
        <button className="btn primary" style={{ width: '100%', marginTop: 16 }} disabled={busy}>{busy ? 'Creating…' : 'Sign up'}</button>
        <p className="sub" style={{ textAlign: 'center', marginTop: 12, fontSize: 13 }}>Already have an account? <a href="#/guest/login" style={{ color: 'var(--primary)' }}>Sign in</a></p>
      </form>
    </section>
  );
}