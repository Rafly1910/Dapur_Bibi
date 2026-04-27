// Gunakan node:sqlite — built-in Node.js v22+
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ─── Migrations (safe: diabaikan jika kolom sudah ada) ───────────
try { db.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'cod'"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'belum_bayar'"); } catch {}

// ─── Create Tables ─────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price INTEGER NOT NULL,
    description TEXT DEFAULT '',
    image_filename TEXT DEFAULT '',
    stock INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT DEFAULT '',
    delivery_type TEXT NOT NULL,
    total_price INTEGER NOT NULL,
    status TEXT DEFAULT 'menunggu',
    payment_method TEXT DEFAULT 'cod',
    payment_status TEXT DEFAULT 'belum_bayar',
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    product_price INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
  );
`);

// ─── Seed Admin ─────────────────────────────────────────────────
const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!existingAdmin) {
  const hashed = bcrypt.hashSync('dapurbibi123', 10);
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashed, 'admin');
  console.log('✅ Admin seeded: admin / dapurbibi123');
}

// ─── Seed Products ───────────────────────────────────────────────
const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get();
if (productCount.c === 0) {
  const products = [
    { name: 'Nasi Goreng Spesial', category: 'Makan Berat', price: 25000, description: 'Nasi goreng dengan telur mata sapi, ayam suwir, dan kerupuk. Bumbu rempah pilihan yang lezat dan menggugah selera.', image: 'product-nasi-goreng.png' },
    { name: 'Mie Goreng Jawa', category: 'Makan Berat', price: 22000, description: 'Mie goreng dengan cita rasa khas Jawa, dilengkapi sayuran segar, telur, dan taburan bawang goreng.', image: 'product-mie-goreng.png' },
    { name: 'Ayam Bakar Madu', category: 'Makan Berat', price: 30000, description: 'Ayam pilihan dibakar dengan marinasi madu dan rempah pilihan, disajikan dengan nasi putih hangat.', image: 'product-ayam-bakar.png' },
    { name: 'Soto Ayam Kuning', category: 'Makan Berat', price: 20000, description: 'Soto ayam kuning segar dengan bihun, telur rebus, dan kerupuk. Kuah gurih khas nusantara.', image: 'product-soto-ayam.png' },
    { name: 'Nasi Uduk Komplit', category: 'Makan Berat', price: 18000, description: 'Nasi uduk gurih dengan lauk ayam goreng, tempe orek, tahu, dan sambal kacang.' },
    { name: 'Tempe Orek Pedas', category: 'Lauk Pauk', price: 8000, description: 'Tempe goreng orek dengan cabai merah dan bawang, renyah manis pedas.' },
    { name: 'Sayur Bening Bayam', category: 'Lauk Pauk', price: 7000, description: 'Sayur bening bayam jagung segar yang menyehatkan, bumbu sederhana yang segar.' },
    { name: 'Telur Dadar Bumbu', category: 'Lauk Pauk', price: 8000, description: 'Telur dadar tebal dengan bumbu bawang merah, tomat, dan daun bawang segar.' },
    { name: 'Ayam Goreng Kremes', category: 'Lauk Pauk', price: 15000, description: 'Ayam goreng dengan balutan kremes renyah dan bumbu kuning yang meresap sempurna.' },
    { name: 'Risoles Mayo', category: 'Camilan', price: 5000, description: 'Risoles isi ragout ayam dan wortel, dilapisi telur dan tepung roti, digoreng hingga renyah keemasan.' },
    { name: 'Pisang Goreng Crispy', category: 'Camilan', price: 12000, description: 'Pisang goreng dengan balutan tepung crispy gurih, disajikan 3 buah per porsi.' },
    { name: 'Bakwan Jagung', category: 'Camilan', price: 5000, description: 'Bakwan jagung manis gurih, digoreng hingga kecoklatan sempurna.' },
    { name: 'Es Teh Manis', category: 'Minuman', price: 5000, description: 'Teh manis dingin yang menyegarkan.' },
    { name: 'Es Jeruk Peras', category: 'Minuman', price: 8000, description: 'Jeruk peras segar dengan es, tanpa bahan pengawet. Segar dan kaya vitamin C.', image: 'product-es-jeruk.png' },
    { name: 'Jus Alpukat', category: 'Minuman', price: 15000, description: 'Jus alpukat creamy dengan susu kental manis dan gula aren.', image: 'product-jus-alpukat.png' },
    { name: 'Es Cincau Hitam', category: 'Minuman', price: 7000, description: 'Minuman tradisional cincau hitam dengan santan dan gula merah.' },
  ];

  const insert = db.prepare(
    'INSERT INTO products (name, category, price, description, image_filename, stock, is_active) VALUES (?, ?, ?, ?, ?, 1, 1)'
  );
  for (const p of products) {
    insert.run(p.name, p.category, p.price, p.description, p.image || '');
  }
  console.log(`✅ ${products.length} produk sample berhasil ditambahkan`);
}

module.exports = db;
