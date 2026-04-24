// add-sample-data-simple.ts - NO bcrypt needed
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('restaurant.db');

console.log('\n========== ADDING SAMPLE DATA ==========\n');

// Create tables if they don't exist
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Menu items table
  db.run(`CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    price REAL,
    category TEXT,
    is_available INTEGER DEFAULT 1,
    image_url TEXT
  )`);

  // Reservations table
  db.run(`CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    email TEXT,
    phone TEXT,
    date TEXT,
    time TEXT,
    guests INTEGER,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Messages table
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    subject TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Orders table
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT,
    user_id INTEGER,
    total_amount REAL,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Settings table
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  // Clear existing data (optional - remove if you want to keep old data)
  db.run(`DELETE FROM users WHERE role = 'admin'`);
  db.run(`DELETE FROM menu_items`);
  db.run(`DELETE FROM reservations`);
  db.run(`DELETE FROM messages`);

  // Add admin user (plain password for testing)
  db.run(`INSERT INTO users (name, email, password, role) VALUES 
    ('Admin', 'admin@wag.com', 'admin123', 'admin')`);

  // Add sample menu items
  db.run(`INSERT INTO menu_items (name, description, price, category) VALUES 
    ('Wagyu Steak', 'Premium Japanese A5 Wagyu with truffle sauce', 89.99, 'Main'),
    ('Truffle Pasta', 'Fresh pasta with black truffle and parmesan', 34.99, 'Main'),
    ('Lobster Bisque', 'Creamy lobster soup with croutons', 18.99, 'Appetizer'),
    ('Caesar Salad', 'Romaine lettuce, parmesan, house dressing', 12.99, 'Appetizer'),
    ('Crème Brûlée', 'Classic French vanilla dessert', 12.99, 'Dessert'),
    ('Chocolate Fondant', 'Warm chocolate cake with vanilla ice cream', 14.99, 'Dessert')`);

  // Add sample reservation
  db.run(`INSERT INTO reservations (name, email, phone, date, time, guests, status) VALUES 
    ('John Doe', 'john@example.com', '9876543210', '2024-12-25', '19:00', 4, 'confirmed'),
    ('Sarah Smith', 'sarah@example.com', '9876543211', '2024-12-26', '20:00', 2, 'pending')`);

  // Add sample messages
  db.run(`INSERT INTO messages (name, email, subject, message, is_read) VALUES 
    ('Jane Wilson', 'jane@example.com', 'Birthday Dinner', 'I would like to book for 10 people on Dec 31st', 0),
    ('Mike Brown', 'mike@example.com', 'Private Event', 'Do you host private parties for 50 people?', 0),
    ('Emma Davis', 'emma@example.com', 'Dietary Restrictions', 'I have gluten allergy, can you accommodate?', 1)`);

  // Add sample order
  db.run(`INSERT INTO orders (order_number, user_id, total_amount, status, payment_status) VALUES 
    ('ORD-001', 1, 124.98, 'completed', 'paid'),
    ('ORD-002', 1, 89.99, 'pending', 'pending')`);

  // Add default settings
  db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES 
    ('restaurantName', 'WAG Luxury Dining'),
    ('restaurantHours', 'Mon-Sun: 5:00 PM - 11:00 PM'),
    ('restaurantPhone', '+977 9824223305'),
    ('restaurantAddress', 'Thamel, Kathmandu, Nepal'),
    ('taxRate', '13'),
    ('serviceCharge', '10')`);

  console.log('✅ Sample data added successfully!\n');
  console.log('📊 Admin Login:');
  console.log('   Email: admin@wag.com');
  console.log('   Password: admin123');
  console.log('');
  console.log('🍽️ Menu Items: 6 items added');
  console.log('📅 Reservations: 2 added');
  console.log('💬 Messages: 3 added');
  console.log('📦 Orders: 2 added');
});

db.close();