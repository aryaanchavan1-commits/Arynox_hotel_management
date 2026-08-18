import React, { useEffect, useState } from 'react';
import { get, post } from '../api.js';
import { useUnifiedCart } from '../context/UnifiedCartContext.jsx';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import { useToast } from '@/hooks/useToast';

export default function UnifiedCheckout({ setConfirm }) {
  const { rooms, food, guest, checkIn, checkOut, adults,
    removeRoom, updateRoom, removeFood, updateFood, setGuest, setDates, clear,
    roomTotal, foodTotal, total } = useUnifiedCart();
  const { toast } = useToast();
  const [step, setStep] = useState(1); // 1=review, 2=guest, 3=payment
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [payMethod, setPayMethod] = useState('pay_at_hotel');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (guest) setForm(g => ({ ...g, name: guest.name, phone: guest.phone, email: guest.email || '' }));
    const saved = JSON.parse(localStorage.getItem('arynox_guest_user') || 'null');
    if (saved) setForm(g => ({ ...g, name: saved.name, phone: saved.phone, email: saved.email || '' }));
  }, [guest]);

  const canProceedToGuest = rooms.length > 0 || food.length > 0;
  const canProceedToPayment = form.name && form.phone;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canProceedToPayment) return setError('Please fill in name and phone');
    setBusy(true);
    setError('');

    try {
      const results = [];
      // 1. Book rooms if any
      if (rooms.length > 0) {
        for (const room of rooms) {
          const r = await post('/public/bookings', {
            room_type_id: room.roomTypeId,
            check_in: room.checkIn,
            check_out: room.checkOut,
            adults: room.adults || adults || 2,
            name: form.name,
            phone: form.phone,
            email: form.email,
            address: form.address,
            id_type: 'passport',
            id_number: '',
            meal_plan: 'room_only',
            payment_method: payMethod,
          });
          results.push({ type: 'room', ref: r.reference, id: r.bookingId });
        }
      }
      // 2. Place food orders if any
      if (food.length > 0) {
        const r = await post('/public/orders', {
          items: food.map(f => ({ id: f.id, qty: f.qty })),
          name: form.name,
          phone: form.phone,
          order_type: 'pickup',
          address: form.address,
        });
        results.push({ type: 'food', ref: r.reference, id: r.orderId });
      }

      clear();
      if (setConfirm) setConfirm({ references: results.map(r => r.ref), total });
      toast.success('Booking confirmed!');
    } catch (err) {
      setError(err.message || 'Could not complete booking');
      toast.error(err.message || 'Booking failed');
    } finally {
      setBusy(false);
    }
  };

  const nights = checkIn && checkOut ? Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)) : 1;

  return (
    <div className="unified-checkout">
      <div className="steps">
        <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Review</div>
        </div>
        <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Details</div>
        </div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">Payment</div>
        </div>
      </div>

      <div className="grid">
        <div>
          <div className="section">
            <div className="section-title">🏨 Room Nights</div>
            {rooms.length === 0 ? (
              <p style={{color: 'var(--muted)', textAlign: 'center', padding: '20px'}}>No rooms selected</p>
            ) : (
              rooms.map((r) => (
                <div key={r.id} className="item">
                  <img className="item-img" src={r.image || '/images/hotel/room-deluxe.jpg'} alt={r.name} onError={(e)=>e.target.style.display='none'} />
                  <div className="item-info">
                    <div className="item-name">{r.name}</div>
                    <div className="item-meta">
                      {nights} night{ nights>1 ? 's' : '' } · {r.adults || adults || 2} guest{ (r.adults||adults||2)>1 ? 's' : '' }
                      · {r.checkIn} → {r.checkOut}
                    </div>
                  </div>
                  <div className="item-qty">
                    <button className="qty-btn" onClick={() => removeRoom(r.id)}>−</button>
                    <span>1</span>
                    <button className="qty-btn" onClick={() => { /* could add multiple rooms */ }}>+</button>
                    <span className="item-price">₹{Number(r.price * nights).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {food.length > 0 && (
            <div className="section">
              <div className="section-title">🍽️ Dining Orders</div>
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
          )}

          {(rooms.length === 0 && food.length === 0) && (
            <div className="section" style={{textAlign: 'center', padding: '40px 20px'}}>
              <div style={{fontSize: 48, marginBottom: 16}}>🛒</div>
              <h3>Your cart is empty</h3>
              <p style={{color: 'var(--muted)', marginBottom: 20}}>Add a room stay or dining items to continue</p>
              <div style={{display: 'flex', gap: 12, justifyContent: 'center'}}>
                <Button className="hm-btn hm-btn-primary" asChild><a href="#/booking">Book a Stay</a></Button>
                <Button className="hm-btn hm-btn-outline" asChild><a href="#/restaurant">Order Food</a></Button>
              </div>
            </div>
          )}
        </div>

        <aside className="summary">
          <Card className="summary-card">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="summary-row"><span>Room Nights ({rooms.length})</span><span>₹{Number(roomTotal).toLocaleString('en-IN')}</span></div>
              {food.length > 0 && <div className="summary-row"><span>Dining ({food.reduce((a,f)=>a+f.qty,0)} items)</span><span>₹{Number(foodTotal).toLocaleString('en-IN')}</span></div>}
              <div className="summary-row total"><span>Total</span><span>₹{Number(total).toLocaleString('en-IN')}</span></div>

              {step === 1 && canProceedToGuest && (
                <Button className="btn-checkout hm-btn hm-btn-primary" size="lg" onClick={() => setStep(2)}>
                  Continue to Guest Details
                </Button>
              )}

              {step >= 2 && (
                <div>
                  <h4 style={{marginBottom: 12, fontSize: 16}}>Guest Details</h4>
                  <div className="guest-form">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input id="name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="John Doe" required />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input id="phone" type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 98765 43210" required />
                    </div>
                    <div className="full">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@example.com" />
                    </div>
                    <div className="full">
                      <Label htmlFor="address">Address (for delivery)</Label>
                      <Input id="address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Full address for food delivery" />
                    </div>
                  </div>
                  <div className="full">
                    {error && <div style={{color: 'var(--red)', fontSize: 13, marginTop: 8}}>{error}</div>}
                    <Button className="hm-btn hm-btn-primary" size="lg" onClick={() => setStep(3)} disabled={!canProceedToPayment}>Continue to Payment</Button>
                  </div>
                </div>
              )}

              {step >= 3 && (
                <div>
                  <h4 style={{marginBottom: 12, fontSize: 16}}>Payment Method</h4>
                  <div className="pay-options">
                    <label className="pay-option">
                      <input type="radio" name="pay" value="pay_at_hotel" checked={payMethod === 'pay_at_hotel'} onChange={() => setPayMethod('pay_at_hotel')} />
                      <div>
                        <div className="pay-option-label">💰 Pay at Hotel</div>
                        <div className="pay-option-desc">Settle the bill during checkout</div>
                      </div>
                    </label>
                    <label className="pay-option">
                      <input type="radio" name="pay" value="razorpay" checked={payMethod === 'razorpay'} onChange={() => setPayMethod('razorpay')} />
                      <div>
                        <div className="pay-option-label">💳 Razorpay (Online)</div>
                        <div className="pay-option-desc">Pay securely with card/UPI/netbanking</div>
                      </div>
                    </label>
                  </div>
                  <Button className="hm-btn hm-btn-primary btn-checkout" size="lg" onClick={handleSubmit} disabled={busy}>
                    {busy ? 'Confirming…' : `Confirm & Pay ₹${Number(total).toLocaleString('en-IN')}`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}