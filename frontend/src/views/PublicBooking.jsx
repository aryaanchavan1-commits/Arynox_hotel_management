import React, { useEffect, useState } from 'react';
import { get, post } from '../api.js';
import { useUnifiedCart } from '../context/UnifiedCartContext.jsx';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import { useToast } from '@/hooks/useToast';

const fileToBase64 = (file) => new Promise((res) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(',')[1]);
  r.readAsDataURL(file);
});

export default function PublicBooking({ setConfirm }) {
  const { rooms, addRoom, removeRoom, updateRoom, food, total, roomTotal, foodTotal, setDates, clear } = useUnifiedCart();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', id_type: 'passport', id_number: '', address: '' });
  const [idProof, setIdProof] = useState({ file: null, preview: null, error: '' });
  const [payNow, setPayNow] = useState(false);
  const [savedGuest, setSavedGuest] = useState(() => JSON.parse(localStorage.getItem('arynox_guest_user') || 'null'));
  const [inq, setInq] = useState({ name: '', phone: '', email: '', check_in: '', check_out: '', notes: '' });
  const [inqBusy, setInqBusy] = useState(false);
  const [inqDone, setInqDone] = useState('');

  useEffect(() => {
    get('/public/hotels').then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const type = params.get('type');
    if (type && data) {
      const t = data.roomTypes.find((x) => String(x.id) === type);
      if (t) setSelected(t);
    }
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    if (!payNow) return;
    if (typeof window !== 'undefined' && !window.Razorpay && !document.getElementById('razorpay-checkout')) {
      const s = document.createElement('script');
      s.id = 'razorpay-checkout';
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      s.onload = () => { if (!cancelled) console.log('[razorpay] loaded'); };
      document.body.appendChild(s);
      return () => { cancelled = true; };
    }
  }, [payNow]);

  const s = data?.settings || {};

  async function search(e) {
    e.preventDefault();
    const ci = e.target.ci.value;
    const co = e.target.co.value;
    const adults = e.target.adults.value || 2;
    if (!ci || !co) return setError('Select both dates');
    if (new Date(co) <= new Date(ci)) return setError('Check-out must be after check-in');
    setSearching(true);
    setError('');
    try {
      const r = await get(`/availability?check_in=${ci}&check_out=${co}&adults=${adults}`);
      setResults(r);
      setSelected(null);
      setDates({ checkIn: ci, checkOut: co, adults: Number(adults) });
    } catch (e2) { setError(e2.message); }
    setSearching(false);
  }

  function addToUnifiedCart() {
    if (!selected) return;
    addRoom({
      roomTypeId: selected.id,
      name: selected.name,
      price: selected.price,
      checkIn: results.check_in,
      checkOut: results.check_out,
      nights: results.nights,
      adults: results.adults,
      image: selected.image,
    });
    toast.success(`${selected.name} added to cart`);
    location.hash = '#/unified-checkout';
  }

  async function submitInquiry(e) {
    e.preventDefault();
    if (!inq.name.trim() || !inq.phone.trim()) return setError('Name and phone are required for a callback');
    setInqBusy(true);
    setError('');
    try {
      await post('/public/inquiries', inq);
      setInqDone(`Thank you ${inq.name}! The hotel team will call you back at ${inq.phone} shortly.`);
      setInq({ name: '', phone: '', email: '', check_in: '', check_out: '', notes: '' });
      toast.success('Inquiry received — we will call you back');
    } catch (err) {
      setError(err.message || 'Could not submit the inquiry');
      toast.error(err.message || 'Inquiry failed');
    }
    setInqBusy(false);
  }

  return (
    <>
      <section className="public-section" style={{ marginTop: 8 }}>
        <h2>Book your stay</h2>
        <p className="sub">Find a room and add to your combined cart</p>
        {error && <div className="msg err">{error}</div>}
        <form className="public-search" onSubmit={search}>
          <div><label>Check-in</label><input type="date" name="ci" required /></div>
          <div><label>Check-out</label><input type="date" name="co" required /></div>
          <div><label>Guests</label>
            <select name="adults" defaultValue="2">
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>)}
              <option value="7">7+ Guests</option>
            </select>
          </div>
          <button className="btn primary" disabled={searching}>{searching ? 'Checking…' : 'Search'}</button>
        </form>
      </section>

      <section className="public-section" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', border: '2px solid rgba(212, 175, 55, .35)', borderRadius: 18 }}>
        <h2 style={{ color: '#d4af37' }}>📞 Need help? Request a callback</h2>
        <p className="sub" style={{ color: '#c9c9d8' }}>
          Not sure what to book? Leave your number — the hotel team will call you back and handle everything (special rates, group bookings, long stays).
        </p>
        {inqDone && <div className="msg ok" style={{ margin: '12px 0' }}>{inqDone}</div>}
        <form className="call-card-form" onSubmit={submitInquiry}>
          <div><label>Your name *</label><input value={inq.name} onChange={(e) => setInq({ ...inq, name: e.target.value })} placeholder="Full name" /></div>
          <div><label>Phone *</label><input type="tel" value={inq.phone} onChange={(e) => setInq({ ...inq, phone: e.target.value })} placeholder="+91 98765 43210" /></div>
          <div><label>Email (optional)</label><input type="email" value={inq.email} onChange={(e) => setInq({ ...inq, email: e.target.value })} placeholder="you@example.com" /></div>
          <div><label>Tentative dates (optional)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="date" value={inq.check_in} onChange={(e) => setInq({ ...inq, check_in: e.target.value })} />
              <input type="date" value={inq.check_out} onChange={(e) => setInq({ ...inq, check_out: e.target.value })} />
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Notes (optional)</label>
            <textarea value={inq.notes} onChange={(e) => setInq({ ...inq, notes: e.target.value })} rows="2" placeholder="e.g. we need 2 rooms for a family wedding, ground floor, early check-in…" />
          </div>
          <button className="call-card-btn" disabled={inqBusy} style={{ gridColumn: '1 / -1' }}>
            {inqBusy ? 'Sending…' : '📞 Call me back'}
          </button>
        </form>
      </section>

      {results && (
        <section className="public-section">
          <h2>Available rooms</h2>
          <p className="sub">{results.nights} night(s) · {results.adults} guest(s)</p>
          <div className="room-cards">
            {results.roomTypes.filter((t) => t.freeCount > 0).map((t) => (
              <div key={t.id} className="room-card-public" style={{ cursor: 'pointer', border: selected?.id === t.id ? '2px solid var(--hm-primary)' : '1px solid #f0ede2' }}
                onClick={() => setSelected({ ...t, nights: results.nights })}>
                <img className="room-card-img" src={t.image || '/images/hotel/room-deluxe.jpg'} alt={t.name} onError={(e)=>e.target.style.display='none'} />
                <div className="body">
                  <div className="name">{t.name}</div>
                  <div className="price">{s.currency_symbol || '₹'}{t.price} <small>/ night</small></div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Up to {t.capacity} guests · {t.freeCount} free</div>
                  <div className="price" style={{ marginTop: 4 }}>Total: {s.currency_symbol || '₹'}{t.total}</div>
                  <span className="hm-book-btn" style={{ display: 'block', marginTop: 12, textAlign: 'center' }}>
                    {selected?.id === t.id ? '✓ Selected' : 'Select'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {results.roomTypes.every((t) => t.freeCount === 0) && <div className="empty">No rooms available for these dates.</div>}
        </section>
      )}

      {selected && results && (
        <section className="public-section">
          <h2>Add to Cart</h2>
          <div className="unified-checkout" style={{maxWidth: '600px'}}>
            <div className="section">
              <div className="section-title">🏨 Selected Room</div>
              <div className="item">
                <img className="item-img" src={selected.image || '/images/hotel/room-deluxe.jpg'} alt={selected.name} onError={(e)=>e.target.style.display='none'} />
                <div className="item-info">
                  <div className="item-name">{selected.name}</div>
                  <div className="item-meta">
                    {results.nights} night{results.nights>1?'s':''} · {results.adults} guest{results.adults>1?'s':''}
                    · {results.check_in} → {results.check_out}
                  </div>
                </div>
                <div className="item-price">₹{Number(selected.total).toLocaleString('en-IN')}</div>
              </div>
            </div>

            {food.length > 0 && (
              <Card className="summary-card" style={{marginTop: 16}}>
                <CardHeader><CardTitle>🍽️ Also in Cart</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="summary-row"><span>Dining ({food.reduce((a,f)=>a+f.qty,0)} items)</span><span>₹{Number(foodTotal).toLocaleString('en-IN')}</span></div>
                  <div className="summary-row total"><span>Combined Total</span><span>₹{Number(total).toLocaleString('en-IN')}</span></div>
                </CardContent>
              </Card>
            )}

            <div style={{marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap'}}>
              <Button className="hm-btn hm-btn-primary" size="lg" style={{flex: 1, minWidth: 200}} onClick={addToUnifiedCart}>
                Add to Cart & Continue to Checkout
              </Button>
              <Button className="hm-btn hm-btn-outline" size="lg" style={{flex: 1, minWidth: 200}} onClick={() => setSelected(null)}>
                Change Room
              </Button>
            </div>

            <p style={{textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 12}}>
              Your room will be saved in the unified cart. You can add dining items from <a href="#/restaurant" style={{color: 'var(--hm-primary)', fontWeight: 600}}>Restaurant</a> and checkout everything together.
            </p>
          </div>
        </section>
      )}
    </>
  );
}