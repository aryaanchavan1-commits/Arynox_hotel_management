import React, { useEffect, useMemo, useRef, useState } from 'react';
import { get } from '../api.js';

const CATS = {
  rooms: { label: 'Rooms', icon: '🚪', route: 'rooms', fields: ['number', 'type_name', 'status', 'hk_status', 'floor'] },
  'room-types': { label: 'Room Types', icon: '🛏️', route: 'rooms', fields: ['name', 'description', 'amenities', 'price'] },
  bookings: { label: 'Bookings', icon: '🗓️', route: 'bookings', fields: ['reference', 'guest_name', 'guest_phone', 'room_number', 'room_type', 'status', 'check_in', 'check_out', 'source'] },
  guests: { label: 'Guests', icon: '👥', route: 'guests', fields: ['name', 'phone', 'email', 'id_number', 'address', 'id_type'] },
  menu: { label: 'Menu', icon: '🍽️', route: 'restaurant', fields: ['name', 'category'] },
  orders: { label: 'Orders', icon: '🧾', route: 'restaurant', fields: ['reference', 'guest_name', 'status', 'order_type', 'table_no', 'total'] },
  bills: { label: 'Bills', icon: '💳', route: 'pos', fields: ['reference', 'status', 'method', 'total'] },
  housekeeping: { label: 'Housekeeping', icon: '🧹', route: 'housekeeping', fields: ['task', 'status', 'assigned_to', 'room_number', 'priority'] },
  venues: { label: 'Venues', icon: '🎪', route: 'venue', fields: ['name', 'description', 'capacity'] },
  'venue-bookings': { label: 'Venue Bookings', icon: '🎉', route: 'venue', fields: ['name', 'phone', 'event_type', 'venue_name', 'date', 'status', 'reference'] },
  'channel-bookings': { label: 'OTA Bookings', icon: '📡', route: 'channels', fields: ['guest_name', 'guest_phone', 'room_number', 'room_type', 'channel', 'channel_ref', 'status'] },
  tables: { label: 'Tables', icon: '🪑', route: 'restaurant', fields: ['number', 'seats', 'status'] },
  users: { label: 'Users', icon: '🔐', route: 'users', fields: ['username', 'name', 'role'] },
};

const LOADERS = {
  rooms: () => get('/rooms'),
  'room-types': () => get('/room-types'),
  bookings: () => get('/bookings'),
  guests: () => get('/guests'),
  menu: () => get('/menu'),
  orders: () => get('/orders'),
  bills: () => get('/bills'),
  housekeeping: () => get('/housekeeping'),
  venues: () => get('/venues'),
  'venue-bookings': () => get('/venue-bookings'),
  'channel-bookings': () => get('/channel-bookings'),
  tables: () => get('/tables'),
  users: () => get('/users'),
};

function matches(row, fields, q) {
  for (const f of fields) {
    const v = row?.[f];
    if (v !== undefined && v !== null && String(v).toLowerCase().includes(q)) return true;
  }
  return false;
}

function title(row, fields) {
  return fields.map((f) => (row?.[f] !== undefined && row?.[f] !== null && String(row[f]).trim() !== '' ? String(row[f]) : null))
    .filter(Boolean).slice(0, 4).join(' · ');
}

const STATUS_COLORS = {
  confirmed: '#0d9488', cancelled: '#dc2626', checked_in: '#2563eb', checked_out: '#6b7280',
  occupied: '#2563eb', available: '#0d9488', clean: '#0d9488', dirty: '#dc2626', cleaning: '#f59e0b',
  open: '#f59e0b', kot: '#f59e0b', paid: '#0d9488', pending: '#f59e0b', free: '#0d9488', reserved: '#2563eb',
};

export default function Search() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    (async () => {
      try {
        const results = await Promise.all(Object.entries(LOADERS).map(async ([key, fn]) => [key, (await fn()) || []]));
        setData(Object.fromEntries(results));
      } catch (e) {
        setError(e.message || 'Could not load search data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const query = q.trim().toLowerCase();

  const counts = useMemo(() => {
    if (!query) return {};
    const out = {};
    for (const [key, catDef] of Object.entries(CATS)) {
      out[key] = (data[key] || []).filter((r) => matches(r, catDef.fields, query)).length;
    }
    return out;
  }, [query, data]);

  const results = useMemo(() => {
    if (!query) return [];
    const out = [];
    for (const [key, catDef] of Object.entries(CATS)) {
      if (cat !== 'all' && key !== cat) continue;
      const hits = (data[key] || []).filter((r) => matches(r, catDef.fields, query));
      if (hits.length) out.push({ key, ...catDef, hits });
    }
    return out;
  }, [query, cat, data]);

  const totalHits = results.reduce((a, g) => a + g.hits.length, 0);

  return (
    <div className="search-view">
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>🔍 Global Search</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Search across rooms, bookings, guests, menu, orders, bills &amp; more</p>
        </div>
        <div className="search-box" style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, padding: '6px 12px', minWidth: 300 }}>
          <span>🔎</span>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search anything… e.g. guest name, room 101, reference"
            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: 14, color: 'inherit' }}
          />
          {q && <button onClick={() => setQ('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>}
        </div>
      </div>

      <div className="cat-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '16px 0' }}>
        <button className={`chip ${cat === 'all' ? 'chip-on' : ''}`} onClick={() => setCat('all')} style={chipStyle(cat === 'all')}>
          All {query ? `(${totalHits})` : ''}
        </button>
        {Object.entries(CATS).map(([key, c]) => (
          <button key={key} onClick={() => setCat(key)} style={chipStyle(cat === key)} className="chip">
            {c.icon} {c.label} {query ? `(${counts[key] || 0})` : ''}
          </button>
        ))}
      </div>

      {error && <div className="msg err">{error}</div>}

      {loading && <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>Loading all modules…</div>}

      {!loading && query && results.length === 0 && (
        <div className="empty" style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
          No results for “{q}” {cat !== 'all' ? `in ${CATS[cat].label}` : 'in any module'}
        </div>
      )}

      {!loading && !query && (
        <div className="empty" style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
          Type to search across every module — rooms, room types, bookings, guests, menu, orders, bills, housekeeping, venues, OTA bookings, tables and users.
        </div>
      )}

      {!loading && query && results.map((g) => (
        <div key={g.key} className="srch-group" style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eef0f8)', borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
          <div className="srch-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--card-head, #f8fafc)', borderBottom: '1px solid var(--border, #eef0f8)' }}>
            <b>{g.icon} {g.label} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({g.hits.length})</span></b>
            <a href={`#/staff/${g.route}`} style={{ color: 'var(--primary, #0d9488)', fontSize: 13, fontWeight: 600 }}>Open {g.label} →</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1, background: 'var(--border, #eef0f8)' }}>
            {g.hits.map((row, i) => {
              const status = row.status || row.hk_status || '';
              const color = STATUS_COLORS[String(status).toLowerCase()] || 'var(--muted)';
              return (
                <div key={row.id ?? i} style={{ background: 'var(--card-bg, #fff)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title(row, g.fields) || `#${row.id}`}</div>
                    {row.price !== undefined && <div style={{ fontSize: 12, color: 'var(--muted)' }}>₹{Number(row.price).toLocaleString('en-IN')}</div>}
                    {row.total !== undefined && <div style={{ fontSize: 12, color: 'var(--muted)' }}>₹{Number(row.total).toLocaleString('en-IN')}</div>}
                  </div>
                  {status && <span className="srch-status" style={{ fontSize: 11, fontWeight: 700, color, border: `1px solid ${color}55`, background: `${color}14`, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{status}</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function chipStyle(on) {
  return {
    border: on ? '1px solid var(--primary, #0d9488)' : '1px solid var(--border, #e5e7eb)',
    background: on ? 'var(--primary, #0d9488)' : 'var(--card-bg, #fff)',
    color: on ? '#fff' : 'inherit',
    borderRadius: 999,
    padding: '6px 12px',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
  };
}