import React, { useState } from 'react';
import { post } from '../api.js';

export default function GuestLogin({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await post('/guest/login', form, true);
      localStorage.setItem('arynox_guest_token', r.token);
      localStorage.setItem('arynox_guest_user', JSON.stringify(r.user));
      onLogin(r.user);
      location.hash = '#/guest/my-bookings';
    } catch (err) { setError(err.message); }
    setBusy(false);
  }

  return (
    <section className="public-section" style={{ maxWidth: 440, margin: '30px auto' }}>
      <h2 style={{ textAlign: 'center' }}>Guest sign in</h2>
      <p className="sub" style={{ textAlign: 'center' }}>Manage your bookings</p>
      <form className="public-form" onSubmit={submit}>
        {error && <div className="msg err">{error}</div>}
        <div style={{ marginBottom: 12 }}><label>Email *</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
        <div><label>Password *</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
        <button className="btn primary" style={{ width: '100%', marginTop: 16 }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="sub" style={{ textAlign: 'center', marginTop: 12, fontSize: 13 }}>New here? <a href="#/guest/signup" style={{ color: 'var(--primary)' }}>Create an account</a></p>
      </form>
    </section>
  );
}