import React, { useEffect, useState } from 'react';
import { get, post } from '../api.js';

export default function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    try { setOrders(await get('/orders?scope=kitchen')); } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  async function setStatus(orderId, ids, status) {
    try {
      await post(`/orders/${orderId}/kot-status`, { ids, status });
      load();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="page">
      <div className="page-head"><h1>👨‍🍳 Kitchen Display</h1><span className="muted">Auto-refreshes</span></div>
      {error && <div className="msg err">{error}</div>}
      {orders.length === 0 && <div className="card empty">No pending KOTs. Great — everything served!</div>}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {orders.map((o) => (
          <div key={o.id} className="card">
            <div className="between">
              <h3>Order #{o.id} · Table {o.table_no}</h3>
              <span className="badge open">{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <table className="table">
              <tbody>
                {o.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.qty}× {it.item_name}</td>
                    <td style={{ textAlign: 'right' }}>
                      {it.kot_status === 'new' ? (
                        <button className="btn sm green" onClick={() => setStatus(o.id, [it.id], 'preparing')}>Start</button>
                      ) : it.kot_status === 'preparing' ? (
                        <button className="btn sm primary" onClick={() => setStatus(o.id, [it.id], 'served')}>Serve</button>
                      ) : (
                        <span className="badge open">…</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {o.items.length > 0 && o.items.some((i) => i.kot_status === 'new') && (
              <button className="btn green" style={{ marginTop: 10, width: '100%' }} onClick={() => setStatus(o.id, o.items.filter((i) => i.kot_status === 'new').map((i) => i.id), 'preparing')}>Start all</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}