// fix-contact.ts - Run this once
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('restaurant.db');

db.run(`CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  subject TEXT,
  message TEXT,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

console.log('✅ Messages table created');
db.close();