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
  const [cat, setCat] = useState('all');

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
  const visible = cat === 'all' ? menu : menu.filter((m) => m.category === cat);

  return (
    <div>
      <div className="between">
        <div>
          <h1>💳 POS / Billing</h1>
          <p className="sub">Tap products, charge, print receipt — fast billing</p>
        </div>
        <span className="msg ok" style={{ margin: 0, display: msg ? 'block' : 'none' }}>{msg}</span>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" style={{ background: cat === 'all' ? 'linear-gradient(135deg, #06bdb4, #00a692)' : '#fff', color: cat === 'all' ? '#fff' : 'inherit', border: cat === 'all' ? 'none' : '1px solid #e3e3ea' }} onClick={() => setCat('all')}>🍽️ All</button>
            {cats.map((c) => (
              <button key={c} className="btn" style={{ background: cat === c ? 'linear-gradient(135deg, #06bdb4, #00a692)' : '#fff', color: cat === c ? '#fff' : 'inherit', border: cat === c ? 'none' : '1px solid #e3e3ea' }} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="menu-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {visible.filter((m) => m.available).map((m) => (
                <div key={m.id} className="menu-item" style={{ display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer', padding: 12 }} onClick={() => add(m)}>
                  {m.image ? <img src={m.image} alt={m.name} style={{ width: '100%', height: 86, objectFit: 'cover', borderRadius: 10 }} onError={(e) => (e.target.style.display = 'none')} /> : <div style={{ width: '100%', height: 86, borderRadius: 10, background: 'linear-gradient(135deg, rgba(6,189,180,.14), rgba(0,166,146,.10))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🍽️</div>}
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{m.name}</div>
                  <div className="between"><span className="price" style={{ color: 'var(--primary)', fontWeight: 700 }}>₹{m.price}</span><button className="btn sm primary">+ Add</button></div>
                </div>
              ))}
            </div>
            {!visible.filter((m) => m.available).length && <div className="empty">No items in this category.</div>}
          </div>
        </div>

        <div className="card cart" style={{ position: 'sticky', top: 90 }}>
          <h3>🛒 Cart {cart.length > 0 && <span className="badge available" style={{ marginLeft: 6 }}>{cart.reduce((a, i) => a + i.qty, 0)} items</span>}</h3>
          {!cart.length ? <div className="empty">Tap products to add to cart</div> : (
            <>
              {cart.map((i) => (
                <div key={i.name} className="cart-item" style={{ alignItems: 'center' }}>
                  <span>
                    <b>{i.name}</b>
                    <div className="qty-ctl" style={{ marginTop: 4 }}>
                      <button onClick={() => sub(i.name)}>−</button>
                      <b>{i.qty}</b>
                      <button onClick={() => add({ name: i.name, price: i.price })}>+</button>
                    </div>
                  </span>
                  <span style={{ fontWeight: 700 }}>₹{(i.price * i.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="line2" style={{ borderTop: '1px dashed var(--line)', margin: '10px 0' }} />
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b>Subtotal</b><b>₹{subtotal.toFixed(2)}</b>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', color: 'var(--muted)' }}>
                <span>Tax ({taxRate}%)</span><span>₹{taxAmt.toFixed(2)}</span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', fontWeight: 800, fontSize: 18, margin: '8px 0' }}>
                <span>TOTAL</span><span style={{ color: 'var(--primary)' }}>₹{grand.toFixed(2)}</span>
              </div>
              <div className="row" style={{ gap: 8 }}>
                {['cash', 'card', 'upi'].map((m) => (
                  <button key={m} className="btn" style={{ flex: 1, padding: '10px 8px', background: method === m ? 'linear-gradient(135deg, #06bdb4, #00a692)' : '#fff', color: method === m ? '#fff' : 'inherit', border: method === m ? 'none' : '1px solid #e3e3ea', fontWeight: 700 }} onClick={() => setMethod(m)}>
                    {m === 'cash' ? '💵' : m === 'card' ? '💳' : '📱'} {m.toUpperCase()}
                  </button>
                ))}
              </div>
              <button className="btn green" style={{ width: '100%', padding: 13, marginTop: 12, fontSize: 15 }} onClick={charge}>Charge ₹{grand.toFixed(2)}</button>
            </>
          )}
        </div>
      </div>
      {receiptId && <ReceiptModal bill={{ id: receiptId }} onClose={() => setReceiptId(null)} />}
    </div>
  );
}
