// add-data.js
import Database from 'better-sqlite3';
const db = new Database('restaurant.db');

console.log('\n========== CHECKING DATABASE ==========\n');

// Check current counts
try {
  const users = db.prepare('SELECT COUNT(*) as c FROM users').get();
  const menu = db.prepare('SELECT COUNT(*) as c FROM menu_items').get();
  const reservations = db.prepare('SELECT COUNT(*) as c FROM reservations').get();
  const messages = db.prepare('SELECT COUNT(*) as c FROM messages').get();
  
  console.log('Current data in database:');
  console.log('📊 Users:', users.c);
  console.log('🍽️ Menu Items:', menu.c);
  console.log('📅 Reservations:', reservations.c);
  console.log('💬 Messages:', messages.c);
  
  // Add menu items if none
  if (menu.c === 0) {
    console.log('\n📝 Adding sample menu items...');
    const insert = db.prepare('INSERT INTO menu_items (name, description, price, category, is_veg, is_spicy, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insert.run('Wagyu Steak', 'Premium A5 Japanese Wagyu', 120, 'Main Course', 0, 0, 'https://images.unsplash.com/photo-1544025162-d76694265947');
    insert.run('Truffle Pasta', 'Handmade pasta with black truffle', 45, 'Main Course', 1, 0, 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601');
    insert.run('Lobster Bisque', 'Creamy lobster soup', 18, 'Appetizer', 0, 0, 'https://images.unsplash.com/photo-1547592180-85f173990554');
    insert.run('Crème Brûlée', 'Classic French dessert', 12, 'Dessert', 1, 0, 'https://images.unsplash.com/photo-1470324161839-ce2bb6fa6bc3');
    console.log('✅ Added 4 menu items');
  }
  
  // Add reservation if none
  if (reservations.c === 0) {
    console.log('📝 Adding sample reservation...');
    db.prepare('INSERT INTO reservations (name, email, phone, date, time, guests, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('John Doe', 'john@example.com', '1234567890', '2024-12-25', '19:00', 4, 'confirmed');
    console.log('✅ Added 1 reservation');
  }
  
  // Add message if none
  if (messages.c === 0) {
    console.log('📝 Adding sample message...');
    db.prepare('INSERT INTO messages (name, email, subject, message, is_read) VALUES (?, ?, ?, ?, ?)')
      .run('Jane Smith', 'jane@example.com', 'Birthday Dinner', 'I want to book for 10 people', 0);
    console.log('✅ Added 1 message');
  }
  
  console.log('\n========== UPDATED COUNTS ==========');
  console.log('Users:', db.prepare('SELECT COUNT(*) as c FROM users').get().c);
  console.log('Menu Items:', db.prepare('SELECT COUNT(*) as c FROM menu_items').get().c);
  console.log('Reservations:', db.prepare('SELECT COUNT(*) as c FROM reservations').get().c);
  console.log('Messages:', db.prepare('SELECT COUNT(*) as c FROM messages').get().c);
  console.log('====================================\n');
  
} catch (error) {
  console.error('Error:', error.message);
}

db.close();