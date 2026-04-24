// check-db.ts - Run this to see if your database has data
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('restaurant.db');

console.log('\n========== CHECKING DATABASE ==========\n');

db.get("SELECT COUNT(*) as count FROM users", (err, result) => {
  console.log(`👥 Users: ${result?.count || 0}`);
});

db.get("SELECT COUNT(*) as count FROM orders", (err, result) => {
  console.log(`📦 Orders: ${result?.count || 0}`);
});

db.get("SELECT COUNT(*) as count FROM reservations", (err, result) => {
  console.log(`📅 Reservations: ${result?.count || 0}`);
});

db.get("SELECT COUNT(*) as count FROM menu_items", (err, result) => {
  console.log(`🍽️ Menu Items: ${result?.count || 0}`);
});

db.get("SELECT SUM(total_amount) as total FROM orders", (err, result) => {
  console.log(`💰 Revenue: $${result?.total || 0}`);
});

console.log('\n========================================\n');

db.close();