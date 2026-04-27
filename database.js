const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let db = {};
const isProd = process.env.DATABASE_URL ? true : false;

if (isProd) {
  console.log('🌐 Menghubungkan ke PostgreSQL (Supabase)...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000, // 10 detik timeout
  });
  
  pool.on('error', (err) => console.error('❌ Unexpected PG Pool Error:', err));

  db.safeQuery = async (sql, params = []) => {
    let count = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++count}`);
    const res = await pool.query(pgSql, params);
    return res.rows;
  };
  db.safeGet = async (sql, params = []) => {
    let count = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++count}`);
    const res = await pool.query(pgSql, params);
    return res.rows[0];
  };
  db.safeRun = async (sql, params = []) => {
    let count = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++count}`);
    return await pool.query(pgSql, params);
  };
  db.rawExec = (sql) => pool.query(sql);
  db.beginTransaction = () => pool.query('BEGIN');
  db.commit = () => pool.query('COMMIT');
  db.rollback = () => pool.query('ROLLBACK');

} else {
  console.log('🏠 Menggunakan SQLite Lokal...');
  const { DatabaseSync } = require('node:sqlite');
  const path = require('path');
  const sqlite = new DatabaseSync(path.join(__dirname, 'data.db'));
  
  db.safeQuery = async (sql, params = []) => sqlite.prepare(sql).all(...params);
  db.safeGet = async (sql, params = []) => sqlite.prepare(sql).get(...params);
  db.safeRun = async (sql, params = []) => sqlite.prepare(sql).run(...params);
  db.beginTransaction = async () => sqlite.exec('BEGIN TRANSACTION');
  db.commit = async () => sqlite.exec('COMMIT');
  db.rollback = async () => sqlite.exec('ROLLBACK');
  db.rawExec = async (sql) => sqlite.exec(sql);
}

async function initDB() {
  if (isProd && !process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL tidak ditemukan di Environment Variables Vercel!');
    return;
  }

  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id ${isProd ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isProd ? '' : 'AUTOINCREMENT'},
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at ${isProd ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS products (
      id ${isProd ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isProd ? '' : 'AUTOINCREMENT'},
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      description TEXT DEFAULT '',
      image_filename TEXT DEFAULT '',
      stock INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at ${isProd ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orders (
      id ${isProd ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isProd ? '' : 'AUTOINCREMENT'},
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
      created_at ${isProd ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id ${isProd ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isProd ? '' : 'AUTOINCREMENT'},
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      product_price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal INTEGER NOT NULL
    );
  `;

  try {
    console.log('🛠️ Inisialisasi tabel...');
    await db.rawExec(createTablesSQL);
    console.log('✅ Tabel siap');

    const admin = await db.safeGet("SELECT id FROM users WHERE username = ?", ['admin']);
    if (!admin) {
      const hashed = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'dapurbibi123', 10);
      await db.safeRun("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hashed, 'admin']);
      console.log('👤 Admin seeded');
    }

    const countRes = await db.safeGet("SELECT COUNT(*) as c FROM products");
    if (parseInt(countRes.c) === 0) {
      console.log('🌱 Seeding produk contoh...');
      const products = [
        { name: 'Nasi Goreng Spesial', category: 'Makan Berat', price: 25000, description: 'Lezat', image: 'product-nasi-goreng.png' },
        { name: 'Es Jeruk Peras', category: 'Minuman', price: 8000, description: 'Segar', image: 'product-es-jeruk.png' }
      ];
      for (const p of products) {
        await db.safeRun("INSERT INTO products (name, category, price, description, image_filename, is_active) VALUES (?, ?, ?, ?, ?, 1)", [p.name, p.category, p.price, p.description, p.image]);
      }
      console.log('✅ Menu seeded');
    }
  } catch (err) {
    console.error('❌ DATABASE CRITICAL ERROR:', err.message);
    console.error('Detail:', err);
  }
}

initDB();

module.exports = db;
