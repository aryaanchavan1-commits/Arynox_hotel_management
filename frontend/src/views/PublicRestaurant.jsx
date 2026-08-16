import React, { useEffect, useState } from 'react';
import { get, post } from '../api.js';

export default function PublicRestaurant() {
  const [data, setData] = useState(null);
  const [cart, setCart] = useState({});
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', phone: '', order_type: 'pickup', address: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    get('/public/restaurant').then(setData).catch(() => {});
  }, []);

  const s = data?.settings || {};
  const groups = data?.menu?.length ? data.menu : [];
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const add = (id, delta) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) + delta) }));
  const items = groups.flatMap((g) => g.items || []);
  const cartRows = Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => {
    const it = items.find((i) => String(i.id) === String(id)) || { name: `Item #${id}`, price: 0 };
    return { ...it, qty };
  });
  const total = cartRows.reduce((t, r) => t + r.price * r.qty, 0);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const place = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return setError('Name and phone are required');
    if (form.order_type === 'delivery' && !form.address) return setError('Delivery address is required');
    setBusy(true);
    setError('');
    try {
      const r = await post('/public/orders', {
        items: cartRows.map((r2) => ({ id: r2.id, qty: r2.qty })),
        name: form.name, phone: form.phone, order_type: form.order_type, address: form.address,
      });
      setDone(r);
      setCart({});
      setStep(0);
    } catch (err) {
      setError(err.message || 'Could not place the order');
    }
    setBusy(false);
  };

  if (done) {
    return (
      <section className="public-section">
        <div className="public-form glass" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 42 }}>🧾</div>
          <h2>Order received!</h2>
          <p className="sub">Order <b>{done.reference}</b> · ₹{Number(done.total).toLocaleString('en-IN')}</p>
          <p className="sub">Thanks {form.name} — the kitchen has been notified. We will call you at {form.phone} to confirm.</p>
          <a className="btn primary" href="#/restaurant">Order more</a>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="restaurant-hero">
        <h1>🍽️ {s.restaurant_about ? 'Aadhya Restaurant' : 'Aadhya Restaurant'}</h1>
        <p className="tag">Multi-cuisine dining · Dine-in · Pickup · Delivery — {s.restaurant_hours || 'daily 7 AM – 11 PM'}</p>
        <div className="hero-actions">
          <a href="#/booking" className="btn ghost">Book a Table</a>
          <a href="#/restaurant" className="btn primary">Order Online</a>
        </div>
      </section>

      <section className="public-section">
        <h2>Order Online</h2>
        <p className="sub">Pickup or delivery — {s.hotel_name || 'Hotel Laxmi Elite'}, {s.hotel_address || 'Pune'}</p>
        <div className="restaurant-layout">
          <div className="menu-col">
            {groups.map((grp) => (
              <div key={grp.category} className="menu-group">
                <h3>{grp.category}</h3>
                <div className="menu-items">
                  {(grp.items || []).map((it) => (
                    <div key={it.id} className="menu-item glass">
                      <div>
                        <b>{it.name}</b>
                        <p className="menu-price-inline">₹{Number(it.price).toLocaleString('en-IN')}</p>
                      </div>
                      {cart[it.id] ? (
                        <div className="qty-ctl">
                          <button type="button" onClick={() => add(it.id, -1)}>−</button>
                          <b>{cart[it.id]}</b>
                          <button type="button" onClick={() => add(it.id, 1)}>+</button>
                        </div>
                      ) : (
                        <button type="button" className="btn primary sm" onClick={() => add(it.id, 1)}>Add</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <aside className="cart-panel glass">
            <h3>🛒 Your Order {cartCount > 0 && <span className="badge">{cartCount}</span>}</h3>
            {cartRows.length === 0 ? (
              <div className="empty">Your cart is empty — add dishes from the menu.</div>
            ) : (
              <>
                {cartRows.map((r) => (
                  <div key={r.id} className="cart-item">
                    <span>{r.name} ×{r.qty}</span>
                    <span>₹{(r.price * r.qty).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="row2" style={{ fontWeight: 800, margin: '10px 0' }}><span>Total</span><span>₹{total.toLocaleString('en-IN')}</span></div>
                {step === 0 ? (
                  <button className="btn primary" style={{ width: '100%' }} onClick={() => setStep(1)}>Checkout</button>
                ) : (
                  <form onSubmit={place}>
                    <label>Name *</label><input value={form.name} onChange={set('name')} placeholder="Your name" />
                    <label style={{ marginTop: 8 }}>Phone *</label><input value={form.phone} onChange={set('phone')} placeholder="+91…" />
                    <label style={{ marginTop: 8 }}>Order type</label>
                    <select value={form.order_type} onChange={set('order_type')}>
                      <option value="pickup">Pickup</option>
                      <option value="delivery">Delivery</option>
                    </select>
                    {form.order_type === 'delivery' && (
                      <>
                        <label style={{ marginTop: 8 }}>Delivery address *</label>
                        <textarea rows="2" value={form.address} onChange={set('address')} placeholder="House no, street, area, city" />
                      </>
                    )}
                    {error && <div className="msg err" style={{ marginTop: 8 }}>{error}</div>}
                    <div className="row" style={{ marginTop: 10 }}>
                      <button type="button" className="btn" onClick={() => setStep(0)}>← Back</button>
                      <button className="btn primary" disabled={busy} style={{ flex: 1 }}>{busy ? 'Placing…' : 'Place order · Pay at hotel'}</button>
                    </div>
                  </form>
                )}
              </>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}