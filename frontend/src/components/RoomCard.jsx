import React from 'react';

export default function RoomCard({ room, currency }) {
  return (
    <div className="room-card-public flip-card">
      <div className="flip-inner">
        <div className="flip-face flip-front">
          <div className="img">🛏️</div>
          <div className="name">{room.name}</div>
          <div className="price">{currency || '₹'}{room.price} <small>/ night</small></div>
          <div className="flip-hint">ⓘ Hover for details</div>
        </div>
        <div className="flip-face flip-back">
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>{room.description}</div>
          <div className="amenities">{(room.amenities || []).map((a) => <span key={a}>{a}</span>)}</div>
          {room.freeCount !== undefined && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Up to {room.capacity} guests · {room.freeCount} free</div>
          )}
          {room.total !== undefined && (
            <div className="price" style={{ marginTop: 8 }}>
              Total: {currency || '₹'}{room.total} <small>({room.nights} nights)</small>
            </div>
          )}
          <a className="btn primary" style={{ textAlign: 'center', marginTop: 'auto' }} href={`#/booking?type=${room.id}`}>Book this room</a>
        </div>
      </div>
    </div>
  );
}
