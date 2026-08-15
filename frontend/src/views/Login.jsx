import React, { useState } from 'react';
import { post } from '../api.js';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
        <img src="/logo.svg" alt="Arynox_Hotel_ERP" width="96" style={{ margin: '0 auto 8px', display: 'block' }} />
        <h2>Arynox_Hotel_ERP</h2>
        <p className="login-sub">Staff sign in</p>
        <form onSubmit={submit}>
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <label className="login-check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Stay signed in
          </label>
          {error && <div className="msg err" style={{ marginTop: 10 }}>{error}</div>}
          <button className="btn primary" style={{ width: '100%', marginTop: 14 }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <a className="login-alt" href="#/">← Back to website</a>
      </div>
    </div>
  );
}