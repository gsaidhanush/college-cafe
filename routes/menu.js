const express = require('express');
const router = express.Router();
const { MenuItem, Category } = require('../models/db');

// Get all available menu items (optionally filter by category)
router.get('/', async (req, res) => {
    try {
        let query = MenuItem.where('available', '==', true);
        if (req.query.category && req.query.category !== 'all') {
            query = query.where('category', '==', req.query.category);
        }
        const snapshot = await query.get();
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const catSnap = await Category.get();
        const cats = {};
        catSnap.forEach(doc => cats[doc.id] = doc.data().name);

        const result = items.map(item => ({
            ...item,
            category_id: item.category,
            category_name: cats[item.category] || '',
        }));
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch menu' });
    }
});

// Get all categories
router.get('/categories', async (req, res) => {
    try {
        const cats = await Category.get();
        res.json(cats.docs.map(c => ({ ...c.data(), id: c.id })));
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Get single menu item  — must come AFTER /categories
router.get('/:id', async (req, res) => {
    try {
        const docRef = await MenuItem.doc(req.params.id).get();
        if (!docRef.exists) return res.status(404).json({ error: 'Not found' });
        const item = docRef.data();

        let catName = '';
        if (item.category) {
            const catDoc = await Category.doc(item.category).get();
            if (catDoc.exists) catName = catDoc.data().name;
        }

        res.json({ ...item, id: docRef.id, category_name: catName, category_id: item.category });
    } catch (e) {
        res.status(500).json({ error: 'Error fetching item' });
    }
});

module.exports = router;
