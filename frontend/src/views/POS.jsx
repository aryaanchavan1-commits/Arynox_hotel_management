import React, { useEffect, useState } from 'react';
import { get, post } from '../api.js';
import ReceiptModal from '../components/ReceiptModal.jsx';

export default function POS() {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [method, setMethod] = useState('cash');
  const [receiptId, setReceiptId] = useState(null);
  const [msg, setMsg] = useState('');
  const [taxRate, setTaxRate] = useState(5);

  useEffect(() => {
    get('/menu').then(setMenu).catch(() => {});
    get('/settings').then((s) => s.tax_rate && setTaxRate(Number(s.tax_rate))).catch(() => {});
  }, []);

  const add = (mi) => {
    setCart((c) => {
      const f = c.find((x) => x.name === mi.name);
      return f ? c.map((x) => (x.name === mi.name ? { ...x, qty: x.qty + 1 } : x)) : [...c, { name: mi.name, price: mi.price, qty: 1 }];
    });
  };
  const sub = (name) => setCart((c) => c.map((x) => (x.name === name ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0));
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const taxAmt = subtotal * (taxRate / 100);
  const grand = subtotal + taxAmt;

  const charge = async () => {
    if (!cart.length) return;
    try {
      const r = await post('/bills', { items: cart, method });
      setReceiptId(r.billId);
      setCart([]);
      setMsg('');
    } catch (e) {
      setMsg(e.message);
    }
  };

  const cats = [...new Set(menu.map((m) => m.category))];

  return (
    <div>
      <div className="between">
        <h1>💳 POS / Billing</h1>
        <span className="msg ok" style={{ margin: 0, display: msg ? 'block' : 'none' }}>{msg}</span>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <h3>Products</h3>
          {cats.map((c) => (
            <div key={c} style={{ marginTop: 10 }}>
              <b style={{ color: 'var(--muted)', textTransform: 'uppercase', fontSize: 12 }}>{c}</b>
              <div className="menu-grid" style={{ marginTop: 6 }}>
                {menu.filter((m) => m.category === c && m.available).map((m) => (
                  <div key={m.id} className="menu-item" onClick={() => add(m)}>
                    <div>{m.name}</div>
                    <div className="price">₹{m.price}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="card cart">
          <h3>🛒 Cart</h3>
          {!cart.length ? <div className="empty">Tap products to add to cart</div> : (
            <>
              {cart.map((i) => (
                <div key={i.name} className="cart-item">
                  <span>{i.name} ×{i.qty} <button className="btn sm ghost" onClick={() => sub(i.name)}>−</button></span>
                  <span>₹{(i.price * i.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="line2" style={{ borderTop: '1px dashed var(--line)', margin: '10px 0' }} />
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b>Subtotal</b><b>₹{subtotal.toFixed(2)}</b>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', color: 'var(--muted)' }}>
                <span>Tax ({taxRate}%)</span><span>₹{taxAmt.toFixed(2)}</span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
                <span>TOTAL</span><span>₹{grand.toFixed(2)}</span>
              </div>
              <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ margin: '10px 0' }}>
                <option value="cash">💵 Cash</option>
                <option value="card">💳 Card</option>
                <option value="upi">📱 UPI</option>
              </select>
              <button className="btn green" style={{ width: '100%', padding: 12 }} onClick={charge}>Charge ₹{grand.toFixed(2)}</button>
            </>
          )}
        </div>
      </div>
      {receiptId && <ReceiptModal bill={{ id: receiptId }} onClose={() => setReceiptId(null)} />}
    </div>
  );
}