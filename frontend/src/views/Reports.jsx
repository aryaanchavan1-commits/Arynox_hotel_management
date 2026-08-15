import React, { useEffect, useState } from 'react';
import { get } from '../api.js';
import { toCsv, downloadCsv } from '../lib/csv.js';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

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
        <h1>📈 Reports</h1>
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
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', margin: '16px 0' }}>
          <div className="stat-card" style={{ background: '#4f46e5' }}><div className="num">{s.occupancy}%</div><div className="lbl">Occupancy</div></div>
          <div className="stat-card" style={{ background: '#16a34a' }}><div className="num">{fmt(s.revenueToday)}</div><div className="lbl">Today's revenue</div></div>
          <div className="stat-card" style={{ background: '#d97706' }}><div className="num">{s.billsToday}</div><div className="lbl">Bills today</div></div>
          <div className="stat-card" style={{ background: '#0891b2' }}><div className="num">{s.occupiedRooms}/{s.totalRooms}</div><div className="lbl">Rooms occupied</div></div>
          <div className="stat-card" style={{ background: '#7c3aed' }}><div className="num">{s.totalGuests}</div><div className="lbl">Total guests</div></div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <div className="card">
          <h3>Revenue — last {days} days</h3>
          <div className="bars">
            {daily.map((d) => (
              <div key={d.date} className="bar">
                <div className="fill" style={{ height: `${(d.revenue / max) * 100}%`, background: d.revenue ? '#6366f1' : '#e2e4ef' }} title={fmt(d.revenue)} />
                <span>{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>Total: <b>{fmt(daily.reduce((x, d) => x + d.revenue, 0))}</b></p>
        </div>
        <div className="card">
          <h3>Occupancy by room type</h3>
          <table>
            <thead><tr><th>Type</th><th>Occupied</th><th>Total</th><th>%</th></tr></thead>
            <tbody>
              {occ.map((o) => (
                <tr key={o.name}>
                  <td>{o.name}</td><td>{o.occupied}</td><td>{o.total}</td>
                  <td>{o.total ? Math.round((o.occupied / o.total) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {s?.revenueByType?.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Today's revenue by source</h3>
          <table>
            <thead><tr><th>Type</th><th>Bills</th><th>Revenue</th></tr></thead>
            <tbody>
              {s.revenueByType.map((r) => (
                <tr key={r.type}><td>{r.type}</td><td>{r.count}</td><td>{fmt(r.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Recent bills (30 days)</h3>
        <table>
          <thead><tr><th>ID</th><th>Type</th><th>Guest</th><th>Items</th><th>Total</th><th>Method</th><th>Date</th></tr></thead>
          <tbody>
            {bills.slice(0, 50).map((b) => (
              <tr key={b.id}>
                <td>#{b.id}</td><td>{b.type}</td><td>{b.guest_name}</td>
                <td style={{ fontSize: 12 }}>{(b.items || []).map((i) => `${i.name}×${i.qty}`).join(', ')}</td>
                <td>{fmt(b.total)}</td><td>{b.payment_method}</td>
                <td style={{ fontSize: 12 }}>{b.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}