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

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-avatar">🏨</div>
        <h2>{brand?.hotel_name || 'Hotel Laxmi Elite'}</h2>
        <p className="login-sub">Staff sign in</p>
        <form onSubmit={submit} autoComplete="off">
          <input type="text" placeholder="Username" value={username}
            onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="off" />
          <input type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <label className="login-check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Stay signed in
          </label>
          {error && <div className="msg err" style={{ marginTop: 10 }}>{error}</div>}
          <button className="btn primary" style={{ width: '100%', marginTop: 14 }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="login-hint">Staff accounts: admin, reception, manager, kitchen, restaurant, housekeeping &middot; password: the username + "123"</p>
        const backHref = brand?.website_url || '#/';
        <a className="login-alt" href={backHref} {...(backHref.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>← Back to website</a>
      </div>
    </div>
  );
}
