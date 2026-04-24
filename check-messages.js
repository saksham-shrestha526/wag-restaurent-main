// check-messages.js
import Database from 'better-sqlite3';
const db = new Database('restaurant.db');

console.log('\n========== MESSAGES IN DATABASE ==========\n');

const messages = db.prepare('SELECT id, name, email, subject, message, created_at FROM messages ORDER BY id DESC LIMIT 5').all();

if (messages.length === 0) {
  console.log('❌ No messages found in database');
} else {
  console.log(`✅ Found ${messages.length} messages:\n`);
  messages.forEach(msg => {
    console.log(`ID: ${msg.id}`);
    console.log(`From: ${msg.name} (${msg.email})`);
    console.log(`Subject: ${msg.subject}`);
    console.log(`Message: ${msg.message.substring(0, 100)}...`);
    console.log(`Date: ${msg.created_at}`);
    console.log('---');
  });
}

console.log('\n==========================================\n');

db.close();