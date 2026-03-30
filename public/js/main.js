// ========== UTILITY FUNCTIONS ==========

// Cart management
// NOTE: item.id is a MongoDB ObjectId string — always compare as strings
const Cart = {
    get() { return JSON.parse(localStorage.getItem('cafe_cart') || '[]'); },
    save(items) { localStorage.setItem('cafe_cart', JSON.stringify(items)); updateCartBadge(); },
    add(item) {
        const cart = this.get();
        // Ensure id is always stored as a string
        const id = String(item.id);
        const existing = cart.find(c => String(c.id) === id);
        if (existing) existing.qty += 1;
        else cart.push({ ...item, id, qty: 1 });
        this.save(cart);
        showToast(`${item.name} added to cart! 🛒`, 'success');
    },
    remove(id) {
        const sid = String(id);
        const cart = this.get().filter(c => String(c.id) !== sid);
        this.save(cart);
    },
    update(id, qty) {
        const sid = String(id);
        const cart = this.get();
        const item = cart.find(c => String(c.id) === sid);
        if (item) {
            item.qty = qty;
            if (item.qty <= 0) { this.remove(sid); return; }
        }
        this.save(cart);
    },
    clear() { localStorage.removeItem('cafe_cart'); updateCartBadge(); },
    total() { return this.get().reduce((s, i) => s + i.price * i.qty, 0); },
    count() { return this.get().reduce((s, i) => s + i.qty, 0); }
};

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (badge) {
        const count = Cart.count();
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
    }
}

// Toast notifications
function showToast(msg, type = '') {
    let toast = document.getElementById('globalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalToast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    setTimeout(() => toast.classList.add('show'), 10);
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// Auth check
async function getAuthStatus() {
    try {
        const res = await fetch('/api/auth/status');
        return await res.json();
    } catch { return { loggedIn: false }; }
}

// Render navbar based on auth
async function initNav() {
    updateCartBadge();
    const auth = await getAuthStatus();
    const userSection = document.getElementById('navUserSection');
    if (!userSection) return;

    if (auth.loggedIn) {
        userSection.innerHTML = `
            <li><a href="/menu">Menu</a></li>
            <li><a href="/cart">🛒 Cart <span class="cart-badge" id="cartBadge" style="display:none">0</span></a></li>
            <li><a href="/orders">My Orders</a></li>
            ${auth.role === 'admin' ? '<li><a href="/admin/dashboard">⚙️ Admin</a></li>' : ''}
            <li><span style="color:#D4A054;font-size:0.85rem;">Hi, ${auth.name}</span></li>
            <li><button class="btn btn-outline" style="color:#C8B4A4;border-color:#C8B4A4;padding:0.4rem 1rem;" onclick="logout()">Logout</button></li>
        `;
        updateCartBadge();
    } else {
        userSection.innerHTML = `
            <li><a href="/menu">Menu</a></li>
            <li><a href="/login" class="btn btn-accent btn-sm">Login</a></li>
            <li><a href="/register" class="btn btn-outline btn-sm" style="color:#fff;border-color:#fff;">Register</a></li>
        `;
    }
}

async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    Cart.clear();
    window.location.href = '/';
}

// Format currency
function fmt(n) { return '₹' + parseFloat(n).toFixed(2); }

// Format date
function fmtDate(d) {
    return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

document.addEventListener('DOMContentLoaded', initNav);
