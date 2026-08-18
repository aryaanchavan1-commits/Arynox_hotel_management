import { db } from './db.js';

const OTA_ENDPOINTS = {
  makemytrip: 'https://api.makemytrip.com/hotel/v1/availability',
  bookingcom: 'https://supply-xml.booking.com/hotels/xml/availability',
  goibibo: 'https://developer.goibibo.com/api/hotels/availability',
  agoda: 'https://api.agoda.com/api/hotel/availability',
  expedia: 'https://connectivity.ean.com/hotel/availability',
  airbnb: 'https://api.airbnb.com/v2/hotel/availability',
  cleartrip: 'https://api.cleartrip.com/hotel/v1/availability',
  paytm: 'https://travel.paytm.com/api/hotels/v1/availability',
};

const CHANNEX_BASE = { staging: 'https://staging.channex.io/api/v1', prod: 'https://secure.channex.io/api/v1' };

async function channexApi(creds, path, method = 'GET', body) {
  const base = (creds.base_url && CHANNEX_BASE[creds.base_url]) || creds.base_url || CHANNEX_BASE.staging;
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'user-api-key': creds.api_key || '' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Channex HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  return res.json().catch(() => ({}));
}

export async function computeChannelInventory() {
  const types = (await db.execute('SELECT id, name, price FROM room_types ORDER BY price')).rows;
  const inv = [];
  for (const t of types) {
    const r = await db.execute('SELECT COUNT(*) c FROM rooms WHERE room_type_id=?', [t.id]);
    const o = await db.execute("SELECT COUNT(*) c FROM bookings WHERE room_id IN (SELECT id FROM rooms WHERE room_type_id=?) AND status NOT IN ('cancelled','checked_out') AND datetime(check_out) > datetime('now')", [t.id]);
    const available = Math.max(0, Number(r.rows[0].c) - Number(o.rows[0].c));
    inv.push({ room_type_id: t.id, name: t.name, base_rate: Number(t.price), available });
  }
  return inv;
}

export async function pushChannel(channel, ctx) {
  const map = JSON.parse(channel.room_map_json || '{}');
  const inv = await computeChannelInventory();
  const payload = {
    channel: channel.code,
    hotel: ctx.hotel_name,
    currency: ctx.currency,
    timestamp: new Date().toISOString(),
    rooms: inv
      .filter((i) => map[String(i.room_type_id)])
      .map((i) => ({
        channel_room_id: map[String(i.room_type_id)],
        room_name: i.name,
        rate: Math.round(i.base_rate * Number(channel.rate_multiplier || 1) * 100) / 100,
        available: i.available,
      })),
  };

  let ok = true;
  let detail = `${payload.rooms.length} room type(s) synced`;
  const creds = JSON.parse(channel.credentials_json || '{}');

  if (channel.code === 'channex' && Number(channel.practice) === 0 && creds.api_key && creds.property_id) {
    try {
      const map = JSON.parse(channel.room_map_json || '{}');
      const ratePlans = typeof creds.rate_plan_ids === 'string' ? JSON.parse(creds.rate_plan_ids || '{}') : (creds.rate_plan_ids || {});
      const days = 60;
      const dayAt = (i) => new Date(Date.now() + i * 86400000).toISOString().slice(0, 10);
      const dates = Array.from({ length: days }, (_, i) => dayAt(i));
      const active = (await db.execute("SELECT room_id, check_in, check_out FROM bookings WHERE status NOT IN ('cancelled','checked_out')")).rows;
      const rooms = (await db.execute('SELECT id, room_type_id FROM rooms')).rows;
      const avValues = [];
      const rateValues = [];
      for (const [ourTypeId, chRoomTypeId] of Object.entries(map)) {
        const invItem = inv.find((i) => String(i.room_type_id) === String(ourTypeId));
        if (!invItem) continue;
        const typeRooms = rooms.filter((r) => Number(r.room_type_id) === Number(ourTypeId));
        const chRatePlan = ratePlans[ourTypeId];
        for (const d of dates) {
          const booked = active.filter((b) => b.check_in < d && b.check_out > d && typeRooms.some((r) => Number(r.id) === Number(b.room_id))).length;
          const avail = Math.max(0, typeRooms.length - booked);
          avValues.push({ property_id: creds.property_id, room_type_id: chRoomTypeId, date_from: d, date_to: d, availability: avail });
          if (chRatePlan) rateValues.push({ property_id: creds.property_id, rate_plan_id: chRatePlan, date_from: d, date_to: d, rate: String(Math.round(invItem.base_rate * Number(channel.rate_multiplier || 1) * 100) / 100) });
        }
      }
      if (avValues.length > 0) {
        await channexApi(creds, '/availability', 'POST', { values: avValues });
        if (rateValues.length > 0) await channexApi(creds, '/restrictions', 'POST', { values: rateValues });
        detail = `Channex ARI pushed (${avValues.length / Math.max(1, dates.length)} room type(s) × ${days} days, ${rateValues.length > 0 ? 'rates included' : 'no rate plans mapped'})`;
      }
    } catch (e) {
      ok = false;
      detail = e.message;
    }
    return { ok, detail, payload };
  }

  if (Number(channel.practice) === 0 && creds.api_key) {
    try {
      const endpoint = creds.endpoint_url || OTA_ENDPOINTS[channel.code] || '';
      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(creds.api_key ? { Authorization: `Bearer ${creds.api_key}` } : {}) },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Channel returned HTTP ${res.status}`);
      }
    } catch (e) {
      ok = false;
      detail = e.message;
    }
  }
  return { ok, detail, payload };
}

export async function pullChannel(channel, ctx) {
  // Pull bookings from the OTA. In practice mode, we simulate a booking arriving
  // so the whole flow (OTA -> ERP) can be exercised. With live credentials,
  // the same adapter calls the channel endpoint.
  const map = JSON.parse(channel.room_map_json || '{}');
  const mappedIds = Object.keys(map);
  if (mappedIds.length === 0) return { ok: true, bookings: [] };

  const creds = JSON.parse(channel.credentials_json || '{}');
  const incoming = [];
  const channelRef = `CH-${String(channel.code).toUpperCase()}-`;
  const existing = (await db.execute("SELECT channel_ref, id FROM bookings WHERE channel=? AND status!='cancelled'", [channel.code])).rows;
  const existingByRef = {};
  for (const e of existing) existingByRef[e.channel_ref] = e.id;

  // ---------- Channex live: booking revisions feed (official sync mechanism) ----------
  if (channel.code === 'channex' && Number(channel.practice) === 0 && creds.api_key) {
    try {
      const feed = await channexApi(creds, '/booking_revisions/feed', 'GET');
      const revisions = (feed && feed.data) || [];
      let created = 0;
      let updated = 0;
      let cancelled = 0;
      for (const rev of revisions) {
        const attrs = rev.attributes || {};
        const ref = channelRef + (attrs.ota_reservation_code || rev.id || '');
        const roomTypeId = Number(Object.keys(map).find((k) => map[k] === (attrs.rooms && attrs.rooms[0] && attrs.rooms[0].room_type_id)) || mappedIds[0]);
        try {
          if (attrs.status === 'cancelled') {
            const bid = existingByRef[ref];
            if (bid) {
              const b = (await db.execute('SELECT * FROM bookings WHERE id=?', [bid])).rows[0];
              await db.execute("UPDATE bookings SET status='cancelled' WHERE id=?", [bid]);
              if (b) await db.execute("UPDATE rooms SET status='available' WHERE id=?", [b.room_id]);
              cancelled++;
              await logSync(channel.code, 'pull', 'ok', `${ref} cancelled via Channex`);
            }
            await channexApi(creds, `/booking_revisions/${rev.id}/ack`, 'POST');
            continue;
          }
          const bid = existingByRef[ref];
          if (bid) {
            await db.execute("UPDATE bookings SET check_in=?, check_out=?, adults=? WHERE id=?", [attrs.arrival_date, attrs.departure_date, Number(attrs.occupancy?.adults) || 2, bid]);
            updated++;
          } else {
            const room = (await db.execute(
              "SELECT id FROM rooms WHERE room_type_id=? AND status='available' AND id NOT IN (SELECT room_id FROM bookings WHERE status NOT IN ('cancelled','checked_out') AND datetime(check_out) > datetime('now')) LIMIT 1",
              [roomTypeId])).rows[0];
            if (!room) {
              await logSync(channel.code, 'pull', 'error', `Rejected ${ref} — no available room of type ${roomTypeId}`);
              await channexApi(creds, `/booking_revisions/${rev.id}/ack`, 'POST');
              continue;
            }
            const guestName = attrs.customer?.name || attrs.customer?.first_name || 'OTA Guest';
            const phone = attrs.customer?.phone || '';
            const g = await db.execute('INSERT INTO guests (name, phone) VALUES (?,?)', [guestName, phone]);
            const total = Number(attrs.amount) || 0;
            await db.execute(
              'INSERT INTO bookings (guest_id, room_id, check_in, check_out, adults, status, total, source, reference, channel, channel_ref, payment_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
              [Number(g.lastInsertRowid), room.id, attrs.arrival_date, attrs.departure_date, Number(attrs.occupancy?.adults) || 2, 'pending', total, 'channel', ref, channel.code, ref, 'channel']);
            created++;
            incoming.push({ channel_ref: ref, guest_name: guestName, check_in: attrs.arrival_date, check_out: attrs.departure_date, total });
            await logSync(channel.code, 'pull', 'ok', `Imported ${ref} — ${guestName} (${attrs.arrival_date} → ${attrs.departure_date})`);
          }
          await channexApi(creds, `/booking_revisions/${rev.id}/ack`, 'POST');
        } catch (e) {
          await logSync(channel.code, 'pull', 'error', `${ref}: ${e.message}`);
        }
      }
      return { ok: true, bookings: incoming, detail: `Channex feed: ${created} new, ${updated} modified, ${cancelled} cancelled (${revisions.length} revision(s) processed)` };
    } catch (e) {
      return { ok: false, bookings: [], detail: 'Channex feed failed: ' + e.message };
    }
  }

  let fetched = [];
  const endpoint = creds.endpoint_url ? creds.endpoint_url + '/bookings' : '';
  if (Number(channel.practice) === 0 && endpoint) {
    try {
      const res = await fetch(endpoint, {
        headers: { ...(creds.api_key ? { Authorization: `Bearer ${creds.api_key}` } : {}) },
      });
      const data = await res.json().catch(() => ({}));
      fetched = Array.isArray(data.bookings) ? data.bookings : [];
    } catch {
      return { ok: false, bookings: [], detail: 'Failed to reach channel endpoint' };
    }
  }

  const sim = [
    { guest: 'Priya Sharma', phone: '+91 98111 22334', room_map_id: mappedIds[0], nights: 2, adults: 2, total: 0 },
    { guest: 'Arjun Mehta', phone: '+91 98222 44556', room_map_id: mappedIds[mappedIds.length - 1], nights: 1, adults: 1, total: 0 },
  ];

  const source = Number(channel.practice) === 1
    ? sim.map((s, i) => ({ ...s, ref: `PRAC${Date.now() % 100000}${i}` }))
    : fetched.map((b) => ({ guest: b.guest || b.name || 'Guest', phone: b.phone || '', room_map_id: String(b.room_map_id || map[Object.keys(map)[0]]), nights: b.nights || 1, adults: b.adults || 2, ref: b.reference || `LIVE${Date.now() % 100000}` }));

  for (const s of source) {
    const ref = channelRef + s.ref;
    if (existingByRef[ref]) continue;
    const roomTypeId = Number(Object.keys(map).find((k) => map[k] === s.room_map_id) || mappedIds[0]);
    const rate = (await db.execute('SELECT price FROM room_types WHERE id=?', [roomTypeId])).rows[0];
    const ci = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const co = new Date(Date.now() + (2 + Number(s.nights || 1)) * 86400000).toISOString().slice(0, 10);
    const total = Number(s.total) || (Number(rate?.price || 0) * Number(s.nights || 1));

    // auto-import into the ERP (accept booking) if a room of the mapped type is free
    const room = (await db.execute(
      "SELECT id FROM rooms WHERE room_type_id=? AND status='available' AND id NOT IN (SELECT room_id FROM bookings WHERE status NOT IN ('cancelled','checked_out') AND datetime(check_out) > datetime('now')) LIMIT 1",
      [roomTypeId])).rows[0];
    if (!room) {
      await logSync(channel.code, 'pull', 'error', `Rejected ${ref} (${s.guest}) — no available room of type ${roomTypeId}`);
      continue;
    }
    const g = await db.execute('INSERT INTO guests (name, phone) VALUES (?,?)', [s.guest, s.phone || '']);
    await db.execute(
      'INSERT INTO bookings (guest_id, room_id, check_in, check_out, adults, status, total, source, reference, channel, channel_ref, payment_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [Number(g.lastInsertRowid), room.id, ci, co, Number(s.adults) || 2, 'pending', total, 'channel', ref, channel.code, ref, 'channel']);
    await logSync(channel.code, 'pull', 'ok', `Imported ${ref} — ${s.guest} (${ci} → ${co})`);
    incoming.push({ channel_ref: ref, guest_name: s.guest, check_in: ci, check_out: co, total });
  }

  return { ok: true, bookings: incoming, detail: `${incoming.length} new booking(s) imported` };
}

export async function logSync(channelCode, direction, status, message) {
  await db.execute('INSERT INTO sync_logs (channel_code, direction, status, message) VALUES (?,?,?,?)',
    [channelCode, direction, status, String(message || '').slice(0, 500)]);
}

export async function syncChannel(channel, ctx) {
  const pushed = await pushChannel(channel, ctx);
  const pulled = await pullChannel(channel, ctx);
  await logSync(channel.code, 'push', pushed.ok ? 'ok' : 'error', pushed.detail);
  await logSync(channel.code, 'pull', pulled.ok ? 'ok' : 'error', pulled.detail || 'No bookings');
  await db.execute('UPDATE channels SET last_sync_at=datetime(\'now\'), last_sync_status=? WHERE id=?',
    [pushed.ok && pulled.ok ? 'ok' : 'error', channel.id]);
  return { pushed, pulled };
}

export async function autoSyncChannels() {
  // Best-effort background sync: push availability/rates after ERP changes.
  // Vercel serverless may not await this fully, so the Channel Manager also
  // offers a manual "Sync now" that runs everything in the request.
  try {
    const rows = (await db.execute('SELECT * FROM channels WHERE enabled=1 AND auto_sync=1')).rows;
    if (rows.length === 0) return;
    const s = (await db.execute("SELECT value FROM hotel_settings WHERE key='hotel_name'")).rows[0];
    const cur = (await db.execute("SELECT value FROM hotel_settings WHERE key='currency_symbol'")).rows[0];
    const ctx = { hotel_name: s?.value || 'Hotel Lakshmi Elite', currency: cur?.value || '₹' };
    for (const ch of rows) {
      try { await syncChannel(ch, ctx); } catch {}
    }
  } catch {}
}