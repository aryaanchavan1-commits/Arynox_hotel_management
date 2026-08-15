import React, { useState } from 'react';
import { get } from '../api.js';
import RoomGrid from '../components/RoomGrid.jsx';

export default function Availability() {
  const [grid, setGrid] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [currency, setCurrency] = useState('₹');

  function today(n) {
    const d = new Date(); d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function expandDates(ci, co) {
    const out = []; const cur = new Date(ci);
    while (cur.toISOString().slice(0, 10) <= co) {
      out.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }

  async function search(e) {
    e.preventDefault();
    const ci = e.target.ci.value;
    const co = e.target.co.value;
    if (!ci || !co) return setError('Select both dates');
    if (co <= ci) return setError('Check-out must be after check-in');
    setBusy(true);
    setError('');
    try {
      const [rooms, bookings, s] = await Promise.all([get('/rooms'), get('/bookings'), get('/settings')]);
      setCurrency(s.currency_symbol || '₹');
      setGrid({ rooms, bookings, dates: expandDates(ci, co), ci, co });
    } catch (e2) { setError(e2.message); }
    setBusy(false);
  }

  return (
    <div className="page">
      <div className="page-head"><h1>📅 Room Availability</h1></div>
      <div className="card">
        <form className="row" onSubmit={search}>
          <input type="date" name="ci" defaultValue={today(0)} required style={{ maxWidth: 180 }} />
          <input type="date" name="co" defaultValue={today(5)} required style={{ maxWidth: 180 }} />
          <button className="btn primary" disabled={busy}>{busy ? 'Loading…' : 'Show grid'}</button>
        </form>
        {error && <div className="msg err" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      {grid && (
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>{currency} room × night matrix — {grid.ci} → {grid.co}</h3>
          <RoomGrid
            rooms={grid.rooms}
            dates={grid.dates}
            bookings={grid.bookings}
            onCell={(r, day) => {
              const co = new Date(new Date(day).getTime() + 86400000 * 2).toISOString().slice(0, 10);
              location.hash = `#/bookings?room=${r.id}&ci=${day}&co=${co}`;
            }}
          />
          <p className="sub" style={{ fontSize: 12, marginTop: 8 }}>Tap a free cell to prefill a booking for that room.</p>
        </div>
      )}
    </div>
  );
}