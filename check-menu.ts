import db from './src/lib/db.ts';
const items = db.prepare('SELECT id, name, category, price, is_available FROM menu_items').all();
console.log('Total items:', items.length);
console.table(items.slice(0,5));
db.close();