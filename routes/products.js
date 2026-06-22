const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { verifyToken } = require('../middleware/auth');

const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';
const uploadDir = path.join(__dirname, '../uploads');

const storage = isVercel ? multer.memoryStorage() : multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
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

// GET /api/products/bestseller
router.get('/bestseller', async (req, res) => {
  try {
    const sql = `
      SELECT p.*, COALESCE(SUM(oi.quantity), 0) as total_sold 
      FROM products p 
      LEFT JOIN order_items oi ON p.id = oi.product_id 
      WHERE p.is_active = 1
      GROUP BY p.id 
      ORDER BY total_sold DESC 
      LIMIT 1
    `;
    const bestSeller = await db.safeGet(sql);
    if (!bestSeller) return res.status(404).json({ error: 'Belum ada data penjualan' });
    res.json(bestSeller);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products — Public
router.get('/', async (req, res) => {
  try {
    const products = await db.safeQuery('SELECT * FROM products WHERE is_active = 1 ORDER BY category, name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/all — Admin
router.get('/all', verifyToken, async (req, res) => {
  try {
    const products = await db.safeQuery('SELECT * FROM products ORDER BY created_at DESC');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products — Admin
router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, description, stock, image_url } = req.body;
    if (!name || !category || !price) {
      return res.status(400).json({ error: 'Nama, kategori, dan harga wajib diisi' });
    }
    
    // Cek apakah ada file lokal ATAU pakai link
    let image_filename = '';
    if (req.file && !isVercel) {
      image_filename = req.file.filename;
    } else if (image_url) {
      image_filename = image_url;
    }
    
    await db.safeRun(
      'INSERT INTO products (name, category, price, description, image_filename, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [name, category, parseInt(price), description || '', image_filename, parseInt(stock) || 1]
    );
    
    const product = await db.safeGet('SELECT * FROM products ORDER BY id DESC LIMIT 1');
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, description, stock, is_active, image_url } = req.body;
    const existing = await db.safeGet('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Produk tidak ditemukan' });

    let image_filename = existing.image_filename;
    
    if (req.file && !isVercel) {
      if (image_filename && !image_filename.startsWith('http')) {
        const old = path.join(uploadDir, image_filename);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      image_filename = req.file.filename;
    } else if (image_url) {
      image_filename = image_url; // Override dengan link baru
    }

    await db.safeRun(
      'UPDATE products SET name=?, category=?, price=?, description=?, image_filename=?, stock=?, is_active=? WHERE id=?',
      [
        name || existing.name,
        category || existing.category,
        price ? parseInt(price) : existing.price,
        description !== undefined ? description : existing.description,
        image_filename,
        stock !== undefined ? parseInt(stock) : existing.stock,
        is_active !== undefined ? parseInt(is_active) : existing.is_active,
        id
      ]
    );
    const updated = await db.safeGet('SELECT * FROM products WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.safeGet('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    
    if (existing.image_filename && !existing.image_filename.startsWith('http') && !isVercel) {
      const p = path.join(uploadDir, existing.image_filename);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    await db.safeRun('DELETE FROM products WHERE id = ?', [id]);
    res.json({ message: 'Produk berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;