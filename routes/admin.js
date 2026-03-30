const express = require('express');
const router = express.Router();
const { Order, User, MenuItem, Category } = require('../models/db');

function requireAdmin(req, res, next) {
    if (!req.session.userId || req.session.userRole !== 'admin')
        return res.status(403).json({ error: 'Admin access required' });
    next();
}

// Get all orders (with user info populated)
router.get('/orders', requireAdmin, async (req, res) => {
    try {
        const ordersSnap = await Order.get();
        const orders = ordersSnap.docs.map(o => ({ id: o.id, ...o.data() }));

        const usersSnap = await User.get();
        const users = {};
        usersSnap.forEach(u => users[u.id] = u.data());

        orders.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
            return timeB - timeA;
        });

        const result = orders.map(o => ({
            ...o,
            order_time:   o.createdAt?.toDate ? o.createdAt.toDate() : o.createdAt,
            user_name:    users[o.user]?.name || 'Unknown',
            email:        users[o.user]?.email || '',
            items_summary: o.items.map(i => `${i.menu_item_name} x${i.quantity}`).join(', '),
        }));

        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Update order status
router.put('/orders/:id/status', requireAdmin, async (req, res) => {
    try {
        await Order.doc(req.params.id).update({ status: req.body.status });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Dashboard stats
router.get('/stats', requireAdmin, async (req, res) => {
    try {
        const ordersSnap = await Order.get();
        let totalRevenue = 0;
        ordersSnap.forEach(doc => {
            totalRevenue += doc.data().total_price || 0;
        });

        const usersSnap = await User.where('role', '==', 'student').get();
        const itemsSnap = await MenuItem.where('available', '==', true).get();

        res.json({
            totalOrders: ordersSnap.size,
            totalRevenue,
            totalUsers: usersSnap.size,
            totalItems: itemsSnap.size,
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get all menu items for admin (including unavailable)
router.get('/menu', requireAdmin, async (req, res) => {
    try {
        const itemsSnap = await MenuItem.get();
        const catsSnap = await Category.get();
        const cats = {};
        catsSnap.forEach(c => cats[c.id] = c.data().name);

        const result = itemsSnap.docs.map(doc => {
            const item = doc.data();
            return {
                ...item,
                id: doc.id,
                category_id:   item.category,
                category_name: cats[item.category] || '',
            };
        });
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch menu' });
    }
});

// Add menu item
router.post('/menu', requireAdmin, async (req, res) => {
    try {
        const { name, description, price, category_id, image_url } = req.body;
        const ref = await MenuItem.add({
            name, description, price, category: category_id, image_url, available: true
        });
        res.json({ success: true, id: ref.id });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create item' });
    }
});

// Update menu item
router.put('/menu/:id', requireAdmin, async (req, res) => {
    try {
        const { name, description, price, category_id, image_url, available } = req.body;
        await MenuItem.doc(req.params.id).update({
            name, description, price,
            category: category_id,
            image_url,
            available: available === 1 || available === true,
        });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// Soft-delete (hide) menu item
router.delete('/menu/:id', requireAdmin, async (req, res) => {
    try {
        await MenuItem.doc(req.params.id).update({ available: false });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to remove item' });
    }
});

module.exports = router;
