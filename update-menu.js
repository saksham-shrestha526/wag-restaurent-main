import db from './src/lib/db.js';

const newMenu = [
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

try {
  console.log('🗑️ Deleting all existing menu items...');
  const deleteStmt = db.prepare('DELETE FROM menu_items');
  const deleteResult = deleteStmt.run();
  console.log(`✅ Deleted ${deleteResult.changes} items`);

  console.log('📝 Inserting new menu items...');
  const insert = db.prepare(`
    INSERT INTO menu_items (name, description, price, category, is_veg, is_spicy, image_url, is_available)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(item.name, item.description, item.price, item.category, item.is_veg, item.is_spicy, item.image_url);
    }
  });

  insertMany(newMenu);
  console.log(`✅ Inserted ${newMenu.length} items successfully!`);

  const count = db.prepare('SELECT COUNT(*) as count FROM menu_items').get();
  console.log(`📊 Total items in menu now: ${count.count}`);
} catch (err) {
  console.error('❌ Error:', err.message);
} finally {
  db.close();
}