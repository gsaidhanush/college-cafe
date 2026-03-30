const admin = require('firebase-admin');

// Initialize Firebase Admin (uses default credentials depending on environment)
admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'college-cafe-5487b'
});

const db = admin.firestore();

// ─── COLLECTIONS ────────────────────────────────────────────────────────────
const User     = db.collection('users');
const Category = db.collection('categories');
const MenuItem = db.collection('menuItems');
const Order    = db.collection('orders');

// ─── SEED DATA ───────────────────────────────────────────────────────────────
async function seedData() {
    try {
        const catSnapshot = await Category.limit(1).get();
        if (!catSnapshot.empty) return; // Already seeded

        const beveragesRef = Category.doc();
        const snacksRef    = Category.doc();
        const mealsRef     = Category.doc();

        await beveragesRef.set({ name: 'Beverages' });
        await snacksRef.set({ name: 'Snacks' });
        await mealsRef.set({ name: 'Meals' });

        const items = [
            { name: 'Coffee',       description: 'Hot brewed coffee',       price: 2.50, category: beveragesRef.id, image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400', available: true },
            { name: 'Burger',       description: 'Veg burger with fries',   price: 5.50, category: mealsRef.id,     image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', available: true },
            { name: 'Sandwich',     description: 'Grilled veg sandwich',    price: 4.00, category: snacksRef.id,    image_url: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=400', available: true },
            { name: 'Lemon Tea',    description: 'Fresh lemon tea',         price: 1.50, category: beveragesRef.id, image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400', available: true },
            { name: 'Samosa',       description: 'Crispy fried samosa',     price: 1.00, category: snacksRef.id,    image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400', available: true },
            { name: 'Pasta',        description: 'Creamy veg pasta',        price: 6.00, category: mealsRef.id,     image_url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400', available: true },
            { name: 'Cold Coffee',  description: 'Iced blended coffee',     price: 3.00, category: beveragesRef.id, image_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400', available: true },
            { name: 'Spring Rolls', description: 'Crispy veg spring rolls', price: 2.50, category: snacksRef.id,    image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', available: true },
            { name: 'Fried Rice',   description: 'Veg fried rice bowl',     price: 5.00, category: mealsRef.id,     image_url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400', available: true },
        ];

        const batch = db.batch();
        for (const item of items) {
            const ref = MenuItem.doc();
            item.createdAt = admin.firestore.FieldValue.serverTimestamp();
            item.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            batch.set(ref, item);
        }

        await batch.commit();
        console.log('✅ Database seeded with categories and menu items');
    } catch (err) {
        console.error('Seeding error:', err.message);
    }
}

// Ensure seed data runs on initialization
seedData();

module.exports = { admin, db, User, Category, MenuItem, Order };
