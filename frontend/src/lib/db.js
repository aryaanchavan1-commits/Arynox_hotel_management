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
  image TEXT DEFAULT '',
  visible INTEGER DEFAULT 1
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
CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  emoji_hint TEXT DEFAULT '📡',
  enabled INTEGER DEFAULT 0,
  auto_sync INTEGER DEFAULT 1,
  practice INTEGER DEFAULT 1,
  credentials_json TEXT DEFAULT '{}',
  room_map_json TEXT DEFAULT '{}',
  rate_multiplier REAL DEFAULT 1.0,
  last_sync_at TEXT DEFAULT '',
  last_sync_status TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_code TEXT NOT NULL,
  direction TEXT DEFAULT 'push',
  status TEXT DEFAULT 'ok',
  message TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'main',
  price REAL NOT NULL,
  available INTEGER DEFAULT 1,
  image TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_no TEXT DEFAULT 'T1',
  status TEXT DEFAULT 'open',
  table_id INTEGER DEFAULT 0,
  source TEXT DEFAULT 'staff',
  customer_name TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  order_type TEXT DEFAULT 'dine_in',
  address TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS venues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 100,
  price REAL DEFAULT 0,
  description TEXT DEFAULT '',
  emoji TEXT DEFAULT '🎪',
  status TEXT DEFAULT 'available'
);
CREATE TABLE IF NOT EXISTS venue_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  customer_email TEXT DEFAULT '',
  event_date TEXT NOT NULL,
  event_type TEXT DEFAULT 'Wedding',
  guests INTEGER DEFAULT 100,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (venue_id) REFERENCES venues(id)
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
CREATE TABLE IF NOT EXISTS table_reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  date TEXT NOT NULL,
  time TEXT DEFAULT '19:00',
  guests INTEGER DEFAULT 2,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
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
    table_reservations: [['table_id', 'INTEGER DEFAULT 0'], ['source', "TEXT DEFAULT 'website'"]],
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
    await db.execute('INSERT INTO users (username, password_hash, name, role, enabled) VALUES (?, ?, ?, ?, 1)', ['admin', hash('admin123', salt), 'Hotel Lakshmi Elite Admin', 'admin']);
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

  // orders columns for online orders (existing DBs)
  for (const col of ['source', 'customer_name', 'customer_phone', 'order_type', 'address']) {
    try {
      await db.execute(`ALTER TABLE orders ADD COLUMN ${col} TEXT DEFAULT ''`);
    } catch {}
  }

  const venues = await db.execute('SELECT COUNT(*) AS c FROM venues');
  if (Number(venues.rows[0].c) === 0) {
    const v = [
      ['Grand Banquet Hall', 400, 50000, 'A majestic air-conditioned banquet hall for weddings, receptions and corporate galas with stage, lighting and catering support.', '🎪'],
      ['Rooftop Lawn', 300, 35000, 'Open-air rooftop lawn with panoramic city views — perfect for sangeet nights, cocktails and evening functions.', '🌃'],
      ['Executive Conference Hall', 60, 15000, 'Boardroom-style conference hall with projector, sound system and high-speed Wi-Fi for meetings and seminars.', '💼'],
    ];
    for (const [name, capacity, price, description, emoji] of v) {
      await db.execute('INSERT INTO venues (name, capacity, price, description, emoji, status) VALUES (?, ?, ?, ?, ?, ?)', [name, capacity, price, description, emoji, 'available']);
    }
  }

  // bookings channel columns (existing DBs)
  for (const col of ['channel', 'channel_ref']) {
    try {
      await db.execute(`ALTER TABLE bookings ADD COLUMN ${col} TEXT DEFAULT ''`);
    } catch {}
  }
  // rebuild bookings with nullable room_id so phone-only "inquiry" bookings can be stored (idempotent)
  try {
    const bk = await db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='bookings'");
    const ddl = (bk.rows[0] && bk.rows[0].sql) || '';
    if (/room_id INTEGER NOT NULL/.test(ddl)) {
      await db.execute(`CREATE TABLE IF NOT EXISTS bookings_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guest_id INTEGER NOT NULL,
        room_id INTEGER,
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
        id_proof_base64 TEXT DEFAULT '',
        id_proof_name TEXT DEFAULT '',
        id_proof_mime TEXT DEFAULT '',
        payment_status TEXT DEFAULT 'unpaid',
        payment_method TEXT DEFAULT '',
        payment_intent_id TEXT DEFAULT '',
        channel TEXT DEFAULT '',
        channel_ref TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (guest_id) REFERENCES guests(id),
        FOREIGN KEY (room_id) REFERENCES rooms(id)
      )`);
      await db.execute('INSERT INTO bookings_new (id, guest_id, room_id, check_in, check_out, adults, children, status, total, meal_plan, extras_json, source, reference, guest_account_id, id_proof_base64, id_proof_name, id_proof_mime, payment_status, payment_method, payment_intent_id, channel, channel_ref, created_at) SELECT id, guest_id, room_id, check_in, check_out, adults, children, status, total, meal_plan, extras_json, source, reference, guest_account_id, id_proof_base64, id_proof_name, id_proof_mime, payment_status, payment_method, payment_intent_id, channel, channel_ref, created_at FROM bookings');
      await db.execute('DROP TABLE bookings');
      await db.execute('ALTER TABLE bookings_new RENAME TO bookings');
    }
  } catch { /* already rebuilt or locked — skip */ }
  try {
    await db.execute("ALTER TABLE menu_items ADD COLUMN image TEXT DEFAULT ''");
  } catch {}
  try {
    await db.execute("ALTER TABLE room_types ADD COLUMN visible INTEGER DEFAULT 1");
  } catch {}

  const channels = await db.execute('SELECT COUNT(*) AS c FROM channels');
  if (Number(channels.rows[0].c) === 0) {
    const ch = [
      ['makemytrip', 'MakeMyTrip', '🛫'],
      ['bookingcom', 'Booking.com', '🅱️'],
      ['goibibo', 'Goibibo', '🚙'],
      ['agoda', 'Agoda', '🔵'],
      ['expedia', 'Expedia', '✈️'],
      ['airbnb', 'Airbnb', '🏠'],
      ['cleartrip', 'Cleartrip', '🧳'],
      ['paytm', 'Paytm Travel', '💛'],
    ];
    for (const [code, name, emoji] of ch) {
      await db.execute('INSERT INTO channels (code, name, enabled, auto_sync, practice, emoji_hint) VALUES (?,?,0,1,1,?)', [code, name, emoji]);
    }
  }
  const chx = await db.execute("SELECT COUNT(*) AS c FROM channels WHERE code='channex'");
  if (Number(chx.rows[0].c) === 0) {
    await db.execute("INSERT INTO channels (code, name, enabled, auto_sync, practice, emoji_hint) VALUES ('channex','Channex','0',1,1,'🔌')");
  }
  const ar = await db.execute("SELECT COUNT(*) AS c FROM channels WHERE code='axisrooms'");
  if (Number(ar.rows[0].c) === 0) {
    await db.execute("INSERT INTO channels (code, name, enabled, auto_sync, practice, emoji_hint) VALUES ('axisrooms','AxisRooms','0',1,1,'🎛️')");
  }

  const brand = 'Hotel Lakshmi Elite';
  const migrateBrand = (key, value) =>
    `INSERT INTO hotel_settings (key, value) VALUES ('${key}', '${value}')
     ON CONFLICT(key) DO UPDATE SET value = CASE WHEN hotel_settings.value IN ('Arynox Grand Hotel', 'ARYNOX HOTEL', 'Arynox', 'ARYNOX GRAND HOTEL', 'Arynox Hotel ERP', 'Arynox_Hotel_ERP', 'ARYNOX_HOTEL_ERP', 'Arynox Hotel ERP, Tech Park, Pune, India') THEN '${value}' ELSE hotel_settings.value END`;
  const ensureSetting = (key, value) =>
    `INSERT INTO hotel_settings (key, value) VALUES ('${key}', '${String(value).replace(/'/g, "''")}')
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`;
  // one-time branding rename (idempotent — no-op once done)
  await db.execute("UPDATE hotel_settings SET value=REPLACE(value,'Hotel Laxmi Elite','Hotel Lakshmi Elite') WHERE key IN ('hotel_name','welcome_message','about_text','footer_text','hotel_address','tagline')");
  await db.execute("UPDATE hotel_settings SET value=REPLACE(value,'Laxmi Elite','Lakshmi Elite') WHERE key IN ('hotel_name','welcome_message','about_text','footer_text','tagline')");
  await db.execute("UPDATE hotel_settings SET value=REPLACE(value,'Hotel Lakshmi Deluxe','Hotel Lakshmi Elite') WHERE key IN ('hotel_name','welcome_message','about_text','footer_text','hotel_address','tagline')");
  await db.execute("UPDATE hotel_settings SET value=REPLACE(value,'Lakshmi Deluxe','Lakshmi Elite') WHERE key IN ('hotel_name','welcome_message','about_text','footer_text','tagline')");
  await db.execute(migrateBrand('hotel_name', brand));
  await db.execute(migrateBrand('hotel_address', 'Narayanwadi, Pachwad Phata, Karad - 415539 (NH4 / Karad-Kolhapur Highway)'));
  await db.execute(migrateBrand('hotel_phone', '+91 99707 13675'));
  // real-business (Karad) contact fix — replaces any stale Pune/Rajwadu defaults
  await db.execute("UPDATE hotel_settings SET value='Narayanwadi, Pachwad Phata, Karad - 415539 (NH4 / Karad-Kolhapur Highway)' WHERE key='hotel_address' AND value LIKE '%Rajwadu%'");
  await db.execute("UPDATE hotel_settings SET value='+91 99707 13675' WHERE key IN ('hotel_phone','restaurant_phone') AND value LIKE '%98765 43210%'");
  // real hotel photos (idempotent — local files under /images/hotel)
  await db.execute("UPDATE room_types SET image='/images/hotel/room-deluxe.jpg' WHERE name='Standard Room' AND image LIKE '%unsplash%'");
  await db.execute("UPDATE room_types SET image='/images/hotel/room-balcony.jpg' WHERE name='Deluxe Room' AND image LIKE '%unsplash%'");
  await db.execute("UPDATE room_types SET image='/images/hotel/room-superdeluxe.jpg' WHERE name='Suite' AND image LIKE '%unsplash%'");
  await db.execute("UPDATE room_types SET image='/images/hotel/facade.jpg' WHERE name='Presidential Suite' AND image LIKE '%unsplash%'");
  await db.execute(migrateBrand('tax_rate', '5'));
  await db.execute(ensureSetting('currency_symbol', '₹'));
  await db.execute(ensureSetting('welcome_message', 'Restaurant · Lodging · Multipurpose Hall & Lawn'));
  await db.execute(ensureSetting('tagline', 'Dining · Lodging · Celebrations'));
  await db.execute(ensureSetting('primary_color', '#038C7F'));
  await db.execute(ensureSetting('secondary_color', '#F2C641'));
  await db.execute(ensureSetting('about_text', 'Hotel Lakshmi Elite in Karad is a complete hospitality destination on the NH4 / Karad-Kolhapur Highway at Narayanwadi — a pure-vegetarian restaurant serving Indian and local Maharashtrian favourites, comfortable air-conditioned lodging with 20 rooms, and a spacious multipurpose AC hall & lawn for weddings, functions and events, with free parking, power backup and warm service.'));
  await db.execute(ensureSetting('email', 'reservations@laxmielite.com'));
  await db.execute(ensureSetting('facilities_json', JSON.stringify([
    { icon: '🍽️', title: 'Vegetarian Restaurant', text: 'Indian & Maharashtrian favourites, family friendly' },
    { icon: '🏨', title: 'AC Lodging', text: '20 comfortable air-conditioned rooms' },
    { icon: '🎪', title: 'Multipurpose Hall & Lawn', text: 'AC hall, lawn & garden for weddings and functions' },
    { icon: '🎉', title: 'Event Packages', text: 'Decoration, sound system & buffet setup' },
    { icon: '🚗', title: 'Free Parking', text: 'Space for 50 cars & 100 bikes' },
    { icon: '🔋', title: 'Power Backup', text: 'Uninterrupted power for every event' },
  ])));
  await db.execute(ensureSetting('gallery_json', JSON.stringify([
    { emoji: '🛏️', label: 'AC Rooms', color: 'linear-gradient(135deg,#038C7F,#F2C641)' },
    { emoji: '🍽️', label: 'Family Dining', color: 'linear-gradient(135deg,#F2C641,#038C7F)' },
    { emoji: '🎪', label: 'Multipurpose Hall', color: 'linear-gradient(135deg,#038C7F,#2a9d8a)' },
    { emoji: '🌿', label: 'Open Lawn', color: 'linear-gradient(135deg,#2a9d8a,#F2C641)' },
  ])));
  await db.execute(ensureSetting('social_json', JSON.stringify({
    facebook: 'https://facebook.com/hotellaxmielite',
    instagram: 'https://instagram.com/hotellaxmielite',
    twitter: 'https://twitter.com/hotellaxmielite',
  })));
  await db.execute(ensureSetting('footer_text', 'Hotel Lakshmi Elite. All rights reserved.'));
  await db.execute(ensureSetting('restaurant_hours', 'Daily 7:00 AM – 11:00 PM'));
  await db.execute(ensureSetting('restaurant_about', 'A pure-vegetarian restaurant at Hotel Lakshmi Elite, Karad serving Indian and local Maharashtrian favourites — family dinners, birthdays, weddings and weekend food plans, with polite service and budget-friendly bills.'));
  await db.execute(ensureSetting('restaurant_phone', '+91 99707 13675'));
  // secrets/URLs: only set when absent, never overwrite saved values on re-init
  const ensureKeep = (key, value) =>
    `INSERT INTO hotel_settings (key, value) SELECT '${key}', '${String(value).replace(/'/g, "''")}'
     WHERE NOT EXISTS (SELECT 1 FROM hotel_settings WHERE key='${key}')`;
  await db.execute(ensureKeep('razorpay_key_id', ''));
  await db.execute(ensureKeep('razorpay_key_secret', ''));
  await db.execute(ensureKeep('razorpay_webhook_secret', ''));
  await db.execute(ensureKeep('api_base_url', ''));
  await db.execute(ensureKeep('website_url', ''));
  await db.execute("UPDATE users SET name='Hotel Lakshmi Elite Admin' WHERE username='admin' AND (name='Hotel Lakshmi Deluxe Admin' OR name='Hotel Laxmi Elite Admin')");
  // venues renamed to match the real property (Karad) — idempotent
  await db.execute("UPDATE venues SET name='AC Multipurpose Hall', emoji='🎪', description='Air-conditioned multipurpose hall at Hotel Lakshmi Elite, Karad — perfect for weddings, sangeet, receptions, birthdays and corporate functions with decoration, sound system and buffet setup.' WHERE name='Grand Banquet Hall'");
  await db.execute("UPDATE venues SET name='Open Lawn & Garden', emoji='🌿', description='Spacious open lawn and garden venue for outdoor celebrations — receptions, haldi, mehendi and evening functions under the sky.' WHERE name='Rooftop Lawn'");
  await db.execute("UPDATE venues SET name='Mini Function Hall', emoji='💼', description='Compact AC function hall ideal for small gatherings, meetings and family get-togethers with catering support.' WHERE name='Executive Conference Hall'");
  // order payment columns (guarded — idempotent)
  const ordCols = (await db.execute('PRAGMA table_info(orders)')).rows.map((c) => c.name);
  if (!ordCols.includes('payment_status')) await db.execute("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid'");
  if (!ordCols.includes('payment_method')) await db.execute("ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT ''");
  if (!ordCols.includes('payment_intent_id')) await db.execute("ALTER TABLE orders ADD COLUMN payment_intent_id TEXT DEFAULT ''");
  if (!ordCols.includes('email')) await db.execute("ALTER TABLE orders ADD COLUMN email TEXT DEFAULT ''");
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