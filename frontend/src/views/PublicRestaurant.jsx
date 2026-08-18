import React, { useEffect, useState } from 'react';
import { get, post } from '../api.js';
import { useUnifiedCart } from '../context/UnifiedCartContext.jsx';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';

export default function PublicRestaurant() {
  const { food, addFood, removeFood, updateFood, rooms, total, foodTotal, roomTotal, clear } = useUnifiedCart();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [step, setStep] = useState(0); // 0=browse, 1=cart, 2=checkout
  const [form, setForm] = useState({ name: '', phone: '', email: '', order_type: 'pickup', address: '' });
  const [payMethod, setPayMethod] = useState('pay_at_restaurant');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    get('/public/hotels').then(setData).catch(() => {});
    get('/public/restaurant').then((d) => setData((prev) => ({ ...(prev || {}), menu: d.menu || [] }))).catch(() => {});
  }, []);

  const s = data?.settings || {};
  const paymentsEnabled = !!s.payments_enabled;
  const groups = data?.menu?.length ? data.menu : [];
  const items = groups.flatMap((g) => g.items || []);
  const cartCount = food.reduce((a, f) => a + (f.qty || 1), 0);
  const add = (id) => {
    const item = items.find(i => String(i.id) === String(id));
    if (item) {
      const existing = food.find(f => f.id === id);
      if (existing) updateFood({ ...existing, qty: existing.qty + 1 });
      else addFood({ ...item, qty: 1 });
      toast.success(`${item.name} added to cart`);
    }
  };

  const place = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return setError('Name and phone are required');
    if (form.order_type === 'delivery' && !form.address) return setError('Delivery address is required');
    if (payMethod === 'online' && !paymentsEnabled) return setError('Online payment is not available yet � please use Cash on Delivery.');
    setBusy(true);
    setError('');
    try {
      const r = await post('/public/orders', {
        items: food.map((f) => ({ id: f.id, qty: f.qty })),
        name: form.name, phone: form.phone, email: form.email || '',
        order_type: form.order_type, address: form.address,
        payment_method: payMethod,
      });
      if (payMethod === 'online') {
        await payOnline(r.order_id, r.total, form);
      } else {
        setDone(r);
        clear();
        setStep(0);
        toast.success(payMethod === 'cod' ? 'Order placed! Pay cash on delivery.' : 'Order placed successfully!');
      }
    } catch (err) {
      setError(err.message || 'Could not place the order');
      toast.error(err.message || 'Order failed');
    }
    setBusy(false);
  };

  const payOnline = async (orderId, amount, guest) => {
    if (typeof window === 'undefined' || !window.Razorpay) {
      await new Promise((res, rej) => {
        const scr = document.createElement('script');
        scr.src = 'https://checkout.razorpay.com/v1/checkout.js';
        scr.onload = res;
        scr.onerror = () => rej(new Error('Payment gateway failed to load'));
        document.body.appendChild(scr);
      });
    }
    const o = await post('/payments/create-order', { order_id: orderId, amount: Math.round(amount * 100) });
    const hotel = s.hotel_name || 'Hotel Lakshmi Elite';
    const opts = {
      key: o.key_id,
      order_id: o.order_id,
      amount: o.amount,
      currency: o.currency,
      name: hotel,
      description: `Food order ${guest.name}`,
      prefill: { name: guest.name, contact: guest.phone, email: guest.email || '' },
      theme: { color: '#d4af37' },
      handler: async () => {
        setDone({ reference: `FD-${orderId}`, total: amount, paid: true });
        clear();
        setStep(0);
        toast.success('Payment successful! Order confirmed.');
      },
      modal: { ondismiss: () => { setError('Payment was cancelled � you can pay on delivery instead.'); } },
    };
    window.Razorpay ? new window.Razorpay(opts).open() : setError('Payment gateway unavailable � please try cash on delivery.');
  };

  if (done) {
    return (
      <section className="public-section">
        <div className="public-form glass" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 42 }}>{done.paid ? '✅' : '🧾'}</div>
          <h2>{done.paid ? 'Payment successful!' : 'Order received!'}</h2>
          <p className="sub">Order <b>{done.reference}</b> · ₹{Number(done.total).toLocaleString('en-IN')} · {done.paid ? 'Paid online' : (payMethod === 'cod' ? 'Cash on Delivery' : 'Pay at Restaurant')}</p>
          <p className="sub">Thanks {form.name} — the kitchen has been notified. We will call you at {form.phone} to confirm.</p>
          <Button className="hm-btn hm-btn-primary" asChild onClick={() => { setStep(0); setForm({ name: '', phone: '', order_type: 'pickup', address: '' }); }}>
            <a href="#/restaurant">Order more</a>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="restaurant-hero">
        <h1>🍽️ {s.hotel_name || 'Hotel Lakshmi Elite'} Restaurant</h1>
        <p className="tag">Pure-vegetarian dining · Dine-in · Pickup · Delivery — {s.restaurant_hours || 'daily 7 AM – 11 PM'}</p>
        <div className="hero-actions">
          <a href="#/restaurant-booking" className="hm-btn hm-btn-outline">Book a Table</a>
          <a href="#/restaurant" className="hm-btn hm-btn-primary">Order Online</a>
        </div>
      </section>

      {step === 0 && (
        <section className="public-section">
          <h2>Order Online</h2>
          <p className="sub">Pickup or delivery — {s.hotel_name || 'Hotel Lakshmi Elite'}, {s.hotel_address || 'Pune'}</p>
          <div className="restaurant-layout">
            <div className="menu-col">
              {groups.map((grp) => (
                <div key={grp.category} className="menu-group">
                  <h3>{grp.category}</h3>
                  <div className="menu-items">
                    {(grp.items || []).map((it) => (
                      <div key={it.id} className="menu-item glass">
                        {it.image && <img src={it.image} alt={it.name} className="menu-img" onError={(e) => { e.target.style.display = 'none'; }} />}
                        <div>
                          <b>{it.name}</b>
                          <p className="menu-price-inline">₹{Number(it.price).toLocaleString('en-IN')}</p>
                        </div>
                        <Button className="hm-btn hm-btn-primary" size="sm" onClick={() => add(it.id)}>
                          + Add
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <aside className="cart-panel glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3>🛒 Your Order {cartCount > 0 && <span className="badge" style={{background: 'var(--hm-gold)', color: '#241c00', marginLeft: 8}}>{cartCount}</span>}</h3>
              </div>
              {food.length === 0 ? (
                <div className="empty">Your cart is empty — add dishes from the menu.</div>
              ) : (
                <>
                  {food.map((f) => (
                    <div key={f.id} className="cart-item">
                      <span>{f.name} ×{f.qty}</span>
                      <span>₹{(f.price * f.qty).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div style={{ fontWeight: 800, margin: '10px 0' }}><span>Food Total</span><span>₹{Number(foodTotal).toLocaleString('en-IN')}</span></div>
                  {rooms.length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <div style={{ fontWeight: 600, margin: '10px 0', color: 'var(--muted)', fontSize: 13 }}>
                        <span>Room Nights ({rooms.length})</span>
                        <span>₹{Number(roomTotal).toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  )}
                  <div style={{ fontWeight: 800, margin: '10px 0', fontSize: 16, color: 'var(--hm-primary)' }}>
                    <span>Total</span><span>₹{Number(total).toLocaleString('en-IN')}</span>
                  </div>
                  <Button className="hm-btn hm-btn-primary" style={{ width: '100%' }} size="lg" onClick={() => setStep(2)}>
                    Continue to Checkout
                  </Button>
                  <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                    Want to add a room stay? <a href="#/booking" style={{ color: 'var(--hm-primary)', fontWeight: 600 }}>Book a room</a> and combine in one checkout.
                  </p>
                </>
              )}
            </aside>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="public-section" style={{maxWidth: '900px', margin: '0 auto'}}>
          <div className="unified-checkout" style={{padding: '24px 16px'}}>
            <div className="steps">
              <div className="step completed"><div className="step-number">1</div><div className="step-label">Menu</div></div>
              <div className="step completed"><div className="step-number">2</div><div className="step-label">Cart</div></div>
              <div className="step active"><div className="step-number">3</div><div className="step-label">Checkout</div></div>
            </div>

            <div className="grid">
              <div>
                <div className="section">
                  <div className="section-title">🍽️ Your Order</div>
                  {food.map((f) => (
                    <div key={f.id} className="item">
                      <img className="item-img" src={f.image || '/images/hotel_Lakshmi.webp'} alt={f.name} onError={(e)=>e.target.style.display='none'} />
                      <div className="item-info">
                        <div className="item-name">{f.name}</div>
                        <div className="item-meta">{f.category || 'Main'}</div>
                      </div>
                      <div className="item-qty">
                        <button className="qty-btn" onClick={() => updateFood({...f, qty: Math.max(1, f.qty - 1)})}>−</button>
                        <span>{f.qty}</span>
                        <button className="qty-btn" onClick={() => updateFood({...f, qty: f.qty + 1})}>+</button>
                        <span className="item-price">₹{Number(f.price * f.qty).toLocaleString('en-IN')}</span>
                        <button className="qty-btn" onClick={() => removeFood(f.id)} style={{marginLeft: 8, color: 'var(--red)'}}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="summary">
                <Card className="summary-card">
                  <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="summary-row"><span>Dining ({cartCount} items)</span><span>₹{Number(foodTotal).toLocaleString('en-IN')}</span></div>
                    {rooms.length > 0 && <div className="summary-row"><span>Room Nights ({rooms.length})</span><span>₹{Number(roomTotal).toLocaleString('en-IN')}</span></div>}
                    <div className="summary-row total"><span>Total</span><span>₹{Number(total).toLocaleString('en-IN')}</span></div>

                    <h4 style={{marginTop: 16, marginBottom: 12, fontSize: 16}}>Guest Details</h4>
                    <div className="guest-form" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14}}>
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input id="name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="John Doe" required />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone *</Label>
                        <Input id="phone" type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 98765 43210" required />
                      </div>
                      <div style={{gridColumn: '1 / -1'}}>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@example.com" />
                      </div>
                      <div style={{gridColumn: '1 / -1'}}>
                        <Label htmlFor="address">Address (for delivery)</Label>
                        <Input id="address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Full address for food delivery" />
                      </div>
                    </div>
                    <div className="full">
                      {error && <div style={{color: 'var(--red)', fontSize: 13, marginTop: 8}}>{error}</div>}
                      <div className="pay-options" style={{marginTop: 12}}>
                        <label className="pay-option" style={{border: payMethod === 'pay_at_restaurant' ? '2px solid var(--hm-primary)' : '1px solid #efece3'}}>
                          <input type="radio" name="pay" value="pay_at_restaurant" checked={payMethod === 'pay_at_restaurant'} onChange={() => setPayMethod('pay_at_restaurant')} />
                          <div>
                            <div className="pay-option-label">🍽️ Pay at Restaurant</div>
                            <div className="pay-option-desc">Pickup or dine-in — pay when you collect your order</div>
                          </div>
                        </label>
                        {form.order_type === 'delivery' && (
                          <label className="pay-option" style={{border: payMethod === 'cod' ? '2px solid var(--hm-primary)' : '1px solid #efece3'}}>
                            <input type="radio" name="pay" value="cod" checked={payMethod === 'cod'} onChange={() => setPayMethod('cod')} />
                            <div>
                              <div className="pay-option-label">💵 Cash on Delivery</div>
                              <div className="pay-option-desc">Pay the delivery partner when your food arrives</div>
                            </div>
                          </label>
                        )}
                        <label className="pay-option" style={{border: payMethod === 'online' ? '2px solid var(--hm-primary)' : '1px solid #efece3'}}>
                          <input type="radio" name="pay" value="online" checked={payMethod === 'online'} onChange={() => setPayMethod('online')} />
                          <div>
                            <div className="pay-option-label">💳 Pay Online</div>
                            <div className="pay-option-desc">{paymentsEnabled ? 'UPI · Cards · Net Banking — instant secure payment' : 'Online payment coming soon — Razorpay keys not set yet'}</div>
                          </div>
                        </label>
                      </div>
                      <Button className="hm-btn hm-btn-primary btn-checkout" size="lg" onClick={place} disabled={busy}>
                        {busy ? 'Placing Order…' : payMethod === 'online' ? `Pay ${s.currency_symbol || '₹'}${Number(total).toLocaleString('en-IN')} Online` : `Place Order · ${s.currency_symbol || '₹'}${Number(total).toLocaleString('en-IN')}`}
                      </Button>
                      <Button className="hm-btn hm-btn-outline" size="lg" style={{width: '100%', marginTop: 8}} onClick={() => setStep(1)}>
                        Back to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
        </section>
      )}
    </>
  );
}