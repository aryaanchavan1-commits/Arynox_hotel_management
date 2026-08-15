import React, { useEffect, useState } from 'react';
import { get, post, put } from '../api.js';
import { useToast } from '../components/Toast.jsx';

const ROLES = ['admin', 'manager', 'reception', 'kitchen', 'restaurant', 'housekeeping'];

export default function Users({ user }) {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ username: '', name: '', role: 'reception' });
  const [newPw, setNewPw] = useState('');

  const isAdmin = user?.role === 'admin';

  async function load() {
    setLoading(true);
    try { setUsers(await get('/users')); } catch (e) { setError(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setMsg('');
    try {
      if (edit) {
        await put(`/users/${edit.id}`, form);
        setEdit(null);
      } else {
        const pw = newPw || 'staff123';
        await post('/users', { ...form, password: pw });
      }
      setMsg('Saved');
      toast(edit ? 'User updated' : 'User created');
      load();
    } catch (e2) { setError(e2.message); }
  }

  async function resetPw(u) {
    const pw = prompt(`New password for ${u.username}:`, '');
    if (!pw) return;
    try { await post(`/users/${u.id}/password`, { password: pw }); setMsg('Password reset'); toast('Password reset'); }
    catch (e) { setError(e.message); }
  }

  return (
    <div className="page">
      <div className="page-head"><h1>Users &amp; Roles</h1></div>
      {msg && <div className="msg ok" style={{ marginBottom: 12 }}>{msg}</div>}
      {error && <div className="msg err" style={{ marginBottom: 12 }}>{error}</div>}
      {!isAdmin && <div className="msg warn" style={{ marginBottom: 12 }}>Managers can view users. Only admins can add or edit.</div>}

      {(isAdmin) && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>{edit ? `Edit ${edit.username}` : 'Add staff user'}</h3>
          <form onSubmit={save} className="form-grid">
            <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            <input placeholder="Display name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {!edit && <input placeholder="Initial password (default staff123)" value={newPw} onChange={(e) => setNewPw(e.target.value)} />}
            <div className="form-actions">
              <button className="btn primary" type="submit">{edit ? 'Save' : 'Add user'}</button>
              {edit && <button className="btn" type="button" onClick={() => { setEdit(null); setForm({ username: '', name: '', role: 'reception' }); }}>Cancel</button>}
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead><tr><th>ID</th><th>Username</th><th>Name</th><th>Role</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>{u.name}</td>
                <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                <td>{Number(u.enabled) === 1 ? 'Active' : 'Disabled'}</td>
                {isAdmin && (
                  <td>
                    <button className="btn sm" onClick={() => { setEdit(u); setForm({ username: u.username, name: u.name, role: u.role }); }}>Edit</button>{' '}
                    <button className="btn sm" onClick={() => resetPw(u)}>Reset pw</button>{' '}
                    <button className="btn sm" onClick={async () => {
                      try {
                        await put(`/users/${u.id}`, { username: u.username, name: u.name, role: u.role, enabled: Number(u.enabled) === 1 ? 0 : 1 });
                        setMsg(Number(u.enabled) === 1 ? 'User disabled' : 'User enabled');
                        load();
                      } catch (e) { setError(e.message); }
                    }}>{Number(u.enabled) === 1 ? 'Disable' : 'Enable'}</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}