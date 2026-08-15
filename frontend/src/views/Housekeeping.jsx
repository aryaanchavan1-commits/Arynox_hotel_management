import React, { useEffect, useState } from 'react';
import { get, post, put, del } from '../api.js';

export default function Housekeeping() {
  const [tasks, setTasks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ room_id: '', task: 'Full clean', assignee: '', scheduled_at: '' });

  async function load() {
    try {
      const [t, r] = await Promise.all([get('/housekeeping'), get('/rooms')]);
      setTasks(t); setRooms(r);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    if (!form.room_id) return setError('Select a room');
    try {
      await post('/housekeeping', form);
      setForm({ room_id: '', task: 'Full clean', assignee: '', scheduled_at: '' });
      load();
    } catch (e2) { setError(e2.message); }
  }

  async function update(task, status) {
    try { await put(`/housekeeping/${task.id}`, { status }); load(); } catch (e) { setError(e.message); }
  }

  const filtered = rooms.filter((r) => r.hk_status !== 'clean' || tasks.some((t) => t.room_id === r.id && t.status !== 'done'));

  return (
    <div className="page">
      <div className="page-head"><h1>🧹 Housekeeping</h1></div>
      {error && <div className="msg err">{error}</div>}
      <div className="card">
        <h3>Assign task</h3>
        <form className="row" onSubmit={add}>
          <select value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} style={{ maxWidth: 160 }}>
            <option value="">Room…</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.number} ({r.hk_status})</option>)}
          </select>
          <select value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} style={{ maxWidth: 160 }}>
            <option>Full clean</option>
            <option>Bedding change</option>
            <option>Deep clean</option>
            <option>Restock amenities</option>
            <option>Repair check</option>
          </select>
          <input placeholder="Assignee" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} style={{ maxWidth: 140 }} />
          <input type="date" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} style={{ maxWidth: 150 }} />
          <button className="btn primary">Add task</button>
        </form>
      </div>

      {filtered.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Rooms needing attention</h3>
          <div className="room-grid">
            {filtered.map((r) => (
              <div key={r.id} className={`room-card ${r.hk_status === 'dirty' ? 'occupied' : r.hk_status === 'in-progress' ? 'open' : ''}`}>
                <div className="num">{r.number}</div>
                <div>{r.type_name}</div>
                <div><span className={`badge ${r.hk_status === 'clean' ? 'available' : r.hk_status === 'dirty' ? 'occupied' : 'open'}`}>{r.hk_status}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Task list</h3>
        <table className="table">
          <thead><tr><th>ID</th><th>Room</th><th>Task</th><th>Assignee</th><th>Scheduled</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.room_number}</td>
                <td>{t.task}</td>
                <td>{t.assignee || '—'}</td>
                <td>{t.scheduled_at || '—'}</td>
                <td><span className={`badge ${t.status === 'done' ? 'available' : t.status === 'pending' ? 'open' : 'occupied'}`}>{t.status}</span></td>
                <td>
                  {t.status !== 'done' && <button className="btn sm green" onClick={() => update(t, 'done')}>Done</button>}{' '}
                  {t.status === 'pending' && <button className="btn sm primary" onClick={() => update(t, 'in_progress')}>Start</button>}{' '}
                  <button className="btn sm red" onClick={async () => { try { await del(`/housekeeping/${t.id}`); load(); } catch (e) { setError(e.message); } }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}