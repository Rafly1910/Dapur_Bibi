const express = require('express');
const router = express.Router();
const db = require('../database');
const { verifyToken } = require('../middleware/auth');

function generateOrderCode() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const count = db.prepare("SELECT COUNT(*) as c FROM orders WHERE date(created_at) = date('now','localtime')").get().c + 1;
  return `DB-${date}-${String(count).padStart(3, '0')}`;
}

// POST /api/orders — Public (Customer)
router.post('/', (req, res) => {
  const { customer_name, customer_phone, customer_address, delivery_type, items, notes, payment_method } = req.body;

  if (!customer_name || !customer_phone || !items || items.length === 0) {
    return res.status(400).json({ error: 'Data pelanggan dan item pesanan wajib diisi' });
  }
  if (delivery_type === 'delivery' && !customer_address) {
    return res.status(400).json({ error: 'Alamat pengiriman wajib diisi untuk opsi antar' });
  }

  let total_price = 0;
  const validatedItems = [];

  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.product_id);
    if (!product) return res.status(400).json({ error: `Produk ID ${item.product_id} tidak ditemukan` });
    const qty = Math.max(1, parseInt(item.quantity));
    const subtotal = product.price * qty;
    total_price += subtotal;
    validatedItems.push({ product, qty, subtotal });
  }

  try {
    db.exec('BEGIN TRANSACTION');
    const code = generateOrderCode();
    const r = db.prepare(
      'INSERT INTO orders (order_code, customer_name, customer_phone, customer_address, delivery_type, total_price, status, payment_method, payment_status, notes) VALUES (?,?,?,?,?,?,?,?,?,?)'
    ).run(code, customer_name, customer_phone, customer_address || '', delivery_type, total_price, 'menunggu', payment_method || 'cod', 'belum_bayar', notes || '');

    const oid = r.lastInsertRowid;
    for (const it of validatedItems) {
      db.prepare(
        'INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal) VALUES (?,?,?,?,?,?)'
      ).run(oid, it.product.id, it.product.name, it.product.price, it.qty, it.subtotal);
    }
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(oid);
    db.exec('COMMIT');
    res.status(201).json({ message: 'Pesanan berhasil dibuat', order_code: order.order_code, total_price: order.total_price, order_id: order.id });
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders — Admin
router.get('/', verifyToken, (req, res) => {
  const { status, date_from, date_to, search } = req.query;
  let query = 'SELECT * FROM orders WHERE 1=1';
  const params = [];

  if (status && status !== 'semua') { query += ' AND status = ?'; params.push(status); }
  if (date_from) { query += ' AND date(created_at) >= ?'; params.push(date_from); }
  if (date_to) { query += ' AND date(created_at) <= ?'; params.push(date_to); }
  if (search) { query += ' AND (customer_name LIKE ? OR order_code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/orders/:id — Admin
router.get('/:id', verifyToken, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
  res.json({ ...order, items });
});

// PUT /api/orders/:id/status — Admin
router.put('/:id/status', verifyToken, (req, res) => {
  const { status } = req.body;
  const valid = ['menunggu', 'diproses', 'selesai', 'dibatalkan'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Status tidak valid' });
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id));
});

// PUT /api/orders/:id/confirm-payment — Admin
router.put('/:id/confirm-payment', verifyToken, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  db.prepare("UPDATE orders SET payment_status = 'sudah_bayar' WHERE id = ?").run(req.params.id);
  // Auto update status jika masih 'menunggu'
  if (order.status === 'menunggu') {
    db.prepare("UPDATE orders SET status = 'diproses' WHERE id = ?").run(req.params.id);
  }
  res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id));
});

module.exports = router;
