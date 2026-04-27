const express = require('express');
const router = express.Router();
const db = require('../database');
const { verifyToken } = require('../middleware/auth');

async function generateOrderCode() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const isProd = process.env.DATABASE_URL ? true : false;
  
  // Cross-platform query for today's count
  const sql = isProd ? 
    "SELECT COUNT(*) as c FROM orders WHERE date(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE" :
    "SELECT COUNT(*) as c FROM orders WHERE date(created_at) = date('now','localtime')";
    
  const res = await db.safeGet(sql);
  const count = parseInt(res.c) + 1;
  return `DB-${date}-${String(count).padStart(3, '0')}`;
}

// POST /api/orders — Public (Customer)
router.post('/', async (req, res) => {
  const { customer_name, customer_phone, customer_address, delivery_type, items, notes, payment_method } = req.body;

  if (!customer_name || !customer_phone || !items || items.length === 0) {
    return res.status(400).json({ error: 'Data pelanggan dan item pesanan wajib diisi' });
  }
  if (delivery_type === 'delivery' && !customer_address) {
    return res.status(400).json({ error: 'Alamat pengiriman wajib diisi untuk opsi antar' });
  }

  let total_price = 0;
  const validatedItems = [];

  try {
    for (const item of items) {
      const product = await db.safeGet('SELECT * FROM products WHERE id = ? AND is_active = 1', [item.product_id]);
      if (!product) return res.status(400).json({ error: `Produk ID ${item.product_id} tidak ditemukan` });
      const qty = Math.max(1, parseInt(item.quantity));
      const subtotal = product.price * qty;
      total_price += subtotal;
      validatedItems.push({ product, qty, subtotal });
    }

    await db.beginTransaction();
    const code = await generateOrderCode();
    await db.safeRun(
      'INSERT INTO orders (order_code, customer_name, customer_phone, customer_address, delivery_type, total_price, status, payment_method, payment_status, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [code, customer_name, customer_phone, customer_address || '', delivery_type, total_price, 'menunggu', payment_method || 'cod', 'belum_bayar', notes || '']
    );

    // Get the ID of the order we just created
    const orderRecord = await db.safeGet('SELECT id FROM orders WHERE order_code = ?', [code]);
    const oid = orderRecord.id;

    for (const it of validatedItems) {
      await db.safeRun(
        'INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal) VALUES (?,?,?,?,?,?)',
        [oid, it.product.id, it.product.name, it.product.price, it.qty, it.subtotal]
      );
    }
    
    const order = await db.safeGet('SELECT * FROM orders WHERE id = ?', [oid]);
    await db.commit();
    res.status(201).json({ message: 'Pesanan berhasil dibuat', order_code: order.order_code, total_price: order.total_price, order_id: order.id });
  } catch (err) {
    await db.rollback().catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders — Admin
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, date_from, date_to, search } = req.query;
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status && status !== 'semua') { query += ' AND status = ?'; params.push(status); }
    if (date_from) { query += ' AND date(created_at) >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND date(created_at) <= ?'; params.push(date_to); }
    if (search) { query += ' AND (customer_name LIKE ? OR order_code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    query += ' ORDER BY created_at DESC';
    const list = await db.safeQuery(query, params);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id — Admin
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const order = await db.safeGet('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    const items = await db.safeQuery('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id/status — Admin
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['menunggu', 'diproses', 'selesai', 'dibatalkan'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Status tidak valid' });
    const order = await db.safeGet('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    await db.safeRun('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    const updated = await db.safeGet('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id/confirm-payment — Admin
router.put('/:id/confirm-payment', verifyToken, async (req, res) => {
  try {
    const order = await db.safeGet('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    await db.safeRun("UPDATE orders SET payment_status = 'sudah_bayar' WHERE id = ?", [req.params.id]);
    // Auto update status jika masih 'menunggu'
    if (order.status === 'menunggu') {
      await db.safeRun("UPDATE orders SET status = 'diproses' WHERE id = ?", [req.params.id]);
    }
    const updated = await db.safeGet('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
