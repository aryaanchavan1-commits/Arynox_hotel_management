import React, { useEffect, useState } from 'react';
import { get, post } from '../api.js';
import ReceiptModal from '../components/ReceiptModal.jsx';

export default function Restaurant() {
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sel, setSel] = useState(null);       // selected order id
  const [receipt, setReceipt] = useState(null);
  const [newTable, setNewTable] = useState('T1');
  const [taxRate, setTaxRate] = useState(5);

  const load = () => {
    get('/menu').then(setMenu).catch(() => {});
    get('/orders').then(setOrders).catch(() => {});
    get('/settings').then((s) => s.tax_rate && setTaxRate(Number(s.tax_rate))).catch(() => {});
  };
  useEffect(load, []);

  const open = orders.find((o) => o.id === sel);

  const newOrder = async () => {
    const r = await post('/orders', { table_no: newTable });
    setSel(r.id);
    load();
  };
  const addItem = async (mi) => {
    if (!sel) return;
    await post(`/orders/${sel}/items`, { items: [{ name: mi.name, price: mi.price, qty: 1 }] });
    load();
  };
  const pay = async (o) => {
    const r = await post(`/orders/${o.id}/pay`, { method: 'cash' });
    setReceipt(r.billId);
    load();
  };

  const cats = [...new Set(menu.map((m) => m.category))];

  return (
    <div>
      <div className="between">
        <h1>🍽️ Restaurant</h1>
        <div className="row">
          <input value={newTable} onChange={(e) => setNewTable(e.target.value)} style={{ width: 80 }} />
          <button className="btn primary" onClick={newOrder}>➕ New Order</button>
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
                  <div key={i} className="cart-item"><span>{it.item_name} ×{it.qty}</span><span>₹{(it.price * it.qty).toFixed(2)}</span></div>
                ))}
              </div>
              <div className="row2" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, margin: '10px 0' }}>
                <span>Total (incl. {taxRate}% tax)</span><span>₹{(open.total * (1 + taxRate / 100)).toFixed(2)}</span>
              </div>
              <button className="btn green" style={{ width: '100%' }} onClick={() => pay(open)}>💳 Pay & Print Receipt</button>
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
                <td>{o.status === 'open' ? <button className="btn sm" onClick={(e) => { e.stopPropagation(); setSel(o.id); }}>Edit</button> : <button className="btn sm" onClick={(e) => { e.stopPropagation(); setReceipt(null); }}>—</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {receipt && <ReceiptModal bill={{ id: receipt }} onClose={() => setReceipt(null)} />}
    </div>
  );
}