import db from './src/lib/db.js';

const email = 'sakshamshrestha526@gmail.com';
const result = db.prepare("UPDATE users SET role = 'admin', is_verified = 1 WHERE email = ?").run(email);
console.log(`Updated ${result.changes} row(s).`);