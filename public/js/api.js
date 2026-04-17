// ============================================================
// DapurBibi — API Layer & Utilities
// ============================================================

const API_BASE = '/api';

function getToken() { return localStorage.getItem('db_token'); }

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    if (options.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => ({ error: 'Invalid response' }));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// Auth
const Auth = {
  login: (username, password) => apiFetch('/auth/login', { method: 'POST', body: { username, password } }),
  verify: () => apiFetch('/auth/verify', { method: 'POST' }),
};

// Products
const Products = {
  getAll: () => apiFetch('/products'),
  getAllAdmin: () => apiFetch('/products/all'),
  create: (fd) => apiFetch('/products', { method: 'POST', body: fd }),
  update: (id, fd) => apiFetch(`/products/${id}`, { method: 'PUT', body: fd }),
  delete: (id) => apiFetch(`/products/${id}`, { method: 'DELETE' }),
};

// Orders
const Orders = {
  create: (data) => apiFetch('/orders', { method: 'POST', body: data }),
  getAll: (params = {}) => { const qs = new URLSearchParams(params).toString(); return apiFetch(`/orders${qs ? '?' + qs : ''}`); },
  getOne: (id) => apiFetch(`/orders/${id}`),
  updateStatus: (id, status) => apiFetch(`/orders/${id}/status`, { method: 'PUT', body: { status } }),
  confirmPayment: (id) => apiFetch(`/orders/${id}/confirm-payment`, { method: 'PUT' }),
};

// Reports
const Reports = {
  getSummary: (p = {}) => { const qs = new URLSearchParams(p).toString(); return apiFetch(`/reports/summary${qs ? '?' + qs : ''}`); },
  getDaily: (days = 7) => apiFetch(`/reports/daily?days=${days}`),
  getTopProducts: (p = {}) => { const qs = new URLSearchParams(p).toString(); return apiFetch(`/reports/top-products${qs ? '?' + qs : ''}`); },
  getTransactions: (p = {}) => { const qs = new URLSearchParams(p).toString(); return apiFetch(`/reports/transactions${qs ? '?' + qs : ''}`); },
};

// Cart (localStorage)
const Cart = {
  get: () => JSON.parse(localStorage.getItem('cart') || '[]'),
  save: (items) => localStorage.setItem('cart', JSON.stringify(items)),
  add(product) {
    const cart = this.get();
    const ex = cart.find(i => i.id === product.id);
    if (ex) ex.quantity += 1; else cart.push({ ...product, quantity: 1 });
    this.save(cart); return cart;
  },
  remove(id) { const c = this.get().filter(i => i.id !== id); this.save(c); return c; },
  updateQty(id, qty) {
    if (qty <= 0) return this.remove(id);
    const c = this.get(); const it = c.find(i => i.id === id);
    if (it) it.quantity = qty; this.save(c); return c;
  },
  clear: () => localStorage.removeItem('cart'),
  count: () => Cart.get().reduce((s, i) => s + i.quantity, 0),
  total: () => Cart.get().reduce((s, i) => s + i.price * i.quantity, 0),
};

// Formatters
function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}
function formatDate(ds) {
  return new Date(ds).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatDateShort(ds) {
  return new Date(ds).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Category helpers
function getCategoryColor(cat) {
  return { 'Makan Berat': '#FF6B35', 'Lauk Pauk': '#22C55E', 'Camilan': '#F59E0B', 'Minuman': '#3B82F6' }[cat] || '#9A7055';
}
function getCategoryEmoji(cat) {
  return { 'Makan Berat': '🍚', 'Lauk Pauk': '🍗', 'Camilan': '🍪', 'Minuman': '🥤' }[cat] || '🍽️';
}
function getProductImg(product, h = '180px') {
  if (product.image_filename) return `<img src="/uploads/${product.image_filename}" alt="${product.name}" style="width:100%;height:${h};object-fit:cover;">`;
  const c = getCategoryColor(product.category);
  const e = getCategoryEmoji(product.category);
  return `<div style="width:100%;height:${h};display:flex;align-items:center;justify-content:center;font-size:3rem;background:linear-gradient(135deg,${c}18,${c}30)">${e}</div>`;
}

// ─── Payment Info Config ─────────────────────────────────────────────────────
// Ganti data di bawah ini sesuai rekening bisnis Anda
const PAYMENT_INFO = {
  qris: {
    name: 'QRIS (Semua E-Wallet)',
    icon: '📱',
    instruction: 'Scan QRIS di bawah ini menggunakan GoPay, OVO, DANA, ShopeePay, atau m-banking apapun.',
    detail: 'QRIS DapurBibi',
    note: 'Tunjukkan bukti pembayaran kepada admin via WhatsApp setelah transfer.',
  },
  transfer_bca: {
    name: 'Transfer BCA',
    icon: '🏦',
    instruction: 'Transfer ke rekening BCA berikut:',
    detail: 'No. Rek: <strong>1234567890</strong><br>A.n: <strong>DapurBibi</strong>',
    note: 'Sertakan kode pesanan di berita transfer. Tunjukkan bukti transfer ke admin.',
  },
  transfer_bri: {
    name: 'Transfer BRI',
    icon: '🏦',
    instruction: 'Transfer ke rekening BRI berikut:',
    detail: 'No. Rek: <strong>0987654321</strong><br>A.n: <strong>DapurBibi</strong>',
    note: 'Sertakan kode pesanan di berita transfer. Tunjukkan bukti transfer ke admin.',
  },
  transfer_mandiri: {
    name: 'Transfer Mandiri',
    icon: '🏦',
    instruction: 'Transfer ke rekening Mandiri berikut:',
    detail: 'No. Rek: <strong>1122334455</strong><br>A.n: <strong>DapurBibi</strong>',
    note: 'Sertakan kode pesanan di berita transfer. Tunjukkan bukti transfer ke admin.',
  },
  gopay: {
    name: 'GoPay',
    icon: '📲',
    instruction: 'Kirim ke nomor GoPay berikut:',
    detail: 'No. GoPay: <strong>0812-3456-7890</strong><br>A.n: <strong>DapurBibi</strong>',
    note: 'Tunjukkan bukti pembayaran kepada admin setelah transfer.',
  },
  ovo: {
    name: 'OVO',
    icon: '📲',
    instruction: 'Kirim ke nomor OVO berikut:',
    detail: 'No. OVO: <strong>0812-3456-7890</strong><br>A.n: <strong>DapurBibi</strong>',
    note: 'Tunjukkan bukti pembayaran kepada admin setelah transfer.',
  },
  dana: {
    name: 'DANA',
    icon: '📲',
    instruction: 'Kirim ke akun DANA berikut:',
    detail: 'No. DANA: <strong>0812-3456-7890</strong><br>A.n: <strong>DapurBibi</strong>',
    note: 'Tunjukkan bukti pembayaran kepada admin setelah transfer.',
  },
  cod: {
    name: 'COD (Bayar di Tempat)',
    icon: '💵',
    instruction: 'Bayar langsung saat pesanan diantar atau saat diambil.',
    detail: 'Siapkan uang pas jika memungkinkan.',
    note: 'Admin akan konfirmasi pesanan Anda segera.',
  },
};

function getPaymentLabel(method) {
  return PAYMENT_INFO[method]?.name || method;
}
function getPaymentIcon(method) {
  return PAYMENT_INFO[method]?.icon || '💳';
}
