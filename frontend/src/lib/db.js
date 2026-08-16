import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

// Load the repo-root .env (secrets) when running locally; on Vercel env vars come from the platform.
const rootEnv = path.resolve(process.cwd(), '..', '.env');
try {
  if (fs.existsSync(rootEnv)) {
    const content = fs.readFileSync(rootEnv, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
    }
  }
} catch (e) {}

// DB_LOCAL=true forces the offline file DB (run.bat / local dev); otherwise Turso when URL is set
export const useTurso = !!process.env.TURSO_DATABASE_URL && process.env.DB_LOCAL !== 'true';

let db;
if (useTurso) {
  db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
} else {
  const dataDir = path.resolve(process.cwd(), '..', 'backend', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  db = createClient({ url: 'file:' + path.join(dataDir, 'hotel.db') });
}

export { db };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  enabled INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS guest_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS room_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2,
  description TEXT DEFAULT '',
  amenities TEXT DEFAULT '',
  image TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT UNIQUE NOT NULL,
  room_type_id INTEGER NOT NULL,
  floor INTEGER DEFAULT 1,
  status TEXT DEFAULT 'available',
  hk_status TEXT DEFAULT 'clean',
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
  meal_plan TEXT DEFAULT 'room_only',
  extras_json TEXT DEFAULT '[]',
  source TEXT DEFAULT 'staff',
  reference TEXT DEFAULT '',
  guest_account_id INTEGER DEFAULT 0,
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
  table_id INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  price REAL NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  kot_status TEXT DEFAULT 'draft',
  kot_time TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS tables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT UNIQUE NOT NULL,
  seats INTEGER DEFAULT 4,
  status TEXT DEFAULT 'free'
);
CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  task TEXT DEFAULT 'Full clean',
  assignee TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  scheduled_at TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id)
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

async function tableColumns(table) {
  const r = await db.execute(`PRAGMA table_info(${table})`);
  return new Set(r.rows.map((c) => c.name));
}

async function migrate() {
  const cols = {
    users: [['enabled', 'INTEGER DEFAULT 1']],
    room_types: [['amenities', "TEXT DEFAULT ''"], ['image', "TEXT DEFAULT ''"]],
    rooms: [['hk_status', "TEXT DEFAULT 'clean'"]],
    bookings: [
      ["meal_plan", "TEXT DEFAULT 'room_only'"],
      ["extras_json", "TEXT DEFAULT '[]'"],
      ["source", "TEXT DEFAULT 'staff'"],
      ["reference", "TEXT DEFAULT ''"],
      ['guest_account_id', 'INTEGER DEFAULT 0'],
      ["id_proof_base64", "TEXT DEFAULT ''"],
      ["id_proof_name", "TEXT DEFAULT ''"],
      ["id_proof_mime", "TEXT DEFAULT ''"],
      ["payment_status", "TEXT DEFAULT 'unpaid'"],
      ["payment_method", "TEXT DEFAULT ''"],
      ["payment_intent_id", "TEXT DEFAULT ''"],
    ],
    orders: [['table_id', 'INTEGER DEFAULT 0']],
    order_items: [["kot_status", "TEXT DEFAULT 'draft'"], ["kot_time", "TEXT DEFAULT ''"]],
  };
  for (const [table, adds] of Object.entries(cols)) {
    let existing;
    try { existing = await tableColumns(table); } catch { continue; }
    for (const [name, ddl] of adds) {
      if (!existing.has(name)) {
        try { await db.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`); } catch (e) { /* ignore */ }
      }
    }
  }
}

async function seed() {
  await initSchema();
  await migrate();
  const crypto = await import('node:crypto');
  function hash(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
  const salt = 'arynox';

  const users = await db.execute('SELECT COUNT(*) AS c FROM users');
  if (Number(users.rows[0].c) === 0) {
    await db.execute('INSERT INTO users (username, password_hash, name, role, enabled) VALUES (?, ?, ?, ?, 1)', ['admin', hash('admin123', salt), 'Hotel Laxmi Elite Admin', 'admin']);
    await db.execute('INSERT INTO users (username, password_hash, name, role, enabled) VALUES (?, ?, ?, ?, 1)', ['reception', hash('reception123', salt), 'Reception', 'reception']);
    await db.execute('INSERT INTO users (username, password_hash, name, role, enabled) VALUES (?, ?, ?, ?, 1)', ['manager', hash('manager123', salt), 'Manager', 'manager']);
    await db.execute('INSERT INTO users (username, password_hash, name, role, enabled) VALUES (?, ?, ?, ?, 1)', ['kitchen', hash('kitchen123', salt), 'Kitchen Staff', 'kitchen']);
    await db.execute('INSERT INTO users (username, password_hash, name, role, enabled) VALUES (?, ?, ?, ?, 1)', ['restaurant', hash('restaurant123', salt), 'Restaurant Waiter', 'restaurant']);
    await db.execute('INSERT INTO users (username, password_hash, name, role, enabled) VALUES (?, ?, ?, ?, 1)', ['housekeeping', hash('housekeeping123', salt), 'Housekeeping', 'housekeeping']);
  }

  const rt = await db.execute('SELECT COUNT(*) AS c FROM room_types');
  if (Number(rt.rows[0].c) === 0) {
    const types = [
      ['Standard Room', 1499, 2, 'Comfortable room with city view', 'Wi-Fi, AC, TV, Work desk, Tea/coffee maker', ''],
      ['Deluxe Room', 2499, 3, 'Spacious room with sea view', 'Wi-Fi, AC, TV, Mini bar, Balcony, Work desk', ''],
      ['Suite', 4999, 4, 'Luxury suite with living area', 'Wi-Fi, AC, TV, Mini bar, Balcony, Bathtub, Sofa, Kitchenette', ''],
      ['Presidential Suite', 9999, 5, 'Ultimate luxury experience', 'Wi-Fi, AC, TV, Mini bar, Jacuzzi, Butler, Private dining, Smart home', ''],
    ];
    for (const [name, price, cap, desc, amenities, image] of types) {
      await db.execute('INSERT INTO room_types (name, price, capacity, description, amenities, image) VALUES (?, ?, ?, ?, ?, ?)', [name, price, cap, desc, amenities, image]);
    }
    const rooms = [];
    for (let f = 1; f <= 4; f++) {
      for (let n = 1; n <= 5; n++) {
        const typeId = ((f + n) % 4) + 1;
        rooms.push([`${f}0${n}`, typeId, f, 'available', 'clean']);
      }
    }
    for (const r of rooms) await db.execute('INSERT INTO rooms (number, room_type_id, floor, status, hk_status) VALUES (?, ?, ?, ?, ?)', r);
  }

  const tables = await db.execute('SELECT COUNT(*) AS c FROM tables');
  if (Number(tables.rows[0].c) === 0) {
    for (let i = 1; i <= 10; i++) {
      const seats = i % 4 === 0 ? 8 : i % 2 === 0 ? 4 : 2;
      await db.execute('INSERT INTO tables (number, seats, status) VALUES (?, ?, ?)', [`T${i}`, seats, 'free']);
    }
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
  }

  const brand = 'Hotel Laxmi Elite';
  const migrateBrand = (key, value) =>
    `INSERT INTO hotel_settings (key, value) VALUES ('${key}', '${value}')
     ON CONFLICT(key) DO UPDATE SET value = CASE WHEN hotel_settings.value IN ('Arynox Grand Hotel', 'ARYNOX HOTEL', 'Arynox', 'ARYNOX GRAND HOTEL', 'Arynox Hotel ERP', 'Arynox_Hotel_ERP', 'ARYNOX_HOTEL_ERP', 'Arynox Hotel ERP, Tech Park, Pune, India') THEN '${value}' ELSE hotel_settings.value END`;
  const ensureSetting = (key, value) =>
    `INSERT INTO hotel_settings (key, value) VALUES ('${key}', '${String(value).replace(/'/g, "''")}')
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`;
  await db.execute(migrateBrand('hotel_name', brand));
  await db.execute(migrateBrand('hotel_address', 'Hotel Laxmi Elite, Near Rajwadu Resort, Mumbai-Pune Expressway, Pune, India'));
  await db.execute(migrateBrand('hotel_phone', '+91 98765 43210'));
  await db.execute(migrateBrand('tax_rate', '5'));
  await db.execute(ensureSetting('currency_symbol', '₹'));
  await db.execute(ensureSetting('welcome_message', 'Luxury redefined at Hotel Laxmi Elite'));
  await db.execute(ensureSetting('tagline', 'Luxury · Dining · Celebration'));
  await db.execute(ensureSetting('primary_color', '#0f4c5b'));
  await db.execute(ensureSetting('secondary_color', '#b97926'));
  await db.execute(ensureSetting('about_text', 'Hotel Laxmi Elite is a premium luxury hotel in Pune offering elegantly appointed rooms, a signature multi-cuisine restaurant, a rooftop pool, and warm Indian hospitality for discerning business and leisure travellers.'));
  await db.execute(ensureSetting('email', 'reservations@laxmielite.com'));
  await db.execute(ensureSetting('facilities_json', JSON.stringify([
    { icon: '🌐', title: 'Free Wi-Fi', text: 'Ultra-fast Wi-Fi 6 in every room' },
    { icon: '🍽️', title: 'Aadhya Restaurant', text: 'Multi-cuisine dining & craft cocktails' },
    { icon: '🏊', title: 'Rooftop Pool', text: 'Infinity pool with city views' },
    { icon: '💼', title: 'Business Hub', text: 'Executive meeting rooms & co-working' },
    { icon: '🚗', title: 'Valet Parking', text: 'Secure valet for guests' },
    { icon: '🧘', title: 'Spa & Wellness', text: 'Full-service spa & yoga pavilion' },
  ])));
  await db.execute(ensureSetting('gallery_json', JSON.stringify([
    { emoji: '🛏️', label: 'Premier Rooms', color: 'linear-gradient(135deg,#0f4c5b,#b97926)' },
    { emoji: '🍽️', label: 'Aadhya Dining', color: 'linear-gradient(135deg,#b97926,#0f4c5b)' },
    { emoji: '🌇', label: 'Skyline', color: 'linear-gradient(135deg,#0f4c5b,#2a9d8a)' },
    { emoji: '🏊', label: 'Rooftop Pool', color: 'linear-gradient(135deg,#2a9d8a,#b97926)' },
  ])));
  await db.execute(ensureSetting('social_json', JSON.stringify({
    facebook: 'https://facebook.com/hotellaxmielite',
    instagram: 'https://instagram.com/hotellaxmielite',
    twitter: 'https://twitter.com/hotellaxmielite',
  })));
  await db.execute(ensureSetting('footer_text', 'Hotel Laxmi Elite. All rights reserved.'));
  await db.execute(ensureSetting('razorpay_key_id', ''));
  await db.execute(ensureSetting('razorpay_key_secret', ''));
  await db.execute(ensureSetting('razorpay_webhook_secret', ''));
  await db.execute(ensureSetting('api_base_url', ''));
  await db.execute("UPDATE users SET name='Hotel Laxmi Elite Admin' WHERE username='admin' AND name='Arynox Admin'");
}

let ready = false;
let initPromise = null;

export async function ensureReady() {
  if (ready) return;
  if (!initPromise) {
    initPromise = seed()
      .then(() => { ready = true; })
      .catch((e) => {
        console.error('[db] init failed, will retry on next request', e);
        initPromise = null;
        throw e;
      });
  }
  return initPromise;
}

export async function getSettings() {
  const rows = await db.execute('SELECT * FROM hotel_settings');
  const s = {};
  rows.rows.forEach((r) => (s[r.key] = r.value));
  return s;
}