import React, { useEffect, useState } from 'react';
import { get, post } from '../api.js';

const CHANNEL_EMOJI = { bookingcom: '🅱️', goibibo: '🇮🇳', makemytrip: '✈️', agoda: '🅰️', expedia: '🌐', airbnb: '🏠', cleartrip: '🚆', paytm: '📱', direct: '🔗' };

function dayName(ds) {
  const d = new Date(ds + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function OtaOps() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(7);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [form, setForm] = useState({ channel: 'bookingcom', guest_name: '', phone: '', room_type_id: '', check_in: new Date().toISOString().slice(0, 10), nights: 1, adults: 2 });
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(null);

  const load = () => get('/ota-ops?days=' + days).then(setData).catch((e) => setError(e.message));

  useEffect(() => { load(); }, [days]);

  const safeData = () => {
    const d = data || {};
    const horizon = Array.isArray(d.horizon) ? d.horizon : [];
    const todayRows = Array.isArray(d.todayRows) ? d.todayRows : [];
    const counts = d.channelCounts && typeof d.channelCounts === 'object' && !Array.isArray(d.channelCounts) ? d.channelCounts : {};
    const t = horizon[0] || { date: d.today || new Date().toISOString().slice(0, 10), occupancy: 0, arrivals: 0, departures: 0, perType: [] };
    return { horizon, todayRows, counts, t };
  };

  const punchSummary = () => {
    if (!data) return '';
    const { t } = safeData();
    const lines = [`📋 OTA UPDATE — ${dayName(t.date)}`, ''];
    for (const p of t.perType) {
      lines.push(`${p.name}: ${p.free} free / ${p.total} (₹${p.rate}/night)`);
    }
    lines.push('', 'Update Booking.com / Goibibo / MMT extranets (or Staah) with these counts.');
    return lines.join('\n');
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(punchSummary());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const aiSummary = async () => {
    setAiBusy(true);
    setAiMsg('');
    const { t, counts } = safeData();
    const payload = punchSummary() + '\nOccupancy today: ' + t.occupancy + '%. Arrivals: ' + t.arrivals + ', departures: ' + t.departures + '. Tonight in-house: ' + JSON.stringify(counts) + '.';
    try {
      const r = await post('/ai/chat', { message: 'You are the hotel ops assistant. Using ONLY this data, write a 3-line briefing for the owner about tonight and tomorrow, and flag any risk (e.g., sold out type) and what to update on OTA extranets. Data: ' + payload });
      setAiMsg(r.reply || 'No reply.');
    } catch (e) {
      setAiMsg('AI error: ' + e.message);
    }
    setAiBusy(false);
  };

  const addOtaBooking = async (e) => {
    e.preventDefault();
    setBusy(true);
    setAdded(null);
    try {
      const ci = form.check_in;
      const co = new Date(new Date(ci + 'T12:00:00').getTime() + Number(form.nights) * 86400000).toISOString().slice(0, 10);
      const guest = await post('/guests', { name: form.guest_name, phone: form.phone });
      const b = await post('/bookings', {
        guest_id: guest.id,
        room_type_id: Number(form.room_type_id),
        check_in: ci,
        check_out: co,
        adults: Number(form.adults) || 2,
        status: 'pending',
        source: 'channel',
        channel: form.channel,
        channel_ref: form.channel.toUpperCase().slice(0, 8) + '-' + Date.now().toString().slice(-6),
      });
      setAdded({ ref: b.reference, room_id: b.room_id });
      setForm({ ...form, guest_name: '', phone: '' });
      load();
    } catch (err) {
      setAdded(null);
      setError(err.message);
    }
    setBusy(false);
  };

  if (!data) return <div className="page"><div className="page-head"><h1>🌐 OTA Daily Ops</h1></div><div className="card"><p className="sub">Loading…</p></div></div>;
  if (data.error) return <div className="page"><div className="page-head"><h1>🌐 OTA Daily Ops</h1></div><div className="msg err" style={{ marginTop: 12 }}>{data.error}</div></div>;

  const { horizon, todayRows, counts, t } = safeData();
  const arrivals = todayRows.filter((b) => b.check_in === data.today && b.status !== 'checked_in');
  const departures = todayRows.filter((b) => b.check_out === data.today);

  return (
    <div className="page">
      <div className="between">
        <div>
          <h1>🌐 OTA Daily Ops</h1>
          <p className="sub">Bridge between your ERP and OTA extranets / channel manager · source of truth = ERP rooms</p>
        </div>
        <div className="row">
          <a href="#/channels" className="btn">📡 Channel Manager</a>
          <button className="btn primary" onClick={copySummary}>{copied ? '✓ Copied' : '📋 Copy OTA update'}</button>
        </div>
      </div>
      {error && <div className="msg err" style={{ marginTop: 12 }}>{error}</div>}

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <div className="kpi-card info"><div className="kpi-top"><p className="kpi-label">Tonight</p><span className="kpi-icon">🌙</span></div><p className="kpi-value">{t.occupancy}%</p></div>
        <div className="kpi-card ok"><div className="kpi-top"><p className="kpi-label">Arrivals</p><span className="kpi-icon">🛬</span></div><p className="kpi-value">{t.arrivals}</p></div>
        <div className="kpi-card warn"><div className="kpi-top"><p className="kpi-label">Departures</p><span className="kpi-icon">🚪</span></div><p className="kpi-value">{t.departures}</p></div>
        <div className="kpi-card info"><div className="kpi-top"><p className="kpi-label">In-house</p><span className="kpi-icon">🛏️</span></div><p className="kpi-value">{Object.values(counts).reduce((a, b) => a + b, 0)}</p></div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="between">
          <h3>📦 Availability to punch into OTAs</h3>
          <div className="row">
            {[7, 14, 30].map((d) => <button key={d} className={`btn sm${days === d ? ' primary' : ''}`} onClick={() => setDays(d)}>{d}d</button>)}
          </div>
        </div>
        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Room type</th>
                {horizon.map((h) => <th key={h.date}>{dayName(h.date)}</th>)}
              </tr>
            </thead>
            <tbody>
              {t.perType.map((pt) => (
                <tr key={pt.type_id}>
                  <td><b>{pt.name}</b> <small style={{ color: 'var(--muted)' }}>₹{pt.rate}</small></td>
                  {horizon.map((h) => {
                    const p = h.perType.find((x) => x.type_id === pt.type_id);
                    const tone = p.free === 0 ? '#e05252' : p.free <= Math.ceil(p.total / 4) ? '#d9a20f' : '#179e63';
                    return <td key={h.date} style={{ textAlign: 'center', color: tone, fontWeight: 700, whiteSpace: 'nowrap' }}>{p.free}/{p.total}</td>;
                  })}
                </tr>
              ))}
              <tr>
                <td><b>Arr / Dep</b></td>
                {horizon.map((h) => <td key={h.date} style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>▲{h.arrivals} ▼{h.departures}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="sub" style={{ marginTop: 10 }}>Green = has free rooms · amber = ¼ or fewer left · red = sold out. Punch these counts into Booking.com / Goibibo / MMT extranets (or Staah). Copy button gives the text for the daily update.</p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="between">
          <h3>🛬 Today — arrivals ({arrivals.length}) · 🚪 departures ({departures.length})</h3>
        </div>
        {todayRows.length === 0 ? <p className="sub" style={{ marginTop: 8 }}>Nothing arriving or departing today.</p> : (
          <table className="table">
            <thead><tr><th>Guest</th><th>Room</th><th>Type</th><th>Channel</th><th>Status</th></tr></thead>
            <tbody>
              {todayRows.map((b) => (
                <tr key={b.id}>
                  <td>{b.guest_name}<br /><small style={{ color: 'var(--muted)' }}>{b.phone}</small></td>
                  <td>{b.room_number}</td>
                  <td>{b.room_type}</td>
                  <td>{b.channel || 'Direct'} <span style={{ fontSize: 12 }}>{CHANNEL_EMOJI[b.channel] || ''}</span></td>
                  <td>{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <h3>➕ Quick-add OTA booking</h3>
          <p className="sub" style={{ marginTop: 4 }}>Came in on an OTA extranet? Type it here — ERP picks the room automatically.</p>
          <form onSubmit={addOtaBooking} style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <select style={{ flex: 1, minWidth: 140 }} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                {['bookingcom', 'goibibo', 'makemytrip', 'agoda', 'expedia', 'cleartrip', 'paytm', 'direct'].map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
              </select>
              <select style={{ flex: 1, minWidth: 140 }} value={form.room_type_id} onChange={(e) => setForm({ ...form, room_type_id: e.target.value })} required>
                <option value="">Room type…</option>
                {t.perType.map((p) => <option key={p.type_id} value={p.type_id} disabled={p.free === 0}>{p.name} ({p.free} free)</option>)}
              </select>
            </div>
            <input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} placeholder="Guest name" required />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <input type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} required style={{ flex: 1, minWidth: 120 }} />
              <input type="number" min="1" max="30" value={form.nights} onChange={(e) => setForm({ ...form, nights: e.target.value })} title="Nights" style={{ width: 80 }} />
              <input type="number" min="1" max="10" value={form.adults} onChange={(e) => setForm({ ...form, adults: e.target.value })} title="Adults" style={{ width: 80 }} />
              <button className="btn primary" disabled={busy}>{busy ? 'Adding…' : 'Add booking'}</button>
            </div>
            {added && <div className="msg ok">✓ Added {added.ref} — room {added.room_id} · pending · confirm in Bookings</div>}
          </form>
        </div>
        <div className="card">
          <div className="between">
            <h3>🤖 AI briefing</h3>
            <button className="btn sm" onClick={aiSummary} disabled={aiBusy}>{aiBusy ? 'Thinking…' : 'Generate'}</button>
          </div>
          <p className="sub" style={{ marginTop: 4 }}>Uses live occupancy data — flags sold-out types and what to update.</p>
          {aiMsg && <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'rgba(6,189,180,.08)', border: '1px solid rgba(6,189,180,.25)', fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{aiMsg}</div>}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>📡 Channel status</h3>
        <p className="sub" style={{ marginTop: 4 }}>Practice mode = simulated · live only after real OTA credentials (partner-certified integrations).</p>
        <div className="row" style={{ flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          {(data.channels || []).map((c) => (
            <span key={c.code} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12.5, background: c.enabled ? 'rgba(6,189,180,.12)' : 'rgba(128,128,128,.12)', border: `1px solid ${c.enabled ? 'rgba(6,189,180,.4)' : 'rgba(128,128,128,.3)'}`, color: c.enabled ? '#06bdb4' : '#888' }}>
              {CHANNEL_EMOJI[c.code] || ''} {c.name} · {c.practice ? 'practice' : 'LIVE'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
