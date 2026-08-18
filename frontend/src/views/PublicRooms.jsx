import React, { useEffect, useState } from 'react';
import { get } from '../api.js';
import RoomCard from '../components/RoomCard.jsx';

export default function PublicRooms() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    get('/public/hotels').then(setData).catch((e) => setError(e.message));
  }, []);

  const s = data?.settings || {};
  const types = data?.roomTypes || [];

  async function search(e) {
    e.preventDefault();
    const ci = e.target.ci.value;
    const co = e.target.co.value;
    const adults = e.target.adults.value || 2;
    if (!ci || !co) return setError('Select both dates');
    setSearching(true);
    setError('');
    try {
      const r = await get(`/availability?check_in=${ci}&check_out=${co}&adults=${adults}`);
      setResults(r);
    } catch (e2) { setError(e2.message); }
    setSearching(false);
  }

  return (
    <>
      <section className="public-section" style={{ marginTop: 8 }}>
        <h2>Rooms &amp; Suites</h2>
        <p className="sub">Check availability for your dates</p>
        {error && <div className="msg err">{error}</div>}
        <form className="public-search" onSubmit={search}>
          <div><label>Check-in</label><input type="date" name="ci" required /></div>
          <div><label>Check-out</label><input type="date" name="co" required /></div>
          <div><label>Guests</label><select name="adults" defaultValue="2">
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>)}
            <option value="7">7+ Guests</option>
          </select></div>
          <button className="btn primary" disabled={searching}>{searching ? 'Checking…' : 'Check availability'}</button>
        </form>
      </section>

      <section className="public-section">
        <div className="room-cards">
          {results
            ? results.roomTypes.filter((t) => t.freeCount > 0).map((t) => <RoomCard key={t.id} room={{ ...t, nights: results.nights }} currency={s.currency_symbol} />)
            : types.map((t) => <RoomCard key={t.id} room={t} currency={s.currency_symbol} />)}
        </div>
        {results && results.roomTypes.every((t) => t.freeCount === 0) && (
          <div className="empty">No rooms available for the selected dates.</div>
        )}
      </section>
    </>
  );
}