import { NextResponse } from 'next/server';
import { db, getSettings, ensureReady } from '@/lib/db';
import { signToken, verifyToken, hash, SALT, isGuestToken, isStaffToken } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { buildEscPos, htmlReceipt } from '@/lib/receipt';
import { chat } from '@/lib/ai';
import { Groq } from 'groq-sdk';
import https from 'node:https';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

const segs = (p) => (Array.isArray(p) ? p : p ? [p] : []);

function authUser(req, url) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '') || url.searchParams.get('token');
  return verifyToken(token);
}

async function body(req) {
  try { return await req.json(); } catch { return {}; }
}

function makeRef() {
  const n = Math.floor(10000 + Math.random() * 89999);
  return `ARY-${n}`;
}

async function roomPrice(roomId) {
  const r = await db.execute('SELECT t.price FROM rooms r JOIN room_types t ON t.id=r.room_type_id WHERE r.id=?', [roomId]);
  return Number(r.rows[0]?.price || 0);
}
function nights(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
}

async function handle(req, params) {
  const url = new URL(req.url);
  const path = segs(params.path);
  const method = req.method;

  // public endpoints
  if (path[0] === 'health' && method === 'GET') {
    return NextResponse.json({ ok: true, service: 'arynox-hotel-backend', time: new Date().toISOString() });
  }
  if (path[0] === 'guest' && ['signup', 'login'].includes(path[1]) && method === 'POST') {
    try { await ensureReady(); } catch (e) { return NextResponse.json({ error: 'Database unavailable, retrying…' }, { status: 503 }); }
  }
  if (path[0] === 'public' && ['hotels', 'bookings'].includes(path[1])) {
    try { await ensureReady(); } catch (e) { return NextResponse.json({ error: 'Database unavailable, retrying…' }, { status: 503 }); }
  }
  if (path[0] === 'public' && path[1] === 'hotels' && method === 'GET') {
    const s = await getSettings();
    const types = (await db.execute('SELECT * FROM room_types ORDER BY price')).rows.map((t) => ({
      ...t,
      amenities: (t.amenities || '').split(',').map((x) => x.trim()).filter(Boolean),
    }));
    let facilities = []; try { facilities = JSON.parse(s.facilities_json || '[]'); } catch {}
    let gallery = []; try { gallery = JSON.parse(s.gallery_json || '[]'); } catch {}
    let social = {}; try { social = JSON.parse(s.social_json || '{}'); } catch {}
    return NextResponse.json({
      settings: {
        hotel_name: s.hotel_name,
        hotel_address: s.hotel_address,
        hotel_phone: s.hotel_phone,
        email: s.email || '',
        welcome_message: s.welcome_message,
        tagline: s.tagline || 'Stay · Dine · Celebrate',
        about_text: s.about_text || '',
        primary_color: s.primary_color || '#4f46e5',
        currency_symbol: s.currency_symbol || '₹',
        footer_text: s.footer_text || '',
        api_base_url: s.api_base_url || '',
        payments_enabled: !!(s.razorpay_key_id && s.razorpay_key_secret),
      },
      facilities,
      gallery,
      social,
      roomTypes: types,
    });
  }
  if (path[0] === 'public' && path[1] === 'bookings' && method === 'POST') {
    const b = await body(req);
    const { room_type_id, check_in, check_out, adults, children, name, phone, email, id_type, id_number, address,
      id_proof_base64, id_proof_name, id_proof_mime, pay_now } = b;
    if (!room_type_id || !check_in || !check_out || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (id_proof_base64 && String(id_proof_base64).length > 3_200_000) {
      return NextResponse.json({ error: 'ID proof image too large (max 2MB)' }, { status: 413 });
    }
    if (new Date(check_out) <= new Date(check_in)) return NextResponse.json({ error: 'Check-out must be after check-in' }, { status: 400 });
    const busy = (await db.execute(
      `SELECT DISTINCT room_id FROM bookings WHERE status NOT IN ('cancelled','checked_out') AND check_in < ? AND check_out > ?`,
      [check_out, check_in]
    )).rows.map((r) => Number(r.room_id));
    const busySet = new Set(busy);
    const free = (await db.execute(
      `SELECT r.* FROM rooms r WHERE r.room_type_id=? AND r.status='available' ORDER BY r.number`, [room_type_id]
    )).rows.find((r) => !busySet.has(Number(r.id)));
    if (!free) return NextResponse.json({ error: 'No room available for the selected dates' }, { status: 409 });
    // guest record
    const g = await db.execute('INSERT INTO guests (name, phone, email, id_type, id_number, address) VALUES (?,?,?,?,?,?)',
      [name, phone || '', email || '', id_type || 'passport', id_number || '', address || '']);
    const guestId = Number(g.lastInsertRowid);
    const auth = authUser(req, url);
    const guestAccountId = isGuestToken(auth) ? Number(auth.gid) : 0;
    const price = Number((await db.execute('SELECT price FROM room_types WHERE id=?', [room_type_id])).rows[0].price);
    const total = price * nights(check_in, check_out);
    const ref = makeRef();
    const payStatus = pay_now ? 'paid' : 'unpaid';
    const r = await db.execute(
      `INSERT INTO bookings (guest_id, room_id, check_in, check_out, adults, children, status, total, meal_plan, extras_json, source, reference, guest_account_id, id_proof_base64, id_proof_name, id_proof_mime, payment_status, payment_method)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [guestId, free.id, check_in, check_out, adults || 1, children || 0, 'pending', total, 'room_only', '[]', 'online', ref, guestAccountId,
       id_proof_base64 || '', id_proof_name || '', id_proof_mime || '', payStatus, pay_now ? 'online' : '']);
    const settings = await getSettings();
    return NextResponse.json({
      reference: ref, total, check_in, check_out, room_number: free.number,
      hotel_name: settings.hotel_name,
      currency_symbol: settings.currency_symbol || '₹',
      bookingId: Number(r.lastInsertRowid),
      payment_status: payStatus,
    });
  }
  if (path[0] === 'auth' && path[1] === 'login' && method === 'POST') {
    try { await ensureReady(); } catch (e) { return NextResponse.json({ error: 'Database unavailable, retrying…' }, { status: 503 }); }
    const b = await body(req);
    const r = await db.execute('SELECT * FROM users WHERE username=?', [b.username]);
    const u = r.rows[0];
    if (!u || u.password_hash !== hash(b.password || '', SALT) || Number(u.enabled) !== 1) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
    const token = signToken({ kind: 'staff', userId: u.id, username: u.username, name: u.name, role: u.role });
    return NextResponse.json({ token, user: { id: u.id, name: u.name, role: u.role, username: u.username } });
  }

  // public guest signup/login (kind=guest credentials)
  if (path[0] === 'guest' && path[1] === 'signup' && method === 'POST') {
    const b = await body(req);
    if (!b.name || !b.email || !b.password) return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    if (String(b.password).length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    const email = String(b.email).trim().toLowerCase();
    const dup = (await db.execute('SELECT id FROM guest_accounts WHERE email=?', [email])).rows[0];
    if (dup) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    const r = await db.execute('INSERT INTO guest_accounts (name, email, phone, password_hash) VALUES (?,?,?,?)',
      [String(b.name).trim(), email, String(b.phone || '').trim(), hash(b.password, SALT)]);
    const token = signToken({ kind: 'guest', gid: Number(r.lastInsertRowid), name: String(b.name).trim(), email });
    return NextResponse.json({ token, user: { id: Number(r.lastInsertRowid), name: String(b.name).trim(), email } });
  }
  if (path[0] === 'guest' && path[1] === 'login' && method === 'POST') {
    const b = await body(req);
    const email = String(b.email || '').trim().toLowerCase();
    const r = await db.execute('SELECT * FROM guest_accounts WHERE email=?', [email]);
    const g = r.rows[0];
    if (!g || g.password_hash !== hash(b.password || '', SALT)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    const token = signToken({ kind: 'guest', gid: g.id, name: g.name, email: g.email });
    return NextResponse.json({ token, user: { id: g.id, name: g.name, email: g.email } });
  }

  // ---------- payments (public: webhook + guest checkout session; Razorpay via HTTPS, no SDK) ----------
  if (path[0] === 'payments' && path[1] === 'webhook' && method === 'POST') {
    try { await ensureReady(); } catch (e) { return NextResponse.json({ error: 'Database unavailable' }, { status: 503 }); }
    const cfg = await getSettings();
    const secret = cfg.razorpay_webhook_secret || process.env.RAZORPAY_WEBHOOK_SECRET;
    const raw = await req.text();
    if (!secret) return NextResponse.json({ received: true });
    const sig = req.headers.get('x-razorpay-signature') || '';
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    if (sig !== expected) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    let evt;
    try { evt = JSON.parse(raw); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
    if (evt.event === 'payment.captured' && evt.payload) {
      const pay = evt.payload.payment?.entity || evt.payload.payment || {};
      const notes = pay.notes || {};
      const bid = Number(notes.booking_id || evt.payload.booking_id);
      if (bid) await db.execute("UPDATE bookings SET payment_status='paid', payment_intent_id=? WHERE id=?", [pay.id || 'rp', bid]);
    }
    return NextResponse.json({ received: true });
  }
  if (path[0] === 'payments' && path[1] === 'create-order' && method === 'POST') {
    try { await ensureReady(); } catch (e) { return NextResponse.json({ error: 'Database unavailable' }, { status: 503 }); }
    const cfg = await getSettings();
    const key = cfg.razorpay_key_id || process.env.RAZORPAY_KEY_ID;
    const secret = cfg.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET;
    if (!key || !secret) return NextResponse.json({ error: 'Payments not configured (set RAZORPAY_KEY_ID/SECRET in Admin → Settings)' }, { status: 501 });
    const b = await body(req);
    const { booking_id, currency } = b;
    if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 });
    const bk = (await db.execute('SELECT id, total, reference FROM bookings WHERE id=?', [booking_id])).rows[0];
    if (!bk) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    const cur = currency || ((await getSettings()).currency_symbol === '₹' ? 'INR' : 'USD');
    const amount = Number(bk.total) * 100;
    const payload = new URLSearchParams({
      amount: String(amount), currency: cur, 'payment_capture': '1',
      'notes[booking_id]': String(bk.id), 'notes[reference]': bk.reference,
    });
    return new Promise((resolve) => {
      const auth = 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64');
      const req2 = https.request('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(payload.toString()) },
      }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            if (j.id) {
              db.execute("UPDATE bookings SET payment_intent_id=? WHERE id=?", [j.id, bk.id]);
              resolve(NextResponse.json({ ok: true, order_id: j.id, key_id: key, amount: j.amount, currency: j.currency }));
            } else {
              resolve(NextResponse.json({ error: j.error?.description || 'Razorpay error', rp: j }, { status: 402 }));
            }
          } catch (e) { resolve(NextResponse.json({ error: 'Razorpay parse error' }, { status: 502 })); }
        });
      });
      req2.on('error', () => resolve(NextResponse.json({ error: 'Razorpay request failed' }, { status: 502 })));
      req2.write(payload.toString());
      req2.end();
    });
  }

  // everything else requires a valid token
  const user = authUser(req, url);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try { await ensureReady(); } catch (e) { return NextResponse.json({ error: 'Database unavailable, retrying…' }, { status: 503 }); }

  // ---------- guest account endpoints (guest token only) ----------
  if (isGuestToken(user)) {
    if (path[0] === 'guest' && path[1] === 'my-bookings' && method === 'GET') {
      const rows = (await db.execute(
        `SELECT b.id, b.reference, b.check_in, b.check_out, b.adults, b.children, b.meal_plan, b.total, b.status, b.created_at,
                r.number AS room_number, t.name AS room_type
         FROM bookings b JOIN rooms r ON r.id=b.room_id JOIN room_types t ON t.id=r.room_type_id
         WHERE b.guest_account_id=? ORDER BY b.id DESC`, [user.gid]
      )).rows;
      return NextResponse.json(rows);
    }
    if (path[0] === 'guest' && path[1] === 'bookings' && path[2] && path[3] === 'cancel' && method === 'POST') {
      const b = (await db.execute('SELECT * FROM bookings WHERE id=? AND guest_account_id=?', [path[2], user.gid])).rows[0];
      if (!b) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      if (!['pending', 'confirmed'].includes(b.status)) return NextResponse.json({ error: 'This booking can no longer be cancelled' }, { status: 400 });
      await db.execute("UPDATE bookings SET status='cancelled' WHERE id=?", [path[2]]);
      await db.execute("UPDATE rooms SET status='available' WHERE id=?", [b.room_id]);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // ---------- staff auth ----------
  if (path[0] === 'auth' && path[1] === 'me' && method === 'GET') {
    const u = (await db.execute('SELECT id, username, name, role FROM users WHERE id=?', [user.userId])).rows[0];
    return NextResponse.json(u || user);
  }
  if (path[0] === 'auth' && path[1] === 'logout' && method === 'POST') {
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'auth' && path[1] === 'password' && method === 'PUT') {
    const b = await body(req);
    const u = (await db.execute('SELECT * FROM users WHERE id=?', [user.userId])).rows[0];
    if (!u || u.password_hash !== hash(b.oldPassword || '', SALT)) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }
    await db.execute('UPDATE users SET password_hash=? WHERE id=?', [hash(b.newPassword || '', SALT), user.userId]);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'env-check' && method === 'GET') {
    return NextResponse.json({
      hasGroq: !!process.env.GROQ_API_KEY,
      groqLen: (process.env.GROQ_API_KEY || '').length,
      hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
      hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
      port: process.env.PORT,
    });
  }

  // ---------- settings ----------
  if (path[0] === 'settings' && method === 'GET') return NextResponse.json(await getSettings());
  if (path[0] === 'settings' && method === 'PUT') {
    const b = await body(req);
    for (const [k, v] of Object.entries(b || {})) {
      await db.execute('INSERT INTO hotel_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [k, String(v)]);
    }
    return NextResponse.json(await getSettings());
  }

   // ---------- admin export / import ----------
   if (path[0] === 'export' && method === 'GET' && user.role === 'admin') {
     const tables = ['room_types', 'rooms', 'guests', 'bookings', 'menu_items', 'orders', 'order_items', 'bills', 'housekeeping_tasks', 'hotel_settings', 'guest_accounts'];
     const data = {};
     for (const t of tables) { try { data[t] = (await db.execute(`SELECT * FROM ${t}`)).rows; } catch { data[t] = []; } }
     return NextResponse.json(data);
   }
   if (path[0] === 'import' && method === 'POST' && user.role === 'admin') {
     const payload = await body(req);
     const tables = ['room_types', 'rooms', 'guests', 'bookings', 'menu_items', 'orders', 'order_items', 'bills', 'housekeeping_tasks', 'hotel_settings', 'guest_accounts'];
     let imported = 0;
     for (const t of tables) {
       if (!Array.isArray(payload[t])) continue;
       try {
         const cols = (await db.execute(`PRAGMA table_info(${t})`)).rows.map((c) => c.name);
         for (const row of payload[t]) {
           const keys = Object.keys(row).filter((k) => cols.includes(k));
           if (!keys.length) continue;
           const params = keys.map(() => '?').join(',');
           await db.execute(`INSERT INTO ${t} (${keys.join(',')}) VALUES (${params})`, keys.map((k) => row[k]));
           imported++;
         }
       } catch { /* skip */ }
     }
     return NextResponse.json({ ok: true, imported });
   }

   // ---------- users (admin / manager) ----------
  const isAdminOrManager = ['admin', 'manager'].includes(user.role);
  if (path[0] === 'users' && method === 'GET' && isAdminOrManager) {
    const rows = (await db.execute('SELECT id, username, name, role, enabled FROM users ORDER BY id')).rows;
    return NextResponse.json(rows);
  }
  if (path[0] === 'users' && method === 'POST' && user.role === 'admin') {
    const { username, password, name, role } = await body(req);
    if (!username || !password) return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    if (!ROLES.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    const dup = (await db.execute('SELECT id FROM users WHERE username=?', [username])).rows[0];
    if (dup) return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    await db.execute('INSERT INTO users (username, password_hash, name, role, enabled) VALUES (?,?,?,?,1)', [username, hash(password, SALT), name || username, role]);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'users' && path[1] && method === 'PUT' && user.role === 'admin') {
    const { username, name, role, enabled } = await body(req);
    await db.execute('UPDATE users SET username=?, name=?, role=?, enabled=? WHERE id=?', [username, name, role, enabled ? 1 : 0, path[1]]);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'users' && path[1] && path[2] === 'password' && method === 'POST' && user.role === 'admin') {
    const { password } = await body(req);
    if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 });
    await db.execute('UPDATE users SET password_hash=? WHERE id=?', [hash(password, SALT), path[1]]);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'users' && method === 'GET' && !isAdminOrManager) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (path[0] === 'users' && method === 'POST' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ---------- admin export / import (admin only) ----------
  if (path[0] === 'export' && method === 'GET' && user.role === 'admin') {
    const tables = ['room_types', 'rooms', 'guests', 'bookings', 'users', 'menu_items',
      'orders', 'order_items', 'bills', 'housekeeping_tasks', 'hotel_settings', 'guest_accounts'];
    const data = {};
    for (const t of tables) {
      try { data[t] = (await db.execute(`SELECT * FROM ${t}`)).rows; } catch (e) { data[t] = []; }
    }
    return NextResponse.json(data);
  }
  if (path[0] === 'import' && method === 'POST' && user.role === 'admin') {
    const payload = await body(req);
    const tables = Object.keys(payload).filter((k) => Array.isArray(payload[k]));
    let imported = 0;
    for (const t of tables) {
      try {
        const cols = (await db.execute(`PRAGMA table_info(${t})`)).rows.map((c) => c.name);
        const rows = payload[t];
        for (const row of rows) {
          const keys = Object.keys(row).filter((k) => cols.includes(k));
          const vals = keys.map((k) => row[k]);
          const params = keys.map(() => '?').join(',');
          await db.execute(`INSERT INTO ${t} (${keys.join(',')}) VALUES (${params})`, vals);
          imported++;
        }
      } catch (e) { /* skip table on error */ }
    }
    return NextResponse.json({ ok: true, imported });
  }

  // ---------- room types & rooms ----------
  if (path[0] === 'room-types' && method === 'GET') return NextResponse.json((await db.execute('SELECT * FROM room_types')).rows);
  if (path[0] === 'room-types' && method === 'POST') {
    const { name, price, capacity, description, amenities, image } = await body(req);
    await db.execute('INSERT INTO room_types (name, price, capacity, description, amenities, image) VALUES (?,?,?,?,?,?)', [name, price, capacity, description || '', amenities || '', image || '']);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'room-types' && path[1] && method === 'PUT') {
    const { name, price, capacity, description, amenities, image } = await body(req);
    await db.execute('UPDATE room_types SET name=?, price=?, capacity=?, description=?, amenities=?, image=? WHERE id=?', [name, price, capacity, description, amenities || '', image || '', path[1]]);
    return NextResponse.json({ ok: true });
  }

  if (path[0] === 'rooms' && method === 'GET') {
    const rows = (await db.execute(
      `SELECT r.*, t.name AS type_name, t.price AS type_price FROM rooms r JOIN room_types t ON t.id=r.room_type_id ORDER BY r.number`
    )).rows;
    return NextResponse.json(rows);
  }
  if (path[0] === 'rooms' && method === 'POST') {
    const { number, room_type_id, floor } = await body(req);
    await db.execute('INSERT INTO rooms (number, room_type_id, floor, status, hk_status) VALUES (?,?,?,?,?)', [number, room_type_id, floor || 1, 'available', 'clean']);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'rooms' && path[1] && method === 'PUT') {
    const { status, hk_status } = await body(req);
    if (status !== undefined && hk_status !== undefined) {
      await db.execute('UPDATE rooms SET status=?, hk_status=? WHERE id=?', [status, hk_status, path[1]]);
    } else if (status !== undefined) {
      await db.execute('UPDATE rooms SET status=? WHERE id=?', [status, path[1]]);
    } else if (hk_status !== undefined) {
      await db.execute('UPDATE rooms SET hk_status=? WHERE id=?', [hk_status, path[1]]);
    }
    return NextResponse.json({ ok: true });
  }

  // ---------- guests ----------
  if (path[0] === 'guests' && method === 'GET' && path[1] === 'search') {
    const q = `%${url.searchParams.get('q') || ''}%`;
    return NextResponse.json((await db.execute('SELECT * FROM guests WHERE name LIKE ? OR phone LIKE ? LIMIT 10', [q, q])).rows);
  }
  if (path[0] === 'guests' && method === 'GET') return NextResponse.json((await db.execute('SELECT * FROM guests ORDER BY id DESC LIMIT 200')).rows);
  if (path[0] === 'guests' && method === 'POST') {
    const { name, phone, email, id_type, id_number, address } = await body(req);
    const r = await db.execute('INSERT INTO guests (name, phone, email, id_type, id_number, address) VALUES (?,?,?,?,?,?)',
      [name, phone || '', email || '', id_type || 'passport', id_number || '', address || '']);
    return NextResponse.json({ id: Number(r.lastInsertRowid) });
  }

  // ---------- bookings ----------
   if (path[0] === 'bookings' && !path[1] && method === 'GET') {
    const rows = (await db.execute(
      `SELECT b.id, b.guest_id, b.room_id, b.check_in, b.check_out, b.adults, b.children, b.status, b.total, b.meal_plan,
              b.extras_json, b.source, b.reference, b.guest_account_id, b.payment_status, b.payment_method,
              CASE WHEN b.id_proof_base64 IS NOT NULL AND b.id_proof_base64 != '' THEN 1 ELSE 0 END AS has_id_proof,
              g.name AS guest_name, g.phone AS guest_phone, r.number AS room_number,
              t.name AS room_type FROM bookings b
       JOIN guests g ON g.id=b.guest_id JOIN rooms r ON r.id=b.room_id
       JOIN room_types t ON t.id=r.room_type_id ORDER BY b.id DESC LIMIT 200`
    )).rows;
    return NextResponse.json(rows);
  }
  if (path[0] === 'bookings' && path[1] && path[2] === 'document' && method === 'GET') {
    const b = (await db.execute('SELECT id_proof_base64, id_proof_name, id_proof_mime, status, reference FROM bookings WHERE id=?', [path[1]])).rows[0];
    if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ has_id_proof: !!(b.id_proof_base64), name: b.id_proof_name, mime: b.id_proof_mime, base64: b.id_proof_base64 || '', status: b.status, reference: b.reference });
  }
   if (path[0] === 'bookings' && method === 'POST' && !path[1]) {
    const b = await body(req);
    const { guest_id, room_id, check_in, check_out, adults, children, status, meal_plan, extras, source, reference, guest_account_id,
      payment_method, id_proof_base64, id_proof_name, id_proof_mime, pay_now } = b;
    const price = await roomPrice(room_id);
    const total = price * nights(check_in, check_out);
    const overlap = (await db.execute(
      `SELECT id FROM bookings WHERE room_id=? AND status NOT IN ('cancelled','checked_out') AND check_in < ? AND check_out > ?`,
      [room_id, check_out, check_in]
    )).rows[0];
    if (overlap) return NextResponse.json({ error: 'Room is not available for the selected dates' }, { status: 409 });
    const ref = reference || makeRef();
    const paymentStatus = pay_now ? 'paid' : 'unpaid';
    if (id_proof_base64 && String(id_proof_base64).length > 3_200_000) return NextResponse.json({ error: 'ID proof image too large (max 2MB)' }, { status: 413 });
    const r = await db.execute(
      `INSERT INTO bookings (guest_id, room_id, check_in, check_out, adults, children, status, total, meal_plan, extras_json, source, reference, guest_account_id, payment_status, payment_method, id_proof_base64, id_proof_name, id_proof_mime)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [guest_id, room_id, check_in, check_out, adults || 1, children || 0, status || 'confirmed', total,
       meal_plan || 'room_only', JSON.stringify(extras || []), source || 'staff', ref, guest_account_id || 0,
       paymentStatus, payment_method || '', id_proof_base64 || '', id_proof_name || '', id_proof_mime || '']);
    if (pay_now) {
      await db.execute("UPDATE bookings SET payment_status='paid', payment_method=? WHERE id=?", [payment_method || 'cash', Number(r.lastInsertRowid)]);
    }
    return NextResponse.json({ id: Number(r.lastInsertRowid), total, reference: ref });
  }
  if (path[0] === 'bookings' && path[1] && path[2] === 'checkin' && method === 'POST') {
    const b = (await db.execute('SELECT * FROM bookings WHERE id=?', [path[1]])).rows[0];
    if (!b || ['checked_out', 'cancelled'].includes(b.status)) return NextResponse.json({ error: 'Cannot check in this booking' }, { status: 400 });
    await db.execute("UPDATE bookings SET status='checked_in' WHERE id=?", [path[1]]);
    await db.execute("UPDATE rooms SET status='occupied', hk_status='clean' WHERE id=?", [b.room_id]);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'bookings' && path[1] && path[2] === 'checkout' && method === 'POST') {
    const b = (await db.execute('SELECT * FROM bookings WHERE id=?', [path[1]])).rows[0];
    if (!b) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    const g = (await db.execute('SELECT name FROM guests WHERE id=?', [b.guest_id])).rows[0];
    const bd = await body(req);
    const extra = Number(bd.extra || 0);
    const settings = await getSettings();
    const taxRate = Number(settings.tax_rate || 5) / 100;
    const subtotal = Number(b.total) + extra;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    const roomNumber = (await db.execute('SELECT number FROM rooms WHERE id=?', [b.room_id])).rows[0].number;
    const extras = JSON.parse(b.extras_json || '[]');
    const items = JSON.stringify([
      { name: `Room ${nights(b.check_in, b.check_out)} night(s) - ${roomNumber}`, price: b.total, qty: 1 },
      ...(extras.length > 0 ? extras.map((e) => ({ name: e.name, price: e.price, qty: e.qty || 1 })) : []),
      ...(extra > 0 ? [{ name: 'Extra charges', price: extra, qty: 1 }] : []),
    ]);
    const r = await db.execute(
      'INSERT INTO bills (type, ref_id, guest_id, guest_name, items_json, subtotal, tax, total, payment_method, paid) VALUES (?,?,?,?,?,?,?,?,?,1)',
      ['ROOM', b.id, b.guest_id, g?.name || '', items, subtotal, tax, total, bd.method || 'cash']);
    await db.execute("UPDATE bookings SET status='checked_out' WHERE id=?", [path[1]]);
    await db.execute("UPDATE rooms SET status='available', hk_status='dirty' WHERE id=?", [b.room_id]);
    return NextResponse.json({ billId: Number(r.lastInsertRowid), total });
  }
  if (path[0] === 'bookings' && path[1] && path[2] === 'cancel' && method === 'POST') {
    const b = (await db.execute('SELECT * FROM bookings WHERE id=?', [path[1]])).rows[0];
    await db.execute("UPDATE bookings SET status='cancelled' WHERE id=?", [path[1]]);
    await db.execute("UPDATE rooms SET status='available' WHERE id=?", [b.room_id]);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'bookings' && path[1] && path[2] === 'confirm' && method === 'POST') {
    const b = (await db.execute('SELECT * FROM bookings WHERE id=?', [path[1]])).rows[0];
    if (!b) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    const overlap = (await db.execute(
      `SELECT id FROM bookings WHERE room_id=? AND id!=? AND status NOT IN ('cancelled','checked_out') AND check_in < ? AND check_out > ?`,
      [b.room_id, path[1], b.check_out, b.check_in]
    )).rows[0];
    if (overlap) return NextResponse.json({ error: 'Room is no longer available for the selected dates' }, { status: 409 });
    await db.execute("UPDATE bookings SET status='confirmed' WHERE id=?", [path[1]]);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'bookings' && path[1] && path[2] === 'mark-paid' && method === 'POST') {
    const b = await body(req);
    await db.execute("UPDATE bookings SET payment_status='paid', payment_method=? WHERE id=?", [b.method || 'cash', path[1]]);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'bookings' && path[1] && path[2] === 'update' && method === 'POST') {
    const b = (await db.execute('SELECT * FROM bookings WHERE id=?', [path[1]])).rows[0];
    if (!b) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    const bd = await body(req);
    if (['checked_out', 'cancelled'].includes(b.status)) return NextResponse.json({ error: 'This booking can no longer be edited' }, { status: 400 });
    const check_in = bd.check_in || b.check_in;
    const check_out = bd.check_out || b.check_out;
    const overlap = (await db.execute(
      `SELECT id FROM bookings WHERE room_id=? AND id!=? AND status NOT IN ('cancelled','checked_out') AND check_in < ? AND check_out > ?`,
      [b.room_id, path[1], check_out, check_in]
    )).rows[0];
    if (overlap) return NextResponse.json({ error: 'Room is not available for the selected dates' }, { status: 409 });
    const price = Number(b.total) / Math.max(1, nights(b.check_in, b.check_out));
    const total = price * nights(check_in, check_out);
    await db.execute(
      `UPDATE bookings SET check_in=?, check_out=?, adults=?, children=?, meal_plan=?, total=?, extras_json=? WHERE id=?`,
      [check_in, check_out, bd.adults || b.adults, bd.children || b.children, bd.meal_plan || b.meal_plan, total, JSON.stringify(bd.extras || JSON.parse(b.extras_json || '[]')), path[1]]);
    return NextResponse.json({ ok: true, total });
  }

  // ---------- availability ----------
  if (path[0] === 'availability' && method === 'GET') {
    const checkIn = url.searchParams.get('check_in');
    const checkOut = url.searchParams.get('check_out');
    const adults = Number(url.searchParams.get('adults') || 2);
    if (!checkIn || !checkOut) return NextResponse.json({ error: 'check_in and check_out are required' }, { status: 400 });
    const busy = (await db.execute(
      `SELECT DISTINCT room_id FROM bookings WHERE status NOT IN ('cancelled','checked_out') AND check_in < ? AND check_out > ?`,
      [checkOut, checkIn]
    )).rows.map((r) => r.room_id);
    const busySet = new Set(busy.map((id) => Number(id)));
    const types = (await db.execute('SELECT * FROM room_types ORDER BY price')).rows;
    const rooms = (await db.execute(
      `SELECT r.*, t.name AS type_name, t.price AS type_price FROM rooms r JOIN room_types t ON t.id=r.room_type_id ORDER BY r.number`
    )).rows;
    const n = nights(checkIn, checkOut);
    const freeRooms = rooms.filter((r) => r.status === 'available' && !busySet.has(Number(r.id)));
    const result = types.map((t) => {
      const fr = freeRooms.filter((r) => Number(r.room_type_id) === Number(t.id));
      return {
        ...t,
        amenities: (t.amenities || '').split(',').map((s) => s.trim()).filter(Boolean),
        total: Number(t.price) * n,
        freeCount: fr.length,
        freeRoomIds: fr.map((r) => r.id),
        capacity: t.capacity,
      };
    });
    return NextResponse.json({ nights: n, check_in: checkIn, check_out: checkOut, adults, roomTypes: result });
  }

  // ---------- restaurant menu ----------
  if (path[0] === 'menu' && method === 'GET') return NextResponse.json((await db.execute('SELECT * FROM menu_items ORDER BY category, name')).rows);
  if (path[0] === 'menu' && method === 'POST') {
    const { name, category, price } = await body(req);
    await db.execute('INSERT INTO menu_items (name, category, price, available) VALUES (?,?,?,1)', [name, category || 'main', price]);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'menu' && path[1] && method === 'PUT') {
    const { name, category, price, available } = await body(req);
    await db.execute('UPDATE menu_items SET name=?, category=?, price=?, available=? WHERE id=?', [name, category, price, available ? 1 : 0, path[1]]);
    return NextResponse.json({ ok: true });
  }

  // ---------- restaurant tables ----------
  if (path[0] === 'tables' && method === 'GET') return NextResponse.json((await db.execute('SELECT * FROM tables ORDER BY number')).rows);
  if (path[0] === 'tables' && method === 'POST') {
    const { number, seats } = await body(req);
    await db.execute('INSERT INTO tables (number, seats, status) VALUES (?,?,?)', [number, seats || 4, 'free']);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'tables' && path[1] && method === 'PUT') {
    const { seats, status } = await body(req);
    if (seats !== undefined && status !== undefined) {
      await db.execute('UPDATE tables SET seats=?, status=? WHERE id=?', [seats, status, path[1]]);
    } else if (seats !== undefined) {
      await db.execute('UPDATE tables SET seats=? WHERE id=?', [seats, path[1]]);
    } else if (status !== undefined) {
      await db.execute('UPDATE tables SET status=? WHERE id=?', [status, path[1]]);
    }
    return NextResponse.json({ ok: true });
  }

  // ---------- restaurant orders ----------
  if (path[0] === 'orders' && method === 'GET' && url.searchParams.get('scope') === 'kitchen') {
    const rows = (await db.execute("SELECT * FROM orders WHERE status IN ('open','kot') ORDER BY id DESC LIMIT 50")).rows;
    const out = [];
    for (const o of rows) {
      const items = (await db.execute("SELECT * FROM order_items WHERE order_id=? AND kot_status != 'served'", [o.id])).rows;
      if (items.length === 0) continue;
      const table = (await db.execute('SELECT number FROM tables WHERE id=?', [o.table_id])).rows[0];
      out.push({ ...o, table_no: table?.number || o.table_no, items });
    }
    return NextResponse.json(out);
  }
  if (path[0] === 'orders' && method === 'GET') {
    const rows = (await db.execute('SELECT * FROM orders ORDER BY id DESC LIMIT 50')).rows;
    for (const o of rows) {
      o.items = (await db.execute('SELECT * FROM order_items WHERE order_id=?', [o.id])).rows;
      o.total = o.items.reduce((s, i) => s + i.price * i.qty, 0);
    }
    return NextResponse.json(rows);
  }
  if (path[0] === 'orders' && method === 'POST' && !path[1]) {
    const b = await body(req);
    const r = await db.execute('INSERT INTO orders (table_no, status, table_id) VALUES (?,?,?)', [b.table_no || 'T1', 'open', b.table_id || 0]);
    return NextResponse.json({ id: Number(r.lastInsertRowid) });
  }
  if (path[0] === 'orders' && path[1] && path[2] === 'items' && method === 'POST') {
    const b = await body(req);
    for (const it of b.items) {
      await db.execute('INSERT INTO order_items (order_id, item_name, price, qty, kot_status, kot_time) VALUES (?,?,?,?,?,?)',
        [path[1], it.name, it.price, it.qty, it.kot_status || 'draft', it.kot_time || '']);
    }
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'orders' && path[1] && path[2] === 'kot' && method === 'POST') {
    const b = await body(req);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const ids = Array.isArray(b.ids) ? b.ids : [];
    if (ids.length === 0) return NextResponse.json({ error: 'No items selected' }, { status: 400 });
    const ph = ids.map(() => '?').join(',');
    await db.execute(`UPDATE order_items SET kot_status='new', kot_time=? WHERE id IN (${ph})`, [now, ...ids]);
    await db.execute("UPDATE orders SET status='kot' WHERE id=? AND status != 'paid'", [path[1]]);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'orders' && path[1] && path[2] === 'kot-status' && method === 'POST') {
    const b = await body(req);
    const st = b.status || 'served';
    if (b.itemId) {
      await db.execute('UPDATE order_items SET kot_status=? WHERE id=?', [st, b.itemId]);
    } else if (b.ids) {
      const ids = b.ids;
      const ph = ids.map(() => '?').join(',');
      await db.execute(`UPDATE order_items SET kot_status=? WHERE id IN (${ph})`, [st, ...ids]);
    }
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'orders' && path[1] && path[2] === 'pay' && method === 'POST') {
    const b = await body(req);
    const o = (await db.execute('SELECT * FROM orders WHERE id=?', [path[1]])).rows[0];
    const items = (await db.execute('SELECT * FROM order_items WHERE order_id=?', [path[1]])).rows;
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const settings = await getSettings();
    const taxRate = Number(settings.tax_rate || 5) / 100;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    const itemsJson = JSON.stringify(items.map((i) => ({ name: i.item_name, price: i.price, qty: i.qty })));
    const r = await db.execute(
      'INSERT INTO bills (type, ref_id, guest_id, guest_name, items_json, subtotal, tax, total, payment_method, paid) VALUES (?,?,?,?,?,?,?,?,?,1)',
      ['RESTAURANT', o.id, 0, b.guest_name || '', itemsJson, subtotal, tax, total, b.method || 'cash']);
    await db.execute("UPDATE orders SET status='paid' WHERE id=?", [path[1]]);
    if (o.table_id) await db.execute("UPDATE tables SET status='free' WHERE id=?", [o.table_id]);
    return NextResponse.json({ billId: Number(r.lastInsertRowid), total });
  }

  // ---------- housekeeping ----------
  if (path[0] === 'housekeeping' && method === 'GET') {
    const rows = (await db.execute(
      `SELECT h.*, r.number AS room_number, r.status AS room_status FROM housekeeping_tasks h JOIN rooms r ON r.id=h.room_id ORDER BY h.id DESC LIMIT 100`
    )).rows;
    return NextResponse.json(rows);
  }
  if (path[0] === 'housekeeping' && method === 'POST') {
    const { room_id, task, assignee, scheduled_at } = await body(req);
    await db.execute('INSERT INTO housekeeping_tasks (room_id, task, assignee, status, scheduled_at) VALUES (?,?,?,?,?)',
      [room_id, task || 'Full clean', assignee || '', 'pending', scheduled_at || '']);
    await db.execute("UPDATE rooms SET hk_status='in-progress' WHERE id=?", [room_id]);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'housekeeping' && path[1] && method === 'PUT') {
    const { status, assignee } = await body(req);
    const task = (await db.execute('SELECT * FROM housekeeping_tasks WHERE id=?', [path[1]])).rows[0];
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    if (status) {
      await db.execute('UPDATE housekeeping_tasks SET status=? WHERE id=?', [status, path[1]]);
      if (status === 'done') await db.execute("UPDATE rooms SET hk_status='clean' WHERE id=?", [task.room_id]);
    }
    if (assignee !== undefined) await db.execute('UPDATE housekeeping_tasks SET assignee=? WHERE id=?', [assignee, path[1]]);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'housekeeping' && path[1] && method === 'DELETE') {
    await db.execute('DELETE FROM housekeeping_tasks WHERE id=?', [path[1]]);
    return NextResponse.json({ ok: true });
  }

  // ---------- POS ----------
  if (path[0] === 'bills' && method === 'POST') {
    const b = await body(req);
    const { items, method: payMethod, guest_name, guest_id } = b;
    if (!items || items.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    const subtotal = items.reduce((s, i) => s + Number(i.price) * (i.qty || 1), 0);
    const settings = await getSettings();
    const taxRate = Number(settings.tax_rate || 5) / 100;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    const r = await db.execute(
      'INSERT INTO bills (type, ref_id, guest_id, guest_name, items_json, subtotal, tax, total, payment_method, paid) VALUES (?,?,?,?,?,?,?,?,?,1)',
      ['POS', 0, guest_id || 0, guest_name || '', JSON.stringify(items), subtotal, tax, total, payMethod || 'cash']);
    return NextResponse.json({ billId: Number(r.lastInsertRowid), total });
  }

  // ---------- bills & receipts ----------
  if (path[0] === 'bills' && method === 'GET' && !path[1]) {
    const rows = (await db.execute('SELECT * FROM bills ORDER BY id DESC LIMIT 100')).rows;
    for (const b of rows) b.items = JSON.parse(b.items_json || '[]');
    return NextResponse.json(rows);
  }
  if (path[0] === 'bills' && path[1] && method === 'GET') {
    const b = (await db.execute('SELECT * FROM bills WHERE id=?', [path[1]])).rows[0];
    if (!b) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    b.items = JSON.parse(b.items_json || '[]');
    return NextResponse.json(b);
  }
  if (path[0] === 'receipts' && path[1] && path[2] === 'html' && method === 'GET') {
    const b = (await db.execute('SELECT * FROM bills WHERE id=?', [path[1]])).rows[0];
    if (!b) return new Response('Bill not found', { status: 404 });
    const s = await getSettings();
    return new Response(htmlReceipt(b, s), { headers: { 'Content-Type': 'text/html' } });
  }
  if (path[0] === 'receipts' && path[1] && path[2] === 'escpos' && method === 'GET') {
    const b = (await db.execute('SELECT * FROM bills WHERE id=?', [path[1]])).rows[0];
    if (!b) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    const s = await getSettings();
    const buf = buildEscPos(b, s);
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename=receipt-${b.id}.bin`,
      },
    });
  }

  // ---------- reports ----------
  if (path[0] === 'reports' && path[1] === 'summary' && method === 'GET') {
    const today = new Date().toISOString().slice(0, 10);
    const total = (await db.execute('SELECT COUNT(*) c FROM rooms')).rows[0];
    const occupied = (await db.execute("SELECT COUNT(*) c FROM rooms WHERE status='occupied'")).rows[0];
    const rev = (await db.execute('SELECT COALESCE(SUM(total),0) s, COUNT(*) n FROM bills WHERE substr(created_at,1,10)=?', [today])).rows[0];
    const checkins = (await db.execute("SELECT COUNT(*) c FROM bookings WHERE status='checked_in'")).rows[0];
    const guests = (await db.execute('SELECT COUNT(*) c FROM guests')).rows[0];
    const openOrders = (await db.execute("SELECT COUNT(*) c FROM orders WHERE status IN ('open','kot')")).rows[0];
    const pending = (await db.execute("SELECT COUNT(*) c FROM bookings WHERE status='pending'")).rows[0];
    const byType = (await db.execute(
      `SELECT type, COALESCE(SUM(total),0) s, COUNT(*) n FROM bills WHERE substr(created_at,1,10)=? GROUP BY type`, [today]
    )).rows.map((r) => ({ type: r.type, revenue: Number(r.s), count: Number(r.n) }));
    const hkPending = (await db.execute("SELECT COUNT(*) c FROM housekeeping_tasks WHERE status != 'done'")).rows[0];
    const webNew = (await db.execute(
      "SELECT COUNT(*) c FROM bookings WHERE source='online' AND status IN ('pending','confirmed')")).rows[0];
    const unpaid = (await db.execute(
      "SELECT COUNT(*) c FROM bookings WHERE payment_status != 'paid' AND status IN ('confirmed','checked_in')")).rows[0];
    return NextResponse.json({
      totalRooms: Number(total.c), occupiedRooms: Number(occupied.c),
      occupancy: Math.round((Number(occupied.c) / Math.max(1, Number(total.c))) * 100),
      revenueToday: Number(rev.s), billsToday: Number(rev.n),
      checkedIn: Number(checkins.c), totalGuests: Number(guests.c), openOrders: Number(openOrders.c),
      pendingBookings: Number(pending.c), hkTasksPending: Number(hkPending.c), revenueByType: byType,
      newWebBookings: Number(webNew.c), unpaidBookings: Number(unpaid.c),
    });
  }
  if (path[0] === 'reports' && path[1] === 'web-bookings' && method === 'GET') {
    const rows = (await db.execute(
      `SELECT b.id, b.reference, b.status, b.total, b.check_in, b.check_out, b.created_at,
              g.name AS guest_name, r.number AS room_number, t.name AS room_type
       FROM bookings b
       JOIN guests g ON g.id=b.guest_id
       LEFT JOIN rooms r ON r.id=b.room_id
       LEFT JOIN room_types t ON t.id=r.room_type_id
       WHERE b.source='online' AND b.status IN ('pending','confirmed')
       ORDER BY b.created_at DESC LIMIT 15`
    )).rows;
    return NextResponse.json({ count: rows.length, bookings: rows });
  }
  if (path[0] === 'reports' && path[1] === 'bills' && method === 'GET') {
    const days = Math.min(90, Number(url.searchParams.get('days') || 30));
    const rows = (await db.execute(
      `SELECT * FROM bills WHERE created_at >= datetime('now', ?) ORDER BY id DESC LIMIT 500`, [`-${days} days`]
    )).rows;
    for (const b of rows) b.items = JSON.parse(b.items_json || '[]');
    return NextResponse.json(rows);
  }
  if (path[0] === 'reports' && path[1] === 'daily' && method === 'GET') {
    const days = Math.min(30, Number(url.searchParams.get('days') || 7));
    const rows = (await db.execute(
      `SELECT substr(created_at,1,10) d, COALESCE(SUM(total),0) s, COUNT(*) n FROM bills GROUP BY d ORDER BY d DESC LIMIT ?`, [days]
    )).rows.reverse();
    return NextResponse.json(rows.map((r) => ({ date: r.d, revenue: Number(r.s), bills: Number(r.n) })));
  }
  if (path[0] === 'reports' && path[1] === 'occupancy' && method === 'GET') {
    const rows = (await db.execute(
      `SELECT t.name, COUNT(*) total, SUM(CASE WHEN r.status='occupied' THEN 1 ELSE 0 END) occupied
       FROM rooms r JOIN room_types t ON t.id=r.room_type_id GROUP BY t.id, t.name`
    )).rows;
    return NextResponse.json(rows.map((r) => ({ name: r.name, total: Number(r.total), occupied: Number(r.occupied || 0) })));
  }

  // ---------- AI assistant (Groq) ----------
  if (path[0] === 'ai' && path[1] === 'chat' && method === 'POST') {
    const key = process.env.GROQ_API_KEY;
    const client = key ? new Groq({ apiKey: key }) : null;
    try {
      const b = await body(req);
      const result = await chat(b.message || '', client);
      return NextResponse.json(result);
    } catch (e) {
      return NextResponse.json({ reply: 'AI error: ' + (e.message || 'unknown').slice(0, 200) });
    }
  }

  // ---------- thermal printer (network ESC/POS via local bridge) ----------
  if (path[0] === 'printer' && path[1] === 'thermal' && method === 'POST') {
    const { ip, port, data } = await body(req); // data = base64 ESC/POS bytes
    if (!ip || !data) return NextResponse.json({ error: 'ip and data (base64) required' }, { status: 400 });
    return new Promise((resolve) => {
      const net = require('node:net');
      const sock = net.connect(port || 9100, ip, () => sock.write(Buffer.from(data, 'base64')));
      sock.on('error', (e) => resolve(NextResponse.json({ error: e.message }, { status: 502 })));
      sock.on('close', () => resolve(NextResponse.json({ ok: true })));
      setTimeout(() => sock.destroy(), 10000);
    });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function GET(req, ctx) { return handle(req, ctx.params); }
export async function POST(req, ctx) { return handle(req, ctx.params); }
export async function PUT(req, ctx) { return handle(req, ctx.params); }
export async function DELETE(req, ctx) { return handle(req, ctx.params); }