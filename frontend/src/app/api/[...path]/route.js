import { NextResponse } from 'next/server';
import { db, getSettings, ensureReady } from '@/lib/db';
import { signToken, verifyToken, hash, SALT } from '@/lib/auth';
import { buildEscPos, htmlReceipt } from '@/lib/receipt';
import { chat } from '@/lib/ai';
import { Groq } from 'groq-sdk';

export const runtime = 'nodejs';

const segs = (p) => (Array.isArray(p) ? p : p ? [p] : []);

function authUser(req, url) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '') || url.searchParams.get('token');
  return verifyToken(token);
}

async function body(req) {
  try { return await req.json(); } catch { return {}; }
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
  if (path[0] === 'auth' && path[1] === 'login' && method === 'POST') {
    const b = await body(req);
    const r = await db.execute('SELECT * FROM users WHERE username=?', [b.username]);
    const u = r.rows[0];
    if (!u || u.password_hash !== hash(b.password || '', SALT)) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
    const token = signToken({ userId: u.id, username: u.username, name: u.name, role: u.role });
    return NextResponse.json({ token, user: { name: u.name, role: u.role, username: u.username } });
  }

  // everything else requires a valid token
  const user = authUser(req, url);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try { await ensureReady(); } catch (e) { return NextResponse.json({ error: 'Database unavailable, retrying…' }, { status: 503 }); }

  // ---------- auth ----------
  if (path[0] === 'auth' && path[1] === 'me' && method === 'GET') {
    return NextResponse.json(user);
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

  // ---------- room types & rooms ----------
  if (path[0] === 'room-types' && method === 'GET') return NextResponse.json((await db.execute('SELECT * FROM room_types')).rows);
  if (path[0] === 'room-types' && method === 'POST') {
    const { name, price, capacity, description } = await body(req);
    await db.execute('INSERT INTO room_types (name, price, capacity, description) VALUES (?,?,?,?)', [name, price, capacity, description || '']);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'room-types' && path[1] && method === 'PUT') {
    const { name, price, capacity, description } = await body(req);
    await db.execute('UPDATE room_types SET name=?, price=?, capacity=?, description=? WHERE id=?', [name, price, capacity, description, path[1]]);
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
    await db.execute('INSERT INTO rooms (number, room_type_id, floor, status) VALUES (?,?,?,?)', [number, room_type_id, floor || 1, 'available']);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'rooms' && path[1] && method === 'PUT') {
    const { status } = await body(req);
    await db.execute('UPDATE rooms SET status=? WHERE id=?', [status, path[1]]);
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
  if (path[0] === 'bookings' && method === 'GET') {
    const rows = (await db.execute(
      `SELECT b.*, g.name AS guest_name, g.phone AS guest_phone, r.number AS room_number,
              t.name AS room_type FROM bookings b
       JOIN guests g ON g.id=b.guest_id JOIN rooms r ON r.id=b.room_id
       JOIN room_types t ON t.id=r.room_type_id ORDER BY b.id DESC LIMIT 200`
    )).rows;
    return NextResponse.json(rows);
  }
  if (path[0] === 'bookings' && method === 'POST' && !path[1]) {
    const { guest_id, room_id, check_in, check_out, adults, children, status } = await body(req);
    const price = await roomPrice(room_id);
    const total = price * nights(check_in, check_out);
    const r = await db.execute(
      'INSERT INTO bookings (guest_id, room_id, check_in, check_out, adults, children, status, total) VALUES (?,?,?,?,?,?,?,?)',
      [guest_id, room_id, check_in, check_out, adults || 1, children || 0, status || 'confirmed', total]);
    if (status !== 'confirmed') {
      await db.execute('UPDATE rooms SET status=? WHERE id=?', [status === 'checked_in' ? 'occupied' : 'available', room_id]);
    }
    return NextResponse.json({ id: Number(r.lastInsertRowid), total });
  }
  if (path[0] === 'bookings' && path[1] && path[2] === 'checkin' && method === 'POST') {
    const b = (await db.execute('SELECT * FROM bookings WHERE id=?', [path[1]])).rows[0];
    await db.execute("UPDATE bookings SET status='checked_in' WHERE id=?", [path[1]]);
    await db.execute("UPDATE rooms SET status='occupied' WHERE id=?", [b.room_id]);
    return NextResponse.json({ ok: true });
  }
  if (path[0] === 'bookings' && path[1] && path[2] === 'checkout' && method === 'POST') {
    const b = (await db.execute('SELECT * FROM bookings WHERE id=?', [path[1]])).rows[0];
    const g = (await db.execute('SELECT name FROM guests WHERE id=?', [b.guest_id])).rows[0];
    const bd = await body(req);
    const extra = Number(bd.extra || 0);
    const settings = await getSettings();
    const taxRate = Number(settings.tax_rate || 5) / 100;
    const subtotal = Number(b.total) + extra;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    const roomNumber = (await db.execute('SELECT number FROM rooms WHERE id=?', [b.room_id])).rows[0].number;
    const items = JSON.stringify([
      { name: `Room ${nights(b.check_in, b.check_out)} night(s) - ${roomNumber}`, price: b.total, qty: 1 },
      ...(extra > 0 ? [{ name: 'Extra charges', price: extra, qty: 1 }] : []),
    ]);
    const r = await db.execute(
      'INSERT INTO bills (type, ref_id, guest_id, guest_name, items_json, subtotal, tax, total, payment_method, paid) VALUES (?,?,?,?,?,?,?,?,?,1)',
      ['ROOM', b.id, b.guest_id, g.name, items, subtotal, tax, total, bd.method || 'cash']);
    await db.execute("UPDATE bookings SET status='checked_out' WHERE id=?", [path[1]]);
    await db.execute("UPDATE rooms SET status='available' WHERE id=?", [b.room_id]);
    return NextResponse.json({ billId: Number(r.lastInsertRowid), total });
  }
  if (path[0] === 'bookings' && path[1] && path[2] === 'cancel' && method === 'POST') {
    const b = (await db.execute('SELECT * FROM bookings WHERE id=?', [path[1]])).rows[0];
    await db.execute("UPDATE bookings SET status='cancelled' WHERE id=?", [path[1]]);
    await db.execute("UPDATE rooms SET status='available' WHERE id=?", [b.room_id]);
    return NextResponse.json({ ok: true });
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

  // ---------- restaurant orders ----------
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
    const r = await db.execute('INSERT INTO orders (table_no, status) VALUES (?,?)', [b.table_no || 'T1', 'open']);
    return NextResponse.json({ id: Number(r.lastInsertRowid) });
  }
  if (path[0] === 'orders' && path[1] && path[2] === 'items' && method === 'POST') {
    const b = await body(req);
    for (const it of b.items) {
      await db.execute('INSERT INTO order_items (order_id, item_name, price, qty) VALUES (?,?,?,?)', [path[1], it.name, it.price, it.qty]);
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
    return NextResponse.json({ billId: Number(r.lastInsertRowid), total });
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
    const openOrders = (await db.execute("SELECT COUNT(*) c FROM orders WHERE status='open'")).rows[0];
    return NextResponse.json({
      totalRooms: Number(total.c), occupiedRooms: Number(occupied.c),
      occupancy: Math.round((Number(occupied.c) / Math.max(1, Number(total.c))) * 100),
      revenueToday: Number(rev.s), billsToday: Number(rev.n),
      checkedIn: Number(checkins.c), totalGuests: Number(guests.c), openOrders: Number(openOrders.c),
    });
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