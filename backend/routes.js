const express = require('express');
const crypto = require('crypto');
const { db, getSettings } = require('./db');
const { buildEscPos, htmlReceipt } = require('./receipt');
const { chat } = require('./ai');
const { Groq } = require('groq-sdk');

const router = express.Router();

// ---------- stateless auth (HMAC-signed token, serverless-safe) ----------
const JWT_SECRET = process.env.ARYNOX_JWT_SECRET || 'arynox-local-secret';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const b64j = (s) => Buffer.from(s, 'base64url').toString('utf8');

function signToken(payload) {
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 });
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + body).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + body).digest('base64url');
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(b64j(body));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

function hash(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
const SALT = 'arynox';

// ---------- auth ----------
router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const r = await db.execute('SELECT * FROM users WHERE username=?', [username]);
  const u = r.rows[0];
  if (!u || u.password_hash !== hash(password || '', SALT)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const token = signToken({ userId: u.id, username: u.username, name: u.name, role: u.role });
  res.json({ token, user: { name: u.name, role: u.role, username: u.username } });
});

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '') || req.query.token;
  const s = verifyToken(token);
  if (!s) return res.status(401).json({ error: 'Unauthorized' });
  req.user = s;
  next();
}
router.use(auth);
router.get('/auth/me', (req, res) => res.json(req.user));
router.get('/env-check', (req, res) => {
  res.json({
    hasGroq: !!process.env.GROQ_API_KEY,
    groqLen: (process.env.GROQ_API_KEY || '').length,
    hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
    hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
    port: process.env.PORT,
  });
});

// ---------- settings ----------
router.get('/settings', async (req, res) => res.json(await getSettings()));
router.put('/settings', async (req, res) => {
  for (const [k, v] of Object.entries(req.body || {})) {
    await db.execute('INSERT INTO hotel_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [k, String(v)]);
  }
  res.json(await getSettings());
});

// ---------- room types & rooms ----------
router.get('/room-types', async (req, res) => res.json((await db.execute('SELECT * FROM room_types')).rows));
router.post('/room-types', async (req, res) => {
  const { name, price, capacity, description } = req.body;
  await db.execute('INSERT INTO room_types (name, price, capacity, description) VALUES (?,?,?,?)', [name, price, capacity, description || '']);
  res.json({ ok: true });
});
router.put('/room-types/:id', async (req, res) => {
  const { name, price, capacity, description } = req.body;
  await db.execute('UPDATE room_types SET name=?, price=?, capacity=?, description=? WHERE id=?', [name, price, capacity, description, req.params.id]);
  res.json({ ok: true });
});

router.get('/rooms', async (req, res) => {
  const rows = (await db.execute(
    `SELECT r.*, t.name AS type_name, t.price AS type_price FROM rooms r JOIN room_types t ON t.id=r.room_type_id ORDER BY r.number`
  )).rows;
  res.json(rows);
});
router.post('/rooms', async (req, res) => {
  const { number, room_type_id, floor } = req.body;
  await db.execute('INSERT INTO rooms (number, room_type_id, floor, status) VALUES (?,?,?,?)', [number, room_type_id, floor || 1, 'available']);
  res.json({ ok: true });
});
router.put('/rooms/:id', async (req, res) => {
  const { status } = req.body;
  await db.execute('UPDATE rooms SET status=? WHERE id=?', [status, req.params.id]);
  res.json({ ok: true });
});

// ---------- guests ----------
router.get('/guests', async (req, res) => res.json((await db.execute('SELECT * FROM guests ORDER BY id DESC LIMIT 200')).rows));
router.get('/guests/search', async (req, res) => {
  const q = `%${req.query.q || ''}%`;
  res.json((await db.execute('SELECT * FROM guests WHERE name LIKE ? OR phone LIKE ? LIMIT 10', [q, q])).rows);
});
router.post('/guests', async (req, res) => {
  const { name, phone, email, id_type, id_number, address } = req.body;
  const r = await db.execute('INSERT INTO guests (name, phone, email, id_type, id_number, address) VALUES (?,?,?,?,?,?)',
    [name, phone || '', email || '', id_type || 'passport', id_number || '', address || '']);
  res.json({ id: Number(r.lastInsertRowid) });
});

// ---------- bookings ----------
router.get('/bookings', async (req, res) => {
  const rows = (await db.execute(
    `SELECT b.*, g.name AS guest_name, g.phone AS guest_phone, r.number AS room_number,
            t.name AS room_type FROM bookings b
     JOIN guests g ON g.id=b.guest_id JOIN rooms r ON r.id=b.room_id
     JOIN room_types t ON t.id=r.room_type_id ORDER BY b.id DESC LIMIT 200`
  )).rows;
  res.json(rows);
});

async function roomPrice(roomId) {
  const r = await db.execute('SELECT t.price FROM rooms r JOIN room_types t ON t.id=r.room_type_id WHERE r.id=?', [roomId]);
  return Number(r.rows[0]?.price || 0);
}
function nights(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
}

router.post('/bookings', async (req, res) => {
  const { guest_id, room_id, check_in, check_out, adults, children, status } = req.body;
  const price = await roomPrice(room_id);
  const total = price * nights(check_in, check_out);
  const r = await db.execute(
    'INSERT INTO bookings (guest_id, room_id, check_in, check_out, adults, children, status, total) VALUES (?,?,?,?,?,?,?,?)',
    [guest_id, room_id, check_in, check_out, adults || 1, children || 0, status || 'confirmed', total]);
  if (status !== 'confirmed') {
    await db.execute('UPDATE rooms SET status=? WHERE id=?', [status === 'checked_in' ? 'occupied' : 'available', room_id]);
  }
  res.json({ id: Number(r.lastInsertRowid), total });
});

router.post('/bookings/:id/checkin', async (req, res) => {
  const b = (await db.execute('SELECT * FROM bookings WHERE id=?', [req.params.id])).rows[0];
  await db.execute("UPDATE bookings SET status='checked_in' WHERE id=?", [req.params.id]);
  await db.execute("UPDATE rooms SET status='occupied' WHERE id=?", [b.room_id]);
  res.json({ ok: true });
});

router.post('/bookings/:id/checkout', async (req, res) => {
  const b = (await db.execute('SELECT * FROM bookings WHERE id=?', [req.params.id])).rows[0];
  const g = (await db.execute('SELECT name FROM guests WHERE id=?', [b.guest_id])).rows[0];
  const extra = Number(req.body.extra || 0);
  const settings = await getSettings();
  const taxRate = Number(settings.tax_rate || 5) / 100;
  const subtotal = Number(b.total) + extra;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const items = JSON.stringify([
    { name: `Room ${nights(b.check_in, b.check_out)} night(s) - ${(await db.execute('SELECT number FROM rooms WHERE id=?', [b.room_id])).rows[0].number}`, price: b.total, qty: 1 },
    ...(extra > 0 ? [{ name: 'Extra charges', price: extra, qty: 1 }] : []),
  ]);
  const r = await db.execute(
    'INSERT INTO bills (type, ref_id, guest_id, guest_name, items_json, subtotal, tax, total, payment_method, paid) VALUES (?,?,?,?,?,?,?,?,?,1)',
    ['ROOM', b.id, b.guest_id, g.name, items, subtotal, tax, total, req.body.method || 'cash']);
  await db.execute("UPDATE bookings SET status='checked_out' WHERE id=?", [req.params.id]);
  await db.execute("UPDATE rooms SET status='available' WHERE id=?", [b.room_id]);
  res.json({ billId: Number(r.lastInsertRowid), total });
});

router.post('/bookings/:id/cancel', async (req, res) => {
  const b = (await db.execute('SELECT * FROM bookings WHERE id=?', [req.params.id])).rows[0];
  await db.execute("UPDATE bookings SET status='cancelled' WHERE id=?", [req.params.id]);
  await db.execute("UPDATE rooms SET status='available' WHERE id=?", [b.room_id]);
  res.json({ ok: true });
});

// ---------- restaurant menu ----------
router.get('/menu', async (req, res) => res.json((await db.execute('SELECT * FROM menu_items ORDER BY category, name')).rows));
router.post('/menu', async (req, res) => {
  const { name, category, price } = req.body;
  await db.execute('INSERT INTO menu_items (name, category, price, available) VALUES (?,?,?,1)', [name, category || 'main', price]);
  res.json({ ok: true });
});
router.put('/menu/:id', async (req, res) => {
  const { name, category, price, available } = req.body;
  await db.execute('UPDATE menu_items SET name=?, category=?, price=?, available=? WHERE id=?', [name, category, price, available ? 1 : 0, req.params.id]);
  res.json({ ok: true });
});

// ---------- restaurant orders ----------
router.get('/orders', async (req, res) => {
  const rows = (await db.execute('SELECT * FROM orders ORDER BY id DESC LIMIT 50')).rows;
  for (const o of rows) {
    o.items = (await db.execute('SELECT * FROM order_items WHERE order_id=?', [o.id])).rows;
    o.total = o.items.reduce((s, i) => s + i.price * i.qty, 0);
  }
  res.json(rows);
});
router.post('/orders', async (req, res) => {
  const r = await db.execute('INSERT INTO orders (table_no, status) VALUES (?,?)', [req.body.table_no || 'T1', 'open']);
  res.json({ id: Number(r.lastInsertRowid) });
});
router.post('/orders/:id/items', async (req, res) => {
  for (const it of req.body.items) {
    await db.execute('INSERT INTO order_items (order_id, item_name, price, qty) VALUES (?,?,?,?)', [req.params.id, it.name, it.price, it.qty]);
  }
  res.json({ ok: true });
});
router.post('/orders/:id/pay', async (req, res) => {
  const o = (await db.execute('SELECT * FROM orders WHERE id=?', [req.params.id])).rows[0];
  const items = (await db.execute('SELECT * FROM order_items WHERE order_id=?', [req.params.id])).rows;
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const settings = await getSettings();
  const taxRate = Number(settings.tax_rate || 5) / 100;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const itemsJson = JSON.stringify(items.map((i) => ({ name: i.item_name, price: i.price, qty: i.qty })));
  const r = await db.execute(
    'INSERT INTO bills (type, ref_id, guest_id, guest_name, items_json, subtotal, tax, total, payment_method, paid) VALUES (?,?,?,?,?,?,?,?,?,1)',
    ['RESTAURANT', o.id, 0, req.body.guest_name || '', itemsJson, subtotal, tax, total, req.body.method || 'cash']);
  await db.execute("UPDATE orders SET status='paid' WHERE id=?", [req.params.id]);
  res.json({ billId: Number(r.lastInsertRowid), total });
});

// ---------- POS ----------
router.post('/bills', async (req, res) => {
  const { items, method, guest_name, guest_id } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });
  const subtotal = items.reduce((s, i) => s + Number(i.price) * (i.qty || 1), 0);
  const settings = await getSettings();
  const taxRate = Number(settings.tax_rate || 5) / 100;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const r = await db.execute(
    'INSERT INTO bills (type, ref_id, guest_id, guest_name, items_json, subtotal, tax, total, payment_method, paid) VALUES (?,?,?,?,?,?,?,?,?,1)',
    ['POS', 0, guest_id || 0, guest_name || '', JSON.stringify(items), subtotal, tax, total, method || 'cash']);
  res.json({ billId: Number(r.lastInsertRowid), total });
});

// ---------- bills & receipts ----------
router.get('/bills', async (req, res) => {
  const rows = (await db.execute('SELECT * FROM bills ORDER BY id DESC LIMIT 100')).rows;
  for (const b of rows) b.items = JSON.parse(b.items_json || '[]');
  res.json(rows);
});
router.get('/bills/:id', async (req, res) => {
  const b = (await db.execute('SELECT * FROM bills WHERE id=?', [req.params.id])).rows[0];
  if (!b) return res.status(404).json({ error: 'Bill not found' });
  b.items = JSON.parse(b.items_json || '[]');
  res.json(b);
});
router.get('/receipts/:id/html', async (req, res) => {
  const b = (await db.execute('SELECT * FROM bills WHERE id=?', [req.params.id])).rows[0];
  if (!b) return res.status(404).send('Bill not found');
  const s = await getSettings();
  res.setHeader('Content-Type', 'text/html');
  res.send(htmlReceipt(b, s));
});
router.get('/receipts/:id/escpos', async (req, res) => {
  const b = (await db.execute('SELECT * FROM bills WHERE id=?', [req.params.id])).rows[0];
  if (!b) return res.status(404).json({ error: 'Bill not found' });
  const s = await getSettings();
  const buf = buildEscPos(b, s);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename=receipt-${b.id}.bin`);
  res.send(buf);
});

// ---------- reports ----------
router.get('/reports/summary', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const total = (await db.execute('SELECT COUNT(*) c FROM rooms')).rows[0];
  const occupied = (await db.execute("SELECT COUNT(*) c FROM rooms WHERE status='occupied'")).rows[0];
  const rev = (await db.execute('SELECT COALESCE(SUM(total),0) s, COUNT(*) n FROM bills WHERE substr(created_at,1,10)=?', [today])).rows[0];
  const checkins = (await db.execute("SELECT COUNT(*) c FROM bookings WHERE status='checked_in'")).rows[0];
  const guests = (await db.execute('SELECT COUNT(*) c FROM guests')).rows[0];
  const openOrders = (await db.execute("SELECT COUNT(*) c FROM orders WHERE status='open'")).rows[0];
  res.json({
    totalRooms: Number(total.c), occupiedRooms: Number(occupied.c),
    occupancy: Math.round((Number(occupied.c) / Math.max(1, Number(total.c))) * 100),
    revenueToday: Number(rev.s), billsToday: Number(rev.n),
    checkedIn: Number(checkins.c), totalGuests: Number(guests.c), openOrders: Number(openOrders.c),
  });
});
router.get('/reports/daily', async (req, res) => {
  const days = Math.min(30, Number(req.query.days || 7));
  const rows = (await db.execute(
    `SELECT substr(created_at,1,10) d, COALESCE(SUM(total),0) s, COUNT(*) n FROM bills GROUP BY d ORDER BY d DESC LIMIT ?`, [days]
  )).rows.reverse();
  res.json(rows.map((r) => ({ date: r.d, revenue: Number(r.s), bills: Number(r.n) })));
});
router.get('/reports/occupancy', async (req, res) => {
  const rows = (await db.execute(
    `SELECT t.name, COUNT(*) total, SUM(CASE WHEN r.status='occupied' THEN 1 ELSE 0 END) occupied
     FROM rooms r JOIN room_types t ON t.id=r.room_type_id GROUP BY t.id, t.name`
  )).rows;
  res.json(rows.map((r) => ({ name: r.name, total: Number(r.total), occupied: Number(r.occupied || 0) })));
});

// ---------- AI assistant (Groq) ----------
router.post('/ai/chat', async (req, res) => {
  const key = process.env.GROQ_API_KEY;
  const client = key ? new Groq({ apiKey: key }) : null;
  try {
    const result = await chat(req.body.message || '', client);
    res.json(result);
  } catch (e) {
    res.json({ reply: 'AI error: ' + (e.message || 'unknown').slice(0, 200) });
  }
});

// ---------- thermal printer (network ESC/POS via local bridge) ----------
router.post('/printer/thermal', async (req, res) => {
  const { ip, port, data } = req.body; // data = base64 ESC/POS bytes
  if (!ip || !data) return res.status(400).json({ error: 'ip and data (base64) required' });
  const net = require('net');
  const sock = net.connect(port || 9100, ip, () => sock.write(Buffer.from(data, 'base64')));
  sock.on('error', (e) => res.status(502).json({ error: e.message }));
  sock.on('close', () => res.json({ ok: true }));
  setTimeout(() => sock.destroy(), 10000);
});

module.exports = { router };