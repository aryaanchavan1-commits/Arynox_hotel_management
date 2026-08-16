import React, { useEffect, useState } from 'react';
import { get, post, put } from '../api.js';
import { useToast } from '../components/Toast.jsx';

export default function ChannelManager() {
  const toast = useToast();
  const [channels, setChannels] = useState([]);
  const [logs, setLogs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [syncing, setSyncing] = useState('');
  const [cfg, setCfg] = useState(null);
  const [cfgForm, setCfgForm] = useState({});

  const load = () => {
    get('/channels').then((d) => { setChannels(d.channels || []); setLogs(d.logs || []); }).catch(() => {});
    get('/channel-bookings').then(setBookings).catch(() => {});
    get('/room-types').then(setRoomTypes).catch(() => {});
  };
  useEffect(load, []);

  const toggle = async (ch, key, val) => {
    await put(`/channels/${ch.id}`, { [key]: val });
    toast(`${ch.name}: ${key} ${val ? 'on' : 'off'}`);
    load();
  };

  const syncOne = async (ch) => {
    setSyncing(ch.code);
    try {
      const r = await post(`/channels/${ch.id}/sync`, {});
      const n = r?.pulled?.bookings?.length || 0;
      toast(`Sync ${ch.name}: pushed ${r?.pushed?.payload?.rooms?.length || 0} room types, imported ${n} booking(s)`);
    } catch (e) {
      toast('Sync failed: ' + e.message);
    }
    setSyncing('');
    load();
  };

  const syncAll = async () => {
    setSyncing('all');
    try {
      const r = await post('/channels/sync-all', {});
      toast(`All channels synced (${(r?.results || []).length} enabled)`);
    } catch (e) {
      toast('Sync all failed: ' + e.message);
    }
    setSyncing('');
    load();
  };

  const openCfg = (ch) => {
    setCfg(ch);
    setCfgForm({ rate_multiplier: ch.rate_multiplier || 1, api_key: ch.credentials?.api_key || '', endpoint_url: ch.credentials?.endpoint_url || '', room_map: { ...(ch.room_map || {}) } });
  };

  const saveCfg = async (e) => {
    e.preventDefault();
    await put(`/channels/${cfg.id}`, {
      rate_multiplier: Number(cfgForm.rate_multiplier) || 1,
      credentials: { api_key: cfgForm.api_key, endpoint_url: cfgForm.endpoint_url },
      room_map: cfgForm.room_map,
    });
    toast(`${cfg.name} settings saved`);
    setCfg(null);
    load();
  };

  const setBooking = async (b, status) => {
    await put(`/channel-bookings/${b.id}`, { status });
    toast(`Booking ${status}`);
    load();
  };

  const mapRoom = (roomTypeId, chId) => (e) => {
    const val = e.target.value;
    setCfgForm((f) => {
      const map = { ...f.room_map };
      if (val === '') delete map[String(roomTypeId)];
      else map[String(roomTypeId)] = val;
      return { ...f, room_map: map };
    });
  };

  return (
    <div>
      <div className="between">
        <h1>📡 Channel Manager</h1>
        <button className="btn primary" onClick={syncAll} disabled={syncing === 'all'}>
          {syncing === 'all' ? 'Syncing…' : '🔄 Sync All Channels'}
        </button>
      </div>
      <p style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
        Push live availability &amp; rates to MakeMyTrip, Booking.com, Goibibo, Agoda and more — OTA bookings flow straight into the ERP. No need to open those apps.
      </p>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, marginTop: 14 }}>
        {channels.map((ch) => (
          <div key={ch.id} className="card" style={{ padding: 14, opacity: ch.enabled ? 1 : 0.6 }}>
            <div className="between">
              <div className="row" style={{ gap: 8 }}>
                <span style={{ fontSize: 22 }}>{ch.emoji_hint || '📡'}</span>
                <div>
                  <b>{ch.name}</b>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>
                    {ch.enabled ? 'Connected' : 'Disabled'} · {ch.practice ? 'practice mode' : 'live mode'}
                  </div>
                </div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={!!ch.enabled} onChange={(e) => toggle(ch, 'enabled', e.target.checked)} />
                <span></span>
              </label>
            </div>
            <div className="row" style={{ gap: 12, marginTop: 10, fontSize: 12 }}>
              <span>🔄 <label className="switch inline"><input type="checkbox" checked={!!ch.auto_sync} onChange={(e) => toggle(ch, 'auto_sync', e.target.checked)} /><span></span></label> auto</span>
              <span>🧪 <label className="switch inline"><input type="checkbox" checked={!!ch.practice} onChange={(e) => toggle(ch, 'practice', e.target.checked)} /><span></span></label> practice</span>
              <span>💰 ×{Number(ch.rate_multiplier || 1).toFixed(2)}</span>
            </div>
            <div className="between" style={{ marginTop: 8, fontSize: 11 }}>
              <span className={'badge ' + (ch.last_sync_status === 'ok' ? 'available' : ch.last_sync_status === 'error' ? 'dirty' : 'maintenance')}>
                {ch.last_sync_status ? ch.last_sync_status.toUpperCase() : 'NEVER SYNCED'}
              </span>
              <span style={{ opacity: 0.6 }}>{ch.last_sync_at || '—'}</span>
            </div>
            <div className="row" style={{ marginTop: 10, gap: 8 }}>
              <button className="btn sm" onClick={() => syncOne(ch)} disabled={syncing === ch.code}>
                {syncing === ch.code ? 'Syncing…' : '🔄 Sync now'}
              </button>
              <button className="btn sm" onClick={() => openCfg(ch)}>⚙️ Settings</button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 14, marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <h3>🌐 Channel Bookings (auto-imported from OTAs)</h3>
          {bookings.length === 0 ? (
            <p style={{ fontSize: 13, opacity: 0.7 }}>No channel bookings yet. Enable a channel (practice mode) and press "Sync now" — a simulated OTA booking will arrive here.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Ref</th><th>Guest</th><th>Room</th><th>Dates</th><th>Total</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td><b>{b.channel_ref}</b><div style={{ fontSize: 10, opacity: 0.6 }}>{b.channel}</div></td>
                    <td>{b.guest_name}<div style={{ fontSize: 10, opacity: 0.6 }}>{b.guest_phone}</div></td>
                    <td>{b.room_number}<div style={{ fontSize: 10, opacity: 0.6 }}>{b.room_type}</div></td>
                    <td>{b.check_in} → {b.check_out}</td>
                    <td>₹{Number(b.total).toLocaleString('en-IN')}</td>
                    <td><span className={'badge ' + (b.status === 'cancelled' ? 'dirty' : b.status === 'checked_out' ? 'maintenance' : 'available')}>{b.status}</span></td>
                    <td>
                      {b.status === 'pending' && <button className="btn sm" onClick={() => setBooking(b, 'confirmed')}>Confirm</button>}
                      {b.status === 'confirmed' && <button className="btn sm" onClick={() => setBooking(b, 'checked_in')}>Check-in</button>}
                      {(b.status === 'pending' || b.status === 'confirmed' || b.status === 'checked_in') && (
                        <button className="btn sm red" style={{ marginLeft: 6 }} onClick={() => setBooking(b, 'cancelled')}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3>🧾 Sync Log</h3>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {logs.length === 0 && <p style={{ fontSize: 13, opacity: 0.7 }}>No sync activity yet.</p>}
            {logs.map((l) => (
              <div key={l.id} className="row" style={{ gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,.05)', fontSize: 12, alignItems: 'flex-start' }}>
                <span className={'badge ' + (l.status === 'ok' ? 'available' : 'dirty')}>{l.direction}</span>
                <span style={{ minWidth: 100, fontWeight: 600 }}>{l.channel_code}</span>
                <span style={{ flex: 1, opacity: 0.75 }}>{l.message}</span>
                <span style={{ opacity: 0.5, whiteSpace: 'nowrap' }}>{l.created_at}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {cfg && (
        <div className="modal-back" onClick={() => setCfg(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="between">
              <h3>⚙️ {cfg.emoji_hint} {cfg.name} — Channel Settings</h3>
              <button className="btn sm" onClick={() => setCfg(null)}>✕</button>
            </div>
            <form onSubmit={saveCfg} style={{ marginTop: 10 }}>
              <label>Rate multiplier (channel rate = ERP room rate × this)</label>
              <input type="number" step="0.05" min="0.1" max="10" value={cfgForm.rate_multiplier} onChange={(e) => setCfgForm((f) => ({ ...f, rate_multiplier: e.target.value }))} />
              <label style={{ marginTop: 10 }}>API key / login (leave empty in practice mode)</label>
              <input type="password" value={cfgForm.api_key} onChange={(e) => setCfgForm((f) => ({ ...f, api_key: e.target.value }))} placeholder="••••••••" />
              <label style={{ marginTop: 10 }}>Channel endpoint URL (optional override)</label>
              <input type="text" value={cfgForm.endpoint_url} onChange={(e) => setCfgForm((f) => ({ ...f, endpoint_url: e.target.value }))} placeholder="https://…" />
              <label style={{ marginTop: 12 }}>Room mapping (ERP room type → channel room id)</label>
              {roomTypes.map((t) => (
                <div key={t.id} className="row" style={{ gap: 10, marginTop: 6 }}>
                  <span style={{ fontSize: 12, minWidth: 140 }}>{t.name}</span>
                  <input
                    type="text"
                    style={{ flex: 1 }}
                    placeholder="channel room id (e.g. MMTRM-101)"
                    value={cfgForm.room_map[String(t.id)] || ''}
                    onChange={mapRoom(t.id)}
                  />
                </div>
              ))}
              <button className="btn primary" style={{ marginTop: 14, width: '100%' }} type="submit">Save settings</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}