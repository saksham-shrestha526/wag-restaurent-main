import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// ============ PERSISTENT VOLUME SUPPORT ============
const DATA_DIR =
  process.env.DATA_DIR ||
  (process.env.NODE_ENV === 'production' ? '/app/data' : path.join(process.cwd(), 'data'));

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`📁 Created data directory: ${DATA_DIR}`);
}

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'restaurant.db');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`🗄️  Database path: ${DB_PATH}`);
const db = new Database(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
  PRAGMA cache_size = -16000;
  PRAGMA temp_store = MEMORY;
`);

// ============ SCHEMA ============
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    nickname TEXT,
    role TEXT DEFAULT 'user',
    avatar_url TEXT,
    phone TEXT,
    loyalty_points INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    stripe_customer_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE,
    user_id INTEGER NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    service_charge REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT,
    shipping_name TEXT,
    shipping_email TEXT,
    shipping_address TEXT,
    shipping_phone TEXT,
    order_notes TEXT,
    points_earned INTEGER DEFAULT 0,
    stripe_session_id TEXT,
    payment_intent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    is_veg BOOLEAN DEFAULT 0,
    is_spicy BOOLEAN DEFAULT 0,
    is_available BOOLEAN DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    guests INTEGER NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS email_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS newsletter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    provider TEXT,
    last4 TEXT,
    expiry TEXT,
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
  CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
  CREATE INDEX IF NOT EXISTS idx_reservations_email ON reservations(email);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON user_notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_customer_id ON users(customer_id);
`);

// ============ SAFE MIGRATIONS ============
function addColumnIfMissing(table: string, column: string, definition: string) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    if (!cols.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
      console.log(`✅ Migration: added ${table}.${column}`);
    }
  } catch (e: any) {
    console.warn(`Migration warning (${table}.${column}):`, e.message);
  }
}

addColumnIfMissing('users', 'nickname', 'TEXT');
addColumnIfMissing('users', 'customer_id', 'TEXT');
addColumnIfMissing('users', 'stripe_customer_id', 'TEXT');
addColumnIfMissing('users', 'is_verified', 'INTEGER DEFAULT 0');
addColumnIfMissing('orders', 'order_number', 'TEXT');
addColumnIfMissing('orders', 'subtotal', 'REAL DEFAULT 0');
addColumnIfMissing('orders', 'tax', 'REAL DEFAULT 0');
addColumnIfMissing('orders', 'service_charge', 'REAL DEFAULT 0');
addColumnIfMissing('orders', 'payment_status', "TEXT DEFAULT 'pending'");
addColumnIfMissing('orders', 'payment_method', 'TEXT');
addColumnIfMissing('orders', 'shipping_name', 'TEXT');
addColumnIfMissing('orders', 'shipping_email', 'TEXT');
addColumnIfMissing('orders', 'shipping_address', 'TEXT');
addColumnIfMissing('orders', 'shipping_phone', 'TEXT');
addColumnIfMissing('orders', 'order_notes', 'TEXT');
addColumnIfMissing('orders', 'stripe_session_id', 'TEXT');
addColumnIfMissing('orders', 'payment_intent_id', 'TEXT');
addColumnIfMissing('orders', 'points_earned', 'INTEGER DEFAULT 0');

// ============ DEFAULT SETTINGS ============
const defaultSettings: Record<string, string> = {
  map_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3549.336140598854!2d85.02534837544837!3d27.323683076694692!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb4b4430e303db%3A0xc4767bd868bba15a!2sHetauda!5e0!3m2!1sen!2snp!4v1713510000000!5m2!1sen!2snp',
  restaurantName: 'WAG Luxury Dining',
  restaurantHours: 'Mon-Sun: 5:00 PM - 11:00 PM',
  restaurantPhone: '+977 1 4235678',
  restaurantAddress: 'Thamel, Kathmandu, Nepal',
  taxRate: '13',
  serviceCharge: '10',
};
const upsertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultSettings)) {
  upsertSetting.run(key, value);
}

// ============ SEED ADMIN USER ============
const adminEmail = process.env.MAIL_USERNAME || 'sakshamshrestha526@gmail.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'otaku@2060';

const adminExists = db.prepare('SELECT id, role FROM users WHERE email = ?').get(adminEmail) as any;
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);
  db.prepare(
    'INSERT INTO users (email, password, name, nickname, customer_id, role, is_verified) VALUES (?, ?, ?, ?, ?, ?, 1)'
  ).run(adminEmail, hashedPassword, 'Admin', 'Admin', 'WAG-ADM-001', 'admin');
  console.log('✅ Admin user created');
} else if (adminExists.role !== 'admin') {
  db.prepare('UPDATE users SET role = ?, is_verified = 1 WHERE email = ?').run('admin', adminEmail);
  console.log('✅ Admin role restored');
}

// ============ SEED MENU ============
const menuCount = db.prepare('SELECT COUNT(*) as count FROM menu_items').get() as { count: number };
if (menuCount.count === 0) {
  const seedMenu = [
    { name: 'Golden Truffle Pasta', description: 'Handmade tagliatelle with black truffle and 24k gold leaf.', price: 45.00, category: 'Main Course', is_veg: 1, is_spicy: 0, image_url: 'https://picsum.photos/seed/pasta/400/300' },
    { name: 'Saffron Risotto', description: 'Creamy Arborio rice infused with premium saffron and parmesan.', price: 38.00, category: 'Main Course', is_veg: 1, is_spicy: 0, image_url: 'https://picsum.photos/seed/risotto/400/300' },
    { name: 'Wagyu Steak', description: 'A5 Grade Wagyu beef served with gold-dusted asparagus.', price: 120.00, category: 'Main Course', is_veg: 0, is_spicy: 0, image_url: 'https://picsum.photos/seed/steak/400/300' },
    { name: 'Spicy Dragon Roll', description: 'Premium tuna with spicy mayo and gold flakes.', price: 28.00, category: 'Appetizer', is_veg: 0, is_spicy: 1, image_url: 'https://picsum.photos/seed/sushi/400/300' },
    { name: 'Gold Leaf Chocolate Dome', description: 'Dark chocolate dome with gold leaf and raspberry coulis.', price: 18.00, category: 'Dessert', is_veg: 1, is_spicy: 0, image_url: 'https://picsum.photos/seed/dessert/400/300' },
    { name: 'Tiramisu Royale', description: 'Classic tiramisu with gold-dusted espresso beans.', price: 15.00, category: 'Dessert', is_veg: 1, is_spicy: 0, image_url: 'https://picsum.photos/seed/tiramisu/400/300' },
    { name: 'Golden Martini', description: 'Premium vodka with edible gold flakes and a twist of lemon.', price: 22.00, category: 'Drinks', is_veg: 1, is_spicy: 0, image_url: 'https://picsum.photos/seed/cocktail/400/300' },
    { name: 'Vintage Reserve Wine', description: 'A glass of our finest vintage red wine.', price: 25.00, category: 'Drinks', is_veg: 1, is_spicy: 0, image_url: 'https://picsum.photos/seed/wine/400/300' },
  ];
  const insertMenu = db.prepare(
    'INSERT INTO menu_items (name, description, price, category, is_veg, is_spicy, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertMany = db.transaction((items: typeof seedMenu) => {
    for (const item of items) {
      insertMenu.run(item.name, item.description, item.price, item.category, item.is_veg, item.is_spicy, item.image_url);
    }
  });
  insertMany(seedMenu);
  console.log('✅ Menu items seeded');
}

export { DATA_DIR, DB_PATH };
export default db;