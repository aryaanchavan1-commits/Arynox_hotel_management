import React, { useEffect, useState } from 'react';
import { get } from '../api.js';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    get('/reports/summary').then(setS).catch(() => {});
    get('/bookings').then((b) => setBookings(b.slice(0, 6))).catch(() => {});
  }, []);

  const cards = [
    ['#4f46e5', 'Occupancy', s ? s.occupancy + '%' : '—'],
    ['#16a34a', "Today's Revenue", s ? fmt(s.revenueToday) : '—'],
    ['#d97706', 'Checked In', s ? s.checkedIn : '—'],
    ['#0891b2', 'Available Rooms', s ? s.totalRooms - s.occupiedRooms : '—'],
  ];

  return (
    <div>
      <div className="between">
        <h1>📊 Dashboard</h1>
        <a href="#/assistant" className="btn">🤖 Ask AI Assistant</a>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', margin: '16px 0' }}>
        {cards.map(([c, l, v]) => (
          <div key={l} className="stat-card" style={{ background: c }}>
            <div className="num">{v}</div>
            <div className="lbl">{l}</div>
          </div>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <a href="#/bookings" className="btn primary">➕ New Booking</a>
        <a href="#/pos" className="btn">⚡ Quick POS</a>
        <a href="#/restaurant" className="btn">🍽️ Restaurant</a>
      </div>
      <div className="card">
        <h3>Recent bookings</h3>
        <table>
          <thead><tr><th>ID</th><th>Guest</th><th>Room</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Total</th></tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>#{b.id}</td><td>{b.guest_name}</td><td>{b.room_number}</td>
                <td>{b.check_in}</td><td>{b.check_out}</td>
                <td><span className={'badge ' + b.status}>{b.status}</span></td>
                <td>{fmt(b.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}