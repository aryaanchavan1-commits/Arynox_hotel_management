import React, { useState } from 'react';
import { post } from '../api.js';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const r = await post('/auth/login', { username, password });
      localStorage.setItem('arynox_token', r.token);
      localStorage.setItem('arynox_user', JSON.stringify(r.user));
      onLogin(r.user);
    } catch (e2) {
      setErr(e2.message);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h2>🏨 Arynox_Hotel_ERP</h2>
        <p style={{ color: 'var(--muted)', margin: '4px 0 18px' }}>Hotel · Restaurant · POS · AI</p>
        {err && <div className="msg err">{err}</div>}
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
        <label style={{ marginTop: 12 }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn primary" style={{ width: '100%', marginTop: 18, padding: 11 }}>Sign in</button>
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 12 }}>Default: admin / admin123</p>
      </form>
    </div>
  );
}