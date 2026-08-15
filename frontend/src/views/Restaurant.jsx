import React, { useEffect, useState } from 'react';
import { get, post, put } from '../api.js';
import ReceiptModal from '../components/ReceiptModal.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Restaurant() {
  const toast = useToast();
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [sel, setSel] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [newTableId, setNewTableId] = useState('');
  const [taxRate, setTaxRate] = useState(5);
  const [error, setError] = useState('');

  const load = () => {
    get('/menu').then(setMenu).catch(() => {});
    get('/orders').then(setOrders).catch(() => {});
    get('/tables').then(setTables).catch(() => {});
    get('/settings').then((s) => s.tax_rate && setTaxRate(Number(s.tax_rate))).catch(() => {});
  };
  useEffect(load, []);

  const open = orders.find((o) => o.id === sel);

  const newOrder = async (table) => {
    setError('');
    try {
      const t = table || tables.find((x) => x.status === 'free');
      if (!t) return setError('No free table');
      const r = await post('/orders', { table_no: t.number, table_id: t.id });
      await put(`/tables/${t.id}`, { status: 'occupied' });
      setSel(r.id);
      toast(`Order #${r.id} opened at ${t.number}`);
      load();
    } catch (e) { setError(e.message); }
  };
  const addItem = async (mi) => {
    if (!sel) return;
    await post(`/orders/${sel}/items`, { items: [{ name: mi.name, price: mi.price, qty: 1 }] });
    load();
  };
  const sendKot = async () => {
    if (!sel) return;
    const draft = (open.items || []).filter((i) => i.kot_status === 'draft');
    if (draft.length === 0) return setError('Nothing to send to kitchen');
    await post(`/orders/${sel}/kot`, { ids: draft.map((i) => i.id) });
    toast('KOT sent to kitchen');
    load();
  };
  const pay = async (o) => {
    const r = await post(`/orders/${o.id}/pay`, { method: 'cash' });
    setReceipt(r.billId);
    toast('Bill paid');
    load();
  };

  const cats = [...new Set(menu.map((m) => m.category))];
  const freeTables = tables.filter((t) => t.status === 'free');
  const busyTables = tables.filter((t) => t.status !== 'free');

  return (
    <div>
      <div className="between">
        <h1>🍽️ Restaurant</h1>
        <div className="row">
          <button className="btn primary" onClick={() => newOrder()} disabled={freeTables.length === 0}>➕ New Order</button>
        </div>
      </div>
      {error && <div className="msg err" style={{ marginTop: 12 }}>{error}</div>}

      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ marginBottom: 10 }}>Tables</h3>
        <div className="row">
          {tables.map((t) => (
            <div key={t.id} className="menu-item" style={{ cursor: t.status === 'free' ? 'pointer' : 'not-allowed', opacity: t.status === 'free' ? 1 : 0.55 }}
              onClick={() => t.status === 'free' && newOrder(t)}>
              <div><b>{t.number}</b></div>
              <div className="price" style={{ fontSize: 12, color: 'var(--muted)' }}>{t.status}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <h3>Menu</h3>
          {cats.map((c) => (
            <div key={c} style={{ marginTop: 10 }}>
              <b style={{ color: 'var(--muted)', textTransform: 'uppercase', fontSize: 12 }}>{c}</b>
              <div className="menu-grid" style={{ marginTop: 6 }}>
                {menu.filter((m) => m.category === c && m.available).map((m) => (
                  <div key={m.id} className="menu-item" onClick={() => addItem(m)}>
                    <div>{m.name}</div>
                    <div className="price">₹{m.price}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="card cart">
          <h3>🧾 Current order {open && <span className="badge open">#{open.id} · {open.table_no}</span>}</h3>
          {!sel ? (
            <div className="empty">Create an order first, then click menu items to add.</div>
          ) : (
            <>
              <div>
                {(open.items || []).map((it, i) => (
                  <div key={i} className="cart-item">
                    <span>{it.item_name} ×{it.qty}</span>
                    <span>₹{(it.price * it.qty).toFixed(2)} <span className={`badge ${it.kot_status === 'draft' ? 'occupied' : it.kot_status === 'new' ? 'open' : 'available'}`} style={{ fontSize: 9 }}>{it.kot_status}</span></span>
                  </div>
                ))}
              </div>
              <div className="row2" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, margin: '10px 0' }}>
                <span>Total (incl. {taxRate}% tax)</span><span>₹{(open.total * (1 + taxRate / 100)).toFixed(2)}</span>
              </div>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <button className="btn primary" style={{ flex: 1 }} onClick={sendKot} disabled={!(open.items || []).some((i) => i.kot_status === 'draft')}>👨‍🍳 Send to Kitchen</button>
                <button className="btn green" style={{ flex: 1 }} onClick={() => pay(open)} disabled={open.items.length === 0}>💳 Pay & Bill</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Orders</h3>
        <table>
          <thead><tr><th>ID</th><th>Table</th><th>Items</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} onClick={() => setSel(o.id)} style={{ cursor: 'pointer' }}>
                <td>#{o.id}</td><td>{o.table_no}</td>
                <td>{(o.items || []).map((i) => `${i.item_name}×${i.qty}`).join(', ')}</td>
                <td>₹{o.total.toFixed(2)}</td>
                <td><span className={'badge ' + o.status}>{o.status}</span></td>
                <td>{o.status === 'paid' ? <span className="badge available">Paid</span> : <button className="btn sm" onClick={(e) => { e.stopPropagation(); setSel(o.id); }}>Open</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {receipt && <ReceiptModal bill={{ id: receipt }} onClose={() => setReceipt(null)} />}
    </div>
  );
}