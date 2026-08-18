import React, { useState } from 'react';

const FALLBACKS = [
  { match: /standard/i, url: '/images/hotel/room-deluxe.jpg' },
  { match: /deluxe/i, url: '/images/hotel/room-balcony.jpg' },
  { match: /suite/i, url: '/images/hotel/room-superdeluxe.jpg' },
  { match: /presidential/i, url: '/images/hotel/facade.jpg' },
];

export default function RoomCard({ room, currency }) {
  const [imgErr, setImgErr] = useState(false);
  const src = room.image || (FALLBACKS.find((f) => f.match.test(room.name || '')) || {}).url || '';
  return (
    <div className="room-card-public">
      <div className="img" style={{ background: 'linear-gradient(135deg, #038C7F, #026057)' }}>
        {src && !imgErr
          ? <img src={src} alt={room.name} loading="lazy" className="room-card-img" onError={() => setImgErr(true)} />
          : <span style={{ fontSize: 40, opacity: 0.9 }}>🛏️</span>}
      </div>
      <div className="body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <div className="name">{room.name}</div>
          <div className="price">{currency || '₹'}{room.price}</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{room.capacity || 2} Guest · Per Night</div>
        <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.55 }}>{room.description || ''}</div>
        <div className="amenities">{(room.amenities || []).slice(0, 4).map((a) => <span key={a}>{a}</span>)}</div>
        {room.freeCount !== undefined && (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{room.freeCount} room(s) free for these dates</div>
        )}
        {room.total !== undefined && (
          <div className="price">Total: {currency || '₹'}{room.total} <small style={{ color: 'var(--muted)', fontWeight: 400 }}>({room.nights} nights)</small></div>
        )}
        <div className="card-foot">
          <a className="hm-book-btn" href={`#/booking?type=${room.id}`}>BOOK NOW</a>
        </div>
      </div>
    </div>
  );
}