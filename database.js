const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

let db = {};
const isProd = process.env.DATABASE_URL ? true : false;

if (isProd) {
  // Use PostgreSQL (Supabase)
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  db.query = (sql, params) => pool.query(sql, params);
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

} else {
  // Use SQLite (Local) - Only required if NOT in prod to avoid Vercel build errors
  const { DatabaseSync } = require('node:sqlite');
  const sqlite = new DatabaseSync(path.join(__dirname, 'data.db'));
  
  db.safeQuery = async (sql, params = []) => sqlite.prepare(sql).all(...params);
  db.safeGet = async (sql, params = []) => sqlite.prepare(sql).get(...params);
  db.safeRun = async (sql, params = []) => sqlite.prepare(sql).run(...params);
  db.beginTransaction = async () => sqlite.exec('BEGIN TRANSACTION');
  db.commit = async () => sqlite.exec('COMMIT');
  db.rollback = async () => sqlite.exec('ROLLBACK');
}

async function initDB() {
  const createTablesSQL = isProd ? `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      description TEXT DEFAULT '',
      image_filename TEXT DEFAULT '',
      stock INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      product_price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal INTEGER NOT NULL
    );
  ` : `
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
  `;

  try {
    if (isProd) {
      await db.safeRun(createTablesSQL);
    } else {
      // Create tables for local too
      await db.safeRun(createTablesSQL);
    }

    // Seed Admin
    const admin = await db.safeGet("SELECT id FROM users WHERE username = ?", ['admin']);
    if (!admin) {
      const hashed = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'dapurbibi123', 10);
      await db.safeRun("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hashed, 'admin']);
      console.log('✅ Admin seeded');
    }
  } catch (err) {
    console.error('DB Init Error:', err);
  }
}

initDB().catch(console.error);

module.exports = db;
