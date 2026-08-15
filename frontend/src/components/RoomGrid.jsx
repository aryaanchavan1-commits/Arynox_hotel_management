import React from 'react';

const DAY = 86400000;

function statusClass(status) {
  if (status === 'available') return 'g-avail';
  if (status === 'occupied') return 'g-occ';
  if (status === 'maintenance') return 'g-maint';
  if (status === 'booked') return 'g-book';
  return 'g-book';
}

export default function RoomGrid({ rooms, dates, bookings, onCell }) {
  const start = new Date(dates[0]);
  const nights = dates.length - 1;
  const byRoom = {};
  for (const b of bookings) {
    const ri = Number(b.room_id);
    if (!byRoom[ri]) byRoom[ri] = [];
    byRoom[ri].push(b);
  }
  const cell = (r, i) => {
    const day = new Date(start.getTime() + i * DAY);
    const dayKey = day.toISOString().slice(0, 10);
    const nextKey = new Date(day.getTime() + DAY).toISOString().slice(0, 10);
    const list = byRoom[Number(r.id)] || [];
    let status = 'available';
    for (const b of list) {
      if (['cancelled', 'checked_out'].includes(b.status)) continue;
      if (b.check_in < nextKey && b.check_out > dayKey) {
        status = b.status === 'checked_in' ? 'occupied' : 'booked';
        break;
      }
    }
    if (r.status === 'maintenance') status = 'maintenance';
    return (
      <div key={i} className={`grid-cell ${statusClass(status)}`} onClick={() => onCell && onCell(r, dayKey)} title={`${r.number} ${dayKey}`} />
    );
  };

  return (
    <div className="room-grid-matrix">
      <div className="grid-row grid-head">
        <div className="grid-label">Room</div>
        {dates.slice(0, nights).map((d, i) => <div key={i} className="grid-date">{d.slice(5)}</div>)}
      </div>
      {rooms.map((r) => (
        <div key={r.id} className="grid-row">
          <div className="grid-label"><b>{r.number}</b> <small style={{ color: 'var(--muted)' }}>{r.type_name}</small></div>
          {dates.slice(0, nights).map((d, i) => cell(r, i))}
        </div>
      ))}
      <div className="grid-legend">
        <span><i className="dot g-avail" /> Available</span>
        <span><i className="dot g-book" /> Booked</span>
        <span><i className="dot g-occ" /> Occupied</span>
        <span><i className="dot g-maint" /> Maintenance</span>
      </div>
    </div>
  );
}