const express = require('express');
const router = express.Router();
const { Order, MenuItem } = require('../models/db');

function requireAuth(req, res, next) {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
    next();
}

// Place an order
router.post('/', requireAuth, async (req, res) => {
    const { items } = req.body; // [{ menu_item_id, quantity }]
    if (!items || !items.length)
        return res.status(400).json({ error: 'No items provided' });

    try {
        const ids = items.map(i => i.menu_item_id);
        const menuDocs = await Promise.all(ids.map(id => MenuItem.doc(id).get()));
        const menuItems = menuDocs.filter(d => d.exists).map(d => ({ _id: d.id, ...d.data() }));

        let total = 0;
        const orderItems = items.map(item => {
            const mi = menuItems.find(m => m._id === item.menu_item_id);
            if (!mi) return null;
            total += mi.price * item.quantity;
            return {
                menu_item:      mi._id,
                menu_item_name: mi.name,
                quantity:       item.quantity,
                price_at_time:  mi.price,
            };
        }).filter(Boolean);

        if (!orderItems.length)
            return res.status(400).json({ error: 'No valid items found' });

        const waitMinutes = Math.floor(Math.random() * 10) + 5;

        const orderRef = await Order.add({
            user:                   req.session.userId,
            items:                  orderItems,
            total_price:            parseFloat(total.toFixed(2)),
            estimated_wait_minutes: waitMinutes,
            createdAt:              new Date(),
        });

        res.json({ success: true, orderId: orderRef.id, total: total.toFixed(2), waitMinutes });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to place order' });
    }
});

// Get current user's orders
router.get('/my', requireAuth, async (req, res) => {
    try {
        const ordersSnap = await Order.where('user', '==', req.session.userId).get();
        const orders = ordersSnap.docs.map(o => ({ id: o.id, ...o.data() }));

        // Sort manually by createdAt to avoid needing a composite index in Firestore immediately
        orders.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
            return timeB - timeA;
        });

        const result = orders.map(o => ({
            ...o,
            order_time: o.createdAt?.toDate ? o.createdAt.toDate() : o.createdAt,
            items_summary: o.items.map(i => `${i.menu_item_name} x${i.quantity}`).join(', '),
        }));

        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

module.exports = router;
