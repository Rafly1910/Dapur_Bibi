const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
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
  db.beginTransaction = () => pool.query('BEGIN');
  db.commit = () => pool.query('COMMIT');
  db.rollback = () => pool.query('ROLLBACK');
  db.rawExec = (sql) => pool.query(sql); // For multiple statements

} else {
  const { DatabaseSync } = require('node:sqlite');
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
  if (!process.env.DATABASE_URL && isProd) return;

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
    await db.rawExec(createTablesSQL);

    // Seed Admin
    const admin = await db.safeGet("SELECT id FROM users WHERE username = ?", ['admin']);
    if (!admin) {
      const hashed = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'dapurbibi123', 10);
      await db.safeRun("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hashed, 'admin']);
    }

    // Seed Products if empty
    const countRes = await db.safeGet("SELECT COUNT(*) as c FROM products");
    if (parseInt(countRes.c) === 0) {
      const products = [
        { name: 'Nasi Goreng Spesial', category: 'Makan Berat', price: 25000, description: 'Nasi goreng dengan telur mata sapi, ayam suwir, dan kerupuk.', image: 'product-nasi-goreng.png' },
        { name: 'Mie Goreng Jawa', category: 'Makan Berat', price: 22000, description: 'Mie goreng dengan cita rasa khas Jawa.', image: 'product-mie-goreng.png' },
        { name: 'Ayam Bakar Madu', category: 'Makan Berat', price: 30000, description: 'Ayam pilihan dibakar dengan marinasi madu.', image: 'product-ayam-bakar.png' },
        { name: 'Soto Ayam Kuning', category: 'Makan Berat', price: 20000, description: 'Soto ayam kuning segar dengan bihun.', image: 'product-soto-ayam.png' },
        { name: 'Es Jeruk Peras', category: 'Minuman', price: 8000, description: 'Jeruk peras segar dengan es.', image: 'product-es-jeruk.png' },
        { name: 'Jus Alpukat', category: 'Minuman', price: 15000, description: 'Jus alpukat creamy dengan susu.', image: 'product-jus-alpukat.png' }
      ];
      for (const p of products) {
        await db.safeRun("INSERT INTO products (name, category, price, description, image_filename) VALUES (?, ?, ?, ?, ?)", [p.name, p.category, p.price, p.description, p.image]);
      }
    }
  } catch (err) {
    console.error('❌ DB Init Error:', err);
  }
}

initDB().catch(console.error);

module.exports = db;
