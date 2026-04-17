const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { verifyToken } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `product-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Hanya file gambar yang diizinkan'));
  },
});

// GET /api/products — Public
router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY category, name').all();
  res.json(products);
});

// GET /api/products/all — Admin
router.get('/all', verifyToken, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  res.json(products);
});

// POST /api/products — Admin
router.post('/', verifyToken, upload.single('image'), (req, res) => {
  const { name, category, price, description, stock } = req.body;
  if (!name || !category || !price) {
    return res.status(400).json({ error: 'Nama, kategori, dan harga wajib diisi' });
  }
  const image_filename = req.file ? req.file.filename : '';
  const result = db.prepare(
    'INSERT INTO products (name, category, price, description, image_filename, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)'
  ).run(name, category, parseInt(price), description || '', image_filename, parseInt(stock) ?? 1);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(product);
});

// PUT /api/products/:id — Admin
router.put('/:id', verifyToken, upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { name, category, price, description, stock, is_active } = req.body;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Produk tidak ditemukan' });

  let image_filename = existing.image_filename;
  if (req.file) {
    if (image_filename) {
      const old = path.join(uploadDir, image_filename);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    image_filename = req.file.filename;
  }

  db.prepare(
    'UPDATE products SET name=?, category=?, price=?, description=?, image_filename=?, stock=?, is_active=? WHERE id=?'
  ).run(
    name || existing.name,
    category || existing.category,
    price ? parseInt(price) : existing.price,
    description !== undefined ? description : existing.description,
    image_filename,
    stock !== undefined ? parseInt(stock) : existing.stock,
    is_active !== undefined ? parseInt(is_active) : existing.is_active,
    id
  );
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.json(updated);
});

// DELETE /api/products/:id — Admin
router.delete('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  if (existing.image_filename) {
    const p = path.join(uploadDir, existing.image_filename);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ message: 'Produk berhasil dihapus' });
});

module.exports = router;
