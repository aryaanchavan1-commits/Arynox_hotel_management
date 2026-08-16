import React, { useEffect, useState } from 'react';
import { get, put } from '../api.js';

const JSON_OK = (v) => { try { JSON.parse(v); return true; } catch { return false; } };

export default function Settings() {
  const [form, setForm] = useState({
    hotel_name: 'Hotel Laxmi Elite', hotel_address: '', hotel_phone: '', tax_rate: '5',
    email: '', welcome_message: '', tagline: '', primary_color: '#4f46e5',
    about_text: '', footer_text: '', facilities_json: '[]', gallery_json: '[]', social_json: '{}',
    razorpay_key_id: '', razorpay_key_secret: '', razorpay_webhook_secret: '', api_base_url: '',
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    get('/settings').then((s) => {
      const f = {
        ...form,
        ...s,
        facilities_json: s.facilities_json || JSON.stringify([
          { icon: '🌐', title: 'Free Wi-Fi', text: 'High-speed internet in every room' },
          { icon: '🍽️', title: 'Restaurant', text: 'Multi-cuisine restaurant & bar' },
          { icon: '🚗', title: 'Free Parking', text: 'Secure on-site parking' },
          { icon: '🕒', title: '24/7 Front Desk', text: 'Round-the-clock assistance' },
        ]),
        gallery_json: s.gallery_json || '[]',
        social_json: s.social_json || '{}',
      };
      setForm(f);
    }).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    if (!JSON_OK(form.facilities_json)) return setErr('Facilities must be valid JSON (see placeholder format).');
    if (!JSON_OK(form.gallery_json)) return setErr('Gallery must be valid JSON (see placeholder format).');
    if (!JSON_OK(form.social_json)) return setErr('Social links must be valid JSON.');
    try {
      await put('/settings', form);
      if (form.api_base_url) { try { localStorage.setItem('api_base_url', form.api_base_url.replace(/\/+$/, '')); } catch {} }
      else { try { localStorage.removeItem('api_base_url'); } catch {} }
      setMsg('✅ Settings saved — receipts and the public website now use your values.');
    } catch (e2) { setErr(e2.message); }
  };

  const set = (k) => (ev) => setForm({ ...form, [k]: ev.target.value });

  return (
    <div>
      <h1>⚙️ Settings</h1>
      {msg && <div className="msg ok">{msg}</div>}
      {err && <div className="msg err">{err}</div>}
      <div className="between" style={{ marginBottom: 12 }}>
        <a href="#/" target="_blank" rel="noreferrer" className="btn">👁️ Preview public site</a>
        <button className="btn" type="button" onClick={async () => {
          try {
            const r = await fetch('/api/export', { headers: { Authorization: 'Bearer ' + localStorage.getItem('arynox_token') } });
            const data = await r.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `hotel-export-${new Date().toISOString().slice(0,10)}.json`; a.click();
          } catch (e) { alert('Export failed: ' + e.message); }
        }}>📥 Export data</button>
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Import JSON:
          <input type="file" accept="application/json" onChange={async (e) => {
            const f = e.target.files[0]; if (!f) return;
            const text = await f.text();
            try {
              const data = JSON.parse(text);
              const r = await fetch('/api/import', { method: 'POST', headers: { Authorization: 'Bearer ' + localStorage.getItem('arynox_token'), 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
              const j = await r.json(); alert('Imported ' + (j.imported || 0) + ' rows');
            } catch (err) { alert('Import failed: ' + err.message); }
          }} style={{ display: 'none' }} />
        </label>
      </div>

      <div className="card" style={{ marginTop: 16, maxWidth: 640 }}>
        <h3>Brand & billing</h3>
        <p style={{ color: 'var(--muted)', margin: '4px 0 14px' }}>Used on receipts (thermal + print), invoices and the public website.</p>
        <form onSubmit={save}>
          <div className="form-grid">
            <div className="full">
              <label>Hotel / restaurant name (shown on the website header & footer)</label>
              <input value={form.hotel_name} onChange={set('hotel_name')} required />
            </div>
            <div className="full">
              <label>Address</label>
              <input value={form.hotel_address} onChange={set('hotel_address')} />
            </div>
            <div>
              <label>Phone</label>
              <input value={form.hotel_phone} onChange={set('hotel_phone')} />
            </div>
            <div>
              <label>Email</label>
              <input type="email" value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label>Tax rate (%)</label>
              <input type="number" step="0.1" min="0" max="50" value={form.tax_rate} onChange={set('tax_rate')} />
            </div>
            <div>
              <label>Brand colour (hex, e.g. #4f46e5)</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(form.primary_color) ? form.primary_color : '#4f46e5'} onChange={set('primary_color')} style={{ width: 48, height: 36, padding: 0 }} />
                <input value={form.primary_color} onChange={set('primary_color')} placeholder="#4f46e5" />
              </div>
            </div>
          </div>

          <h3 style={{ marginTop: 22 }}>Website — hero & about</h3>
          <p style={{ color: 'var(--muted)', margin: '4px 0 14px' }}>These appear on the public home page.</p>
          <label>Welcome headline</label>
          <input value={form.welcome_message} onChange={set('welcome_message')} placeholder="Welcome to your hotel" />
          <label style={{ marginTop: 12 }}>Tagline (small text under the headline)</label>
          <input value={form.tagline} onChange={set('tagline')} placeholder="Stay · Dine · Celebrate" />
          <label style={{ marginTop: 12 }}>About your hotel (paragraph on the home page)</label>
          <textarea rows="3" value={form.about_text} onChange={set('about_text')} placeholder="Tell guests about your hotel, restaurant, location…" />
          <label style={{ marginTop: 12 }}>Footer copyright text</label>
          <input value={form.footer_text} onChange={set('footer_text')} placeholder="Your Hotel. All rights reserved." />

          <h3 style={{ marginTop: 22 }}>Website — facilities (JSON)</h3>
          <p style={{ color: 'var(--muted)', margin: '4px 0 14px' }}>One item per row: icon (emoji), title, short text.</p>
          <textarea rows="6" className="mono" value={form.facilities_json} onChange={set('facilities_json')}
            placeholder='[{"icon":"🌐","title":"Free Wi-Fi","text":"High-speed internet"},{"icon":"🍽️","title":"Restaurant","text":"Multi-cuisine"}]' />

          <h3 style={{ marginTop: 22 }}>Website — gallery (JSON)</h3>
          <p style={{ color: 'var(--muted)', margin: '4px 0 14px' }}>One tile per row: emoji, label, gradient colour.</p>
          <textarea rows="4" className="mono" value={form.gallery_json} onChange={set('gallery_json')}
            placeholder='[{"emoji":"🛏️","label":"Rooms","color":"linear-gradient(135deg,#4f46e5,#7c3aed)"}]' />

          <h3 style={{ marginTop: 22 }}>Website — social links (JSON)</h3>
          <textarea rows="3" className="mono" value={form.social_json} onChange={set('social_json')}
            placeholder='{"facebook":"https://facebook.com/yourhotel","instagram":"https://instagram.com/yourhotel"}' />

          <h3 style={{ marginTop: 22 }}>💳 Payments (Razorpay)</h3>
          <p style={{ color: 'var(--muted)', margin: '4px 0 14px' }}>
            Paste your Razorpay keys to let guests pay online when booking. Get them at{' '}
            <a className="link" href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noreferrer">dashboard.razorpay.com → Settings → API Keys</a>.
            Then create a webhook in Razorpay → Settings → Webhooks pointing to:
          </p>
          <code className="mono" style={{ fontSize: 12, wordBreak: 'break-all' }}>{`${window.location.origin}/api/payments/webhook`} &nbsp;(events: payment.captured)</code>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <div className="full">
              <label>Razorpay Key ID (public)</label>
              <input value={form.razorpay_key_id} onChange={set('razorpay_key_id')} placeholder="rzp_live_…" autoComplete="off" />
            </div>
            <div className="full">
              <label>Razorpay Key Secret</label>
              <input type={showSecrets ? 'text' : 'password'} value={form.razorpay_key_secret} onChange={set('razorpay_key_secret')} placeholder="—" autoComplete="off" />
            </div>
            <div className="full">
              <label>Razorpay Webhook Secret</label>
              <input type={showSecrets ? 'text' : 'password'} value={form.razorpay_webhook_secret} onChange={set('razorpay_webhook_secret')} placeholder="—" autoComplete="off" />
            </div>
            <div className="full">
              <label>
                <input type="checkbox" checked={showSecrets} onChange={(e) => setShowSecrets(e.target.checked)} style={{ width: 'auto', marginRight: 6 }} />
                Show secrets
              </label>
            </div>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
            Keys can also be set in the server .env as RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET (settings above win).
          </p>

          <h3 style={{ marginTop: 22 }}>🖥️ API base URL (optional)</h3>
          <p style={{ color: 'var(--muted)', margin: '4px 0 8px' }}>If you host the backend separately (e.g. Render), paste its URL here (e.g. <code>https://your-backend.onrender.com</code>). Leave blank to use this site's built-in API.</p>
          <input value={form.api_base_url} onChange={set('api_base_url')} placeholder="https://your-backend.onrender.com" />

          <div className="modal-actions">
            <button className="btn primary">💾 Save settings</button>
          </div>
        </form>
      </div>
    </div>
  );
}