require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// DB_LOCAL=true forces the offline file DB (used by run.bat); otherwise Turso when URL is set
const useTurso = !!process.env.TURSO_DATABASE_URL && process.env.DB_LOCAL !== 'true';
if (!useTurso && !fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
const db = createClient({
  url: useTurso ? process.env.TURSO_DATABASE_URL : 'file:./data/hotel.db',
  authToken: useTurso ? process.env.TURSO_AUTH_TOKEN : undefined,
});
console.log(`[db] using ${useTurso ? 'Turso (online)' : 'local file (offline: backend/data/hotel.db)'}`);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff'
);
CREATE TABLE IF NOT EXISTS room_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2,
  description TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT UNIQUE NOT NULL,
  room_type_id INTEGER NOT NULL,
  floor INTEGER DEFAULT 1,
  status TEXT DEFAULT 'available',
  FOREIGN KEY (room_type_id) REFERENCES room_types(id)
);
CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  id_type TEXT DEFAULT 'passport',
  id_number TEXT DEFAULT '',
  address TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  status TEXT DEFAULT 'confirmed',
  total REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (guest_id) REFERENCES guests(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'main',
  price REAL NOT NULL,
  available INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_no TEXT DEFAULT 'T1',
  status TEXT DEFAULT 'open',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  price REAL NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  ref_id INTEGER DEFAULT 0,
  guest_id INTEGER DEFAULT 0,
  guest_name TEXT DEFAULT '',
  items_json TEXT DEFAULT '[]',
  subtotal REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  total REAL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  paid INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS hotel_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

async function initSchema() {
  for (const stmt of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) {
    await db.execute(stmt);
  }
}

async function seed() {
  await initSchema();
  const crypto = require('crypto');
  function hash(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
  const salt = 'arynox';

  const users = await db.execute('SELECT COUNT(*) AS c FROM users');
  if (Number(users.rows[0].c) === 0) {
    await db.execute('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)', ['admin', hash('admin123', salt), 'Arynox Admin', 'admin']);
    await db.execute('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)', ['reception', hash('reception123', salt), 'Reception', 'staff']);
    console.log('[seed] users created (admin/admin123)');
  }

  const rt = await db.execute('SELECT COUNT(*) AS c FROM room_types');
  if (Number(rt.rows[0].c) === 0) {
    const types = [
      ['Standard Room', 1499, 2, 'Comfortable room with city view'],
      ['Deluxe Room', 2499, 3, 'Spacious room with sea view'],
      ['Suite', 4999, 4, 'Luxury suite with living area'],
      ['Presidential Suite', 9999, 5, 'Ultimate luxury experience'],
    ];
    for (const [name, price, cap, desc] of types) {
      await db.execute('INSERT INTO room_types (name, price, capacity, description) VALUES (?, ?, ?, ?)', [name, price, cap, desc]);
    }
    const rooms = [];
    for (let f = 1; f <= 4; f++) {
      for (let n = 1; n <= 5; n++) {
        const typeId = ((f + n) % 4) + 1;
        rooms.push([`${f}0${n}`, typeId, f, 'available']);
      }
    }
    for (const r of rooms) await db.execute('INSERT INTO rooms (number, room_type_id, floor, status) VALUES (?, ?, ?, ?)', r);
    console.log('[seed] 4 room types + 20 rooms created');
  }

  const menu = await db.execute('SELECT COUNT(*) AS c FROM menu_items');
  if (Number(menu.rows[0].c) === 0) {
    const items = [
      ['Masala Dosa', 'breakfast', 120], ['Idli Sambar', 'breakfast', 90], ['Poha', 'breakfast', 80],
      ['Veg Thali', 'lunch', 220], ['Paneer Butter Masala', 'lunch', 260], ['Dal Tadka', 'lunch', 180],
      ['Butter Chicken', 'dinner', 320], ['Biryani', 'dinner', 280], ['Tandoori Roti', 'dinner', 40],
      ['Cold Coffee', 'beverages', 150], ['Fresh Lime Soda', 'beverages', 90], ['Masala Chai', 'beverages', 50],
      ['Gulab Jamun', 'dessert', 90], ['Chocolate Brownie', 'dessert', 150],
    ];
    for (const [name, cat, price] of items) {
      await db.execute('INSERT INTO menu_items (name, category, price, available) VALUES (?, ?, ?, 1)', [name, cat, price]);
    }
    console.log('[seed] restaurant menu created (14 items)');
  }

  await db.execute('INSERT OR IGNORE INTO hotel_settings (key, value) VALUES (?, ?)', ['hotel_name', 'Arynox Grand Hotel']);
  await db.execute('INSERT OR IGNORE INTO hotel_settings (key, value) VALUES (?, ?)', ['hotel_address', 'Arynox Tech Park, Pune, India']);
  await db.execute('INSERT OR IGNORE INTO hotel_settings (key, value) VALUES (?, ?)', ['hotel_phone', '+91 98765 43210']);
  await db.execute('INSERT OR IGNORE INTO hotel_settings (key, value) VALUES (?, ?)', ['tax_rate', '5']);
}

seed().catch((e) => { console.error('[db] init failed', e); process.exit(1); });

async function getSettings() {
  const rows = await db.execute('SELECT * FROM hotel_settings');
  const s = {};
  rows.rows.forEach((r) => (s[r.key] = r.value));
  return s;
}

module.exports = { db, getSettings, useTurso };