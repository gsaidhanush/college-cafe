require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const { FirestoreStore } = require('@google-cloud/connect-firestore');
const path       = require('path');

// Initialize Firebase models and DB
const { db } = require('./models/db');

const authRoutes  = require('./routes/auth');
const menuRoutes  = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/campus_cafe';

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session stored in Firestore so it survives server restarts
app.use(session({
    // Trust proxy is needed if running securely behind Render's load balancer
    secret:            process.env.SESSION_SECRET || 'cafe-secret-key',
    resave:            false,
    saveUninitialized: false,
    store: new FirestoreStore({
        dataset: db,
        kind: 'express-sessions',
    }),
    cookie: {
        httpOnly: true,
        maxAge:   1000 * 60 * 60 * 24,  // 1 day in ms
    },
}));

// ── API Routes ────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
    try {
        const hasEnvVar = !!process.env.FIREBASE_SERVICE_ACCOUNT;
        await db.collection('categories').limit(1).get();
        res.json({ status: 'ok', firebase_connected: true, has_service_account_env: hasEnvVar });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message, has_service_account_env: !!process.env.FIREBASE_SERVICE_ACCOUNT });
    }
});

app.use('/api/auth',   authRoutes);
app.use('/api/menu',   menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin',  adminRoutes);

// ── Frontend Pages ────────────────────────────────────────────────────────────
app.get('/',                     (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login',                (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register',             (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/menu',                 (req, res) => res.sendFile(path.join(__dirname, 'public', 'menu.html')));
app.get('/cart',                 (req, res) => res.sendFile(path.join(__dirname, 'public', 'cart.html')));
app.get('/orders',               (req, res) => res.sendFile(path.join(__dirname, 'public', 'orders.html')));
app.get('/admin/dashboard',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html')));
app.get('/admin/menu-management',(req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'menu-management.html')));
app.get('/admin/orders',         (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'orders.html')));

// Trust proxy so express-session knows it's HTTPS behind Render's load balancer
app.set('trust proxy', 1);

app.listen(PORT, () => {
    console.log(`✅ Campus Café running on port ${PORT}`);
    console.log(`   Admin panel → http://localhost:${PORT}/admin/dashboard`);
});

// Required for Vercel Serverless deployment
module.exports = app;
