import React, { useEffect, useState } from 'react';
import { get } from '../api.js';
import { toCsv, downloadCsv } from '../lib/csv.js';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const methodIcon = { cash: '💵', card: '💳', upi: '📱', credit: '🧾', online: '🌐' };
const typeIcon = { booking: '🛏️', restaurant: '🍽️', pos: '🧾', venue: '🎉' };

export default function Reports() {
  const [s, setS] = useState(null);
  const [daily, setDaily] = useState([]);
  const [occ, setOcc] = useState([]);
  const [bills, setBills] = useState([]);
  const [days, setDays] = useState(7);

  useEffect(() => {
    get('/reports/summary').then(setS).catch(() => {});
    get(`/reports/daily?days=${days}`).then(setDaily).catch(() => {});
    get('/reports/occupancy').then(setOcc).catch(() => {});
    get('/reports/bills?days=30').then(setBills).catch(() => {});
  }, [days]);

  const max = Math.max(1, ...daily.map((d) => d.revenue));
  const totalRevenue = daily.reduce((x, d) => x + d.revenue, 0);

  function exportBills() {
    const rows = bills.map((b) => ({
      id: b.id, type: b.type, guest: b.guest_name, items: (b.items || []).map((i) => `${i.name}×${i.qty}`).join(' | '),
      subtotal: b.subtotal, tax: b.tax, total: b.total, method: b.payment_method, date: b.created_at,
    }));
    downloadCsv('arynox-bills.csv', toCsv(rows, ['id', 'type', 'guest', 'items', 'subtotal', 'tax', 'total', 'method', 'date']));
  }
  function exportDaily() {
    downloadCsv('arynox-revenue.csv', toCsv(daily, ['date', 'revenue', 'bills']));
  }

  return (
    <div>
      <div className="between">
        <div>
          <h1>📈 Sales & Revenue</h1>
          <p className="sub">Live performance, occupancy and billing analytics</p>
        </div>
        <div className="row">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: 110 }}>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
          <button className="btn" onClick={exportDaily}>⬇ Revenue CSV</button>
          <button className="btn" onClick={exportBills}>⬇ Bills CSV</button>
        </div>
      </div>

      {s && (
        <div className="kpi-grid">
          <div className="kpi-card"><div className="kpi-top"><div className="kpi-label">Today's revenue</div><div className="kpi-icon">💰</div></div><div className="kpi-value">{fmt(s.revenueToday)}</div></div>
          <div className="kpi-card ok"><div className="kpi-top"><div className="kpi-label">Occupancy today</div><div className="kpi-icon">📊</div></div><div className="kpi-value">{s.occupancy}%</div></div>
          <div className="kpi-card warn"><div className="kpi-top"><div className="kpi-label">Bills today</div><div className="kpi-icon">🧾</div></div><div className="kpi-value">{s.billsToday}</div></div>
          <div className="kpi-card"><div className="kpi-top"><div className="kpi-label">Rooms occupied</div><div className="kpi-icon">🛏️</div></div><div className="kpi-value">{s.occupiedRooms}<span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}> / {s.totalRooms}</span></div></div>
          <div className="kpi-card"><div className="kpi-top"><div className="kpi-label">Total guests</div><div className="kpi-icon">👥</div></div><div className="kpi-value">{s.totalGuests}</div></div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <div className="card">
          <div className="between">
            <h3>Revenue — last {days} days</h3>
            <b style={{ color: 'var(--primary)' }}>{fmt(totalRevenue)}</b>
          </div>
          <div className="bars">
            {daily.map((d) => (
              <div key={d.date} className="bar">
                <div className="fill" style={{ height: `${(d.revenue / max) * 100}%`, background: d.revenue ? 'linear-gradient(180deg, #06bdb4, #00a692)' : '#e2e4ef' }} title={fmt(d.revenue)} />
                <span>{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Occupancy by room type</h3>
          {occ.map((o) => {
            const pct = o.total ? Math.round((o.occupied / o.total) * 100) : 0;
            return (
              <div key={o.name} style={{ marginBottom: 14 }}>
                <div className="between" style={{ fontSize: 13 }}>
                  <span>{o.name}</span>
                  <span style={{ color: 'var(--muted)' }}>{o.occupied}/{o.total} · <b style={{ color: 'var(--primary)' }}>{pct}%</b></span>
                </div>
                <div style={{ height: 8, borderRadius: 6, background: 'var(--line)', overflow: 'hidden', marginTop: 6 }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 6, background: pct > 80 ? 'linear-gradient(90deg, #f2641b, #f59e0b)' : 'linear-gradient(90deg, #06bdb4, #00a692)' }} />
                </div>
              </div>
            );
          })}
          {!occ.length && <div className="empty">No occupancy data yet.</div>}
        </div>
      </div>

      {s?.revenueByType?.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Today's revenue by source</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginTop: 12 }}>
            {s.revenueByType.map((r) => (
              <div key={r.type} style={{ background: 'var(--bg-2, #fafbfd)', border: '1px solid var(--line)', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 22 }}>{typeIcon[r.type] || '🧾'} <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{r.type}</span></div>
                <div style={{ fontWeight: 800, fontSize: 18, marginTop: 6 }}>{fmt(r.revenue)}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.count} bill{r.count === 1 ? '' : 's'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Recent bills (30 days)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>ID</th><th>Type</th><th>Guest</th><th>Items</th><th>Total</th><th>Method</th><th>Date</th></tr></thead>
            <tbody>
              {bills.slice(0, 50).map((b) => (
                <tr key={b.id}>
                  <td><b>#{b.id}</b></td>
                  <td>{typeIcon[b.type] || ''} {b.type}</td>
                  <td>{b.guest_name}</td>
                  <td style={{ fontSize: 12 }}>{(b.items || []).map((i) => `${i.name}×${i.qty}`).join(', ')}</td>
                  <td><b>{fmt(b.total)}</b></td>
                  <td><span className="badge open">{methodIcon[b.payment_method] || ''} {b.payment_method}</span></td>
                  <td style={{ fontSize: 12 }}>{b.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!bills.length && <div className="empty">No bills in the last 30 days.</div>}
      </div>
    </div>
  );
}
