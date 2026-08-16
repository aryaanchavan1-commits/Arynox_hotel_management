import React, { useEffect, useState } from 'react';
import { get } from '../api.js';
import { useToast } from '../components/Toast.jsx';

const fmt = (cur, n) => (cur || '₹') + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [webNotes, setWebNotes] = useState([]);
  const [seen, setSeen] = useState(new Set());
  const toast = useToast();

  const [firstLoad, setFirstLoad] = useState(true);

  const load = () => {
    get('/reports/summary').then(setS).catch(() => {});
    get('/bookings').then((b) => setBookings(b.slice(0, 6))).catch(() => {});
    get('/reports/web-bookings').then((w) => {
      const arr = (w.bookings || []).slice(0, 3);
      setWebNotes(arr);
      if (firstLoad) {
        arr.forEach((b) => setSeen((p) => new Set([...p, b.id])));
        setFirstLoad(false);
        return;
      }
      arr.forEach((b) => {
        if (!seen.has(b.id)) {
          setSeen((p) => new Set([...p, b.id]));
          toast.info(`New web booking #${b.reference} — confirm in Bookings.`);
        }
      });
    }).catch(() => {});
    get('/channel-bookings').then((cb) => {
      const fresh = (cb || []).filter((b) => b.status === 'pending');
      fresh.forEach((b) => {
        if (!seen.has('ch-' + b.id)) {
          setSeen((p) => new Set([...p, 'ch-' + b.id]));
          toast.info(`OTA booking ${b.channel_ref} (${b.guest_name}) from ${b.channel} — confirm in Channel Manager.`);
        }
      });
    }).catch(() => {});
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 45000);
    return () => clearInterval(t);
  }, []);

  const cards = [
    ['📊', 'Occupancy', s ? s.occupancy + '%' : '—', 'occupancy'],
    ['💰', "Today's Revenue", s ? fmt(s.currency_symbol, s.revenueToday) : '—', 'revenue'],
    ['✅', 'Checked In', s ? s.checkedIn : '—', 'info'],
    ['🚪', 'Available Rooms', s ? s.totalRooms - s.occupiedRooms : '—', 'info'],
    ['🕐', 'Pending Bookings', s ? s.pendingBookings : '—', 'warn'],
    ['🌐', 'New Web Bookings', s ? s.newWebBookings : '—', 'ok'],
    ['📡', 'Channel Bookings', s ? s.channelBookings : '—', 'ok'],
    ['💳', 'Unpaid Bookings', s ? s.unpaidBookings : '—', 'warn'],
    ['🍽️', 'Open Restaurant Orders', s ? s.openOrders : '—', 'info'],
    ['🧹', 'Housekeeping Tasks', s ? s.hkTasksPending : '—', 'info'],
  ];

  return (
    <div>
      <div className="between">
        <div>
          <h1>Dashboard</h1>
          <p className="sub">Hotel Lakshmi Deluxe · overview of today's operations</p>
        </div>
        <div className="row">
          <a href="#/bookings" className="btn primary">➕ New Booking</a>
          <a href="#/pos" className="btn">⚡ Quick POS</a>
          <a href="#/assistant" className="btn">🤖 AI Assistant</a>
        </div>
      </div>
      <div className="kpi-grid">
        {cards.map(([icon, label, value, tone]) => (
          <div key={label} className={`kpi-card ${tone}`}>
            <div className="kpi-top">
              <p className="kpi-label">{label}</p>
              <span className="kpi-icon">{icon}</span>
            </div>
            <p className="kpi-value">{value}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="between"><h3>Recent bookings</h3><a href="#/bookings" className="btn sm">View all</a></div>
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

      {webNotes.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="between"><h3>🔔 New web bookings</h3><a href="#/bookings" className="btn">View all</a></div>
          <table>
            <thead><tr><th>Ref</th><th>Guest</th><th>Room</th><th>Check-in</th><th>Check-out</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {webNotes.map((b) => (
                <tr key={b.id}>
                  <td>{b.reference}</td><td>{b.guest_name}</td><td>{b.room_number || b.room_type}</td>
                  <td>{b.check_in}</td><td>{b.check_out}</td>
                  <td>{fmt(s ? s.currency_symbol : undefined, b.total)}</td>
                  <td><span className={'badge ' + b.status}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="sub" style={{ marginTop: 8, fontSize: 12 }}>These were booked online by guests on the public website. Confirm them in Bookings.</p>
        </div>
      )}
    </div>
  );
}

