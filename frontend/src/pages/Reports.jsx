import React, { useEffect, useState } from 'react';
import { get } from '../api.js';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function Reports() {
  const [s, setS] = useState(null);
  const [daily, setDaily] = useState([]);
  const [occ, setOcc] = useState([]);

  useEffect(() => {
    get('/reports/summary').then(setS).catch(() => {});
    get('/reports/daily?days=7').then(setDaily).catch(() => {});
    get('/reports/occupancy').then(setOcc).catch(() => {});
  }, []);

  const max = Math.max(1, ...daily.map((d) => d.revenue));

  return (
    <div>
      <h1>📈 Reports</h1>
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
          <h3>Revenue — last 7 days</h3>
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
    </div>
  );
}