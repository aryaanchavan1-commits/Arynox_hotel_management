import React from 'react';

export default function RoomCard({ room, currency }) {
  return (
    <div className="room-card-public">
      <div className="img">🛏️</div>
      <div className="body">
        <div className="name">{room.name}</div>
        <div className="price">{currency || '₹'}{room.price} <small>/ night</small></div>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>{room.description}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          Up to {room.capacity} guests {room.freeCount !== undefined && <span> · {room.freeCount} free</span>}
        </div>
        <div className="amenities">{(room.amenities || []).map((a) => <span key={a}>{a}</span>)}</div>
        {room.total !== undefined && (
          <div className="price" style={{ marginTop: 4 }}>
            Total: {currency || '₹'}{room.total} <small>({room.nights} nights)</small>
          </div>
        )}
        <a className="btn primary" style={{ textAlign: 'center', marginTop: 'auto' }} href={`#/booking?type=${room.id}`}>Book this room</a>
      </div>
    </div>
  );
}