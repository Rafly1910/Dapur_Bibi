const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let db = {};
const isProd = process.env.DATABASE_URL ? true : false;

if (isProd) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
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
} else {
  const { DatabaseSync } = require('node:sqlite');
  const path = require('path');
  const sqlite = new DatabaseSync(path.join(__dirname, 'data.db'));
  db.safeQuery = async (sql, params = []) => sqlite.prepare(sql).all(...params);
  db.safeGet = async (sql, params = []) => sqlite.prepare(sql).get(...params);
  db.safeRun = async (sql, params = []) => sqlite.prepare(sql).run(...params);
  db.rawExec = async (sql) => sqlite.exec(sql);
}

let isInitialized = false;
db.initIfNeeded = async () => {
  if (isInitialized) return;
  try {
    const createTablesSQL = `
      CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name TEXT, category TEXT, price INTEGER, description TEXT, image_filename TEXT, stock INTEGER DEFAULT 10, is_active INTEGER DEFAULT 1);
      CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, order_code TEXT UNIQUE, customer_name TEXT, customer_phone TEXT, total_price INTEGER, status TEXT, payment_method TEXT, payment_status TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS order_items (id SERIAL PRIMARY KEY, order_id INTEGER, product_name TEXT, product_price INTEGER, quantity INTEGER, subtotal INTEGER);
    `;
    await db.rawExec(createTablesSQL);
    
    // Seed Admin
    const admin = await db.safeGet("SELECT id FROM users WHERE username = 'admin'");
    if (!admin) {
      const hashed = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'dapurbibi123', 10);
      await db.safeRun("INSERT INTO users (username, password, role) VALUES ('admin', ?, 'admin')", [hashed]);
    }

    // Seed Menu Lengkap jika kosong
    const countRes = await db.safeGet("SELECT COUNT(*) as c FROM products");
    if (parseInt(countRes.c) <= 3) { // Tambahkan jika kurang dari 3
      const products = [
        { name: 'Nasi Goreng Spesial', category: 'Makan Berat', price: 25000, description: 'Nasi goreng lezat dengan telur mata sapi.', image: 'product-nasi-goreng.png' },
        { name: 'Mie Goreng Jawa', category: 'Makan Berat', price: 22000, description: 'Mie goreng khas dengan bumbu rempah.', image: 'product-mie-goreng.png' },
        { name: 'Ayam Bakar Madu', category: 'Makan Berat', price: 30000, description: 'Ayam bakar manis gurih pilihan.', image: 'product-ayam-bakar.png' },
        { name: 'Soto Ayam Kuning', category: 'Makan Berat', price: 20000, description: 'Soto ayam segar kuah kuning.', image: 'product-soto-ayam.png' },
        { name: 'Es Jeruk Peras', category: 'Minuman', price: 8000, description: 'Jeruk peras murni segar.', image: 'product-es-jeruk.png' },
        { name: 'Jus Alpukat Creamy', category: 'Minuman', price: 15000, description: 'Jus alpukat kental dengan cokelat.', image: 'product-jus-alpukat.png' }
      ];
      for (const p of products) {
        // Cek dulu biar tidak double
        const exist = await db.safeGet("SELECT id FROM products WHERE name = ?", [p.name]);
        if (!exist) {
          await db.safeRun("INSERT INTO products (name, category, price, description, image_filename, is_active) VALUES (?, ?, ?, ?, ?, 1)", [p.name, p.category, p.price, p.description, p.image]);
        }
      }
    }
    isInitialized = true;
  } catch (err) {
    console.error('DB Init Error:', err);
  }
};

module.exports = db;
