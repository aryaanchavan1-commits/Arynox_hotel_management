import React, { useState, useEffect } from 'react';
import { get, post } from '../api.js';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [brand, setBrand] = useState(null);

  useEffect(() => {
    get('/public/hotels').then((d) => setBrand(d?.settings || {})).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!username || !password) return setError('Username and password are required');
    setBusy(true);
    setError('');
    try {
      const r = await post('/auth/login', { username, password });
      localStorage.setItem('arynox_token', r.token);
      localStorage.setItem('arynox_user', JSON.stringify(r.user));
      onLogin(r.user);
    } catch (err) {
      setError(err.message || 'Unable to connect to server');
    } finally {
      setBusy(false);
    }
  }

  const backHref = brand?.website_url || '#/';
  const backProps = backHref.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {};

  return (
    <div className="erp-login-wrap">
      <div className="erp-login-card">
        <img src="/logo.svg" alt="" className="erp-login-logo" />
        <h1>{brand?.hotel_name || 'Hotel Lakshmi Deluxe'}</h1>
        <p className="erp-login-sub">Arynoxtech Hotel Management ERP · Staff sign in</p>
        <form onSubmit={submit} autoComplete="off">
          <input type="text" placeholder="Username" value={username}
            onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="off" />
          <input type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <label className="login-check" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#bbbbc4', marginBottom: 12 }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 'auto' }} /> Stay signed in
          </label>
          {error && <div className="erp-login-err">{error}</div>}
          <button className="erp-login-btn" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <a className="erp-login-alt" href={backHref} {...backProps}>← Back to website</a>
      </div>
    </div>
  );
}