import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DATA_DIR = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? '/app/data' : path.join(process.cwd(), 'data'));

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'restaurant.db');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

console.log(`🗄️  Database path: ${DB_PATH}`);
const db = new Database(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
  PRAGMA cache_size = -16000;
  PRAGMA temp_store = MEMORY;
`);

// ============ SCHEMA (all tables) ============
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
  const hashedPassword = bcrypt.hashSync(adminPassword, 8);
  db.prepare(
    'INSERT INTO users (email, password, name, nickname, customer_id, role, is_verified) VALUES (?, ?, ?, ?, ?, ?, 1)'
  ).run(adminEmail, hashedPassword, 'Admin', 'Admin', 'WAG-ADM-001', 'admin');
  console.log('✅ Admin user created');
} else if (adminExists.role !== 'admin') {
  db.prepare('UPDATE users SET role = ?, is_verified = 1 WHERE email = ?').run('admin', adminEmail);
  console.log('✅ Admin role restored');
}

// ============ SEED NEPALI MENU (16 ITEMS) ============
const menuCount = db.prepare('SELECT COUNT(*) as count FROM menu_items').get() as { count: number };
if (menuCount.count === 0) {
  const nepaliMenu = [
    // APPETIZER
    { name: 'Chicken Momo', description: 'Steamed dumplings with spicy sauce', price: 180, category: 'Appetizer', is_veg: 0, is_spicy: 1, image_url: 'https://picsum.photos/seed/momo/400/300' },
    { name: 'Buff Momo', description: 'Juicy buff dumplings with achar', price: 200, category: 'Appetizer', is_veg: 0, is_spicy: 1, image_url: 'https://picsum.photos/seed/momo2/400/300' },
    { name: 'Veg Momo', description: 'Soft vegetable dumplings', price: 150, category: 'Appetizer', is_veg: 1, is_spicy: 0, image_url: 'https://picsum.photos/seed/vegmomo/400/300' },
    { name: 'Chatpate', description: 'Spicy puffed rice snack', price: 100, category: 'Appetizer', is_veg: 1, is_spicy: 1, image_url: 'https://picsum.photos/seed/chatpate/400/300' },
    // MAIN COURSE
    { name: 'Dal Bhat Set', description: 'Rice, dal, vegetables and pickle', price: 350, category: 'Main Course', is_veg: 1, is_spicy: 0, image_url: 'https://picsum.photos/seed/dalbhat/400/300' },
    { name: 'Chicken Chowmein', description: 'Fried noodles with chicken', price: 220, category: 'Main Course', is_veg: 0, is_spicy: 0, image_url: 'https://picsum.photos/seed/chowmein/400/300' },
    { name: 'Thakali Khana Set', description: 'Traditional Nepali thali', price: 450, category: 'Main Course', is_veg: 0, is_spicy: 0, image_url: 'https://picsum.photos/seed/thakali/400/300' },
    { name: 'Buff Sukuti', description: 'Dry spicy buffalo meat', price: 480, category: 'Main Course', is_veg: 0, is_spicy: 1, image_url: 'https://picsum.photos/seed/sukuti/400/300' },
    // DESSERT
    { name: 'Juju Dhau', description: 'Sweet creamy yogurt', price: 150, category: 'Dessert', is_veg: 1, is_spicy: 0, image_url: 'https://picsum.photos/seed/juju/400/300' },
    { name: 'Kheer', description: 'Rice pudding with milk', price: 120, category: 'Dessert', is_veg: 1, is_spicy: 0, image_url: 'https://picsum.photos/seed/kheer/400/300' },
    { name: 'Sel Roti', description: 'Sweet rice bread', price: 180, category: 'Dessert', is_veg: 1, is_spicy: 0, image_url: 'https://picsum.photos/seed/selroti/400/300' },
    { name: 'Ice Cream', description: 'Cold sweet dessert', price: 100, category: 'Dessert', is_veg: 1, is_spicy: 0, image_url: 'https://picsum.photos/seed/icecream/400/300' },
    // DRINKS
    { name: 'Masala Tea', description: 'Hot milk tea with spices', price: 50, category: 'Drinks', is_veg: 1, is_spicy: 0, image_url: 'https://picsum.photos/seed/tea/400/300' },
    { name: 'Lassi', description: 'Sweet yogurt drink', price: 120, category: 'Drinks', is_veg: 1, is_spicy: 0, image_url: 'https://picsum.photos/seed/lassi/400/300' },
    { name: 'Lemon Soda', description: 'Fresh lemon with soda', price: 100, category: 'Drinks', is_veg: 1, is_spicy: 0, image_url: 'https://picsum.photos/seed/soda/400/300' },
    { name: 'Cold Drink', description: 'Chilled soft drink', price: 90, category: 'Drinks', is_veg: 1, is_spicy: 0, image_url: 'https://picsum.photos/seed/coke/400/300' }
  ];
  const insertMenu = db.prepare(`INSERT INTO menu_items (name, description, price, category, is_veg, is_spicy, image_url, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`);
  const insertMany = db.transaction((items: typeof nepaliMenu) => {
    for (const item of items) {
      insertMenu.run(item.name, item.description, item.price, item.category, item.is_veg, item.is_spicy, item.image_url);
    }
  });
  insertMany(nepaliMenu);
  console.log('✅ Nepali menu seeded (16 items)');
}

export { DATA_DIR, DB_PATH };
export default db;