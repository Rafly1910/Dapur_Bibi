const { DatabaseSync } = require('node:sqlite');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

let db;
const isProd = process.env.DATABASE_URL ? true : false;

if (isProd) {
  // Use PostgreSQL (Supabase)
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  // Wrapper for PG to match SQLite API enough for our needs
  db.execute = async (sql, params = []) => {
    return await db.query(sql, params);
  };
  db.exec = async (sql) => {
    return await db.query(sql);
  };
  db.prepare = (sql) => {
    return {
      run: async (...params) => await db.query(sql.replace(/\?/g, (match, i) => `$${params.indexOf(params[0]) + 1}`), params),
      get: async (...params) => {
        const res = await db.query(sql.replace(/\?/g, (match, i) => `$${params.indexOf(params[0]) + 1}`), params);
        return res.rows[0];
      },
      all: async (...params) => {
        const res = await db.query(sql.replace(/\?/g, (match, i) => `$${params.indexOf(params[0]) + 1}`), params);
        return res.rows;
      }
    };
  };
} else {
  // Use SQLite (Local)
  const sqlite = new DatabaseSync(path.join(__dirname, 'data.db'));
  db = sqlite;
  db.execute = (sql, params = []) => db.prepare(sql).run(...params);
  // SQLite already has .exec and .prepare
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
  `;

  if (isProd) {
    await db.query(createTablesSQL);
  } else {
    db.exec(createTablesSQL);
  }

  // Seed Admin
  const adminCheckSQL = isProd ? "SELECT id FROM users WHERE username = $1" : "SELECT id FROM users WHERE username = ?";
  const adminRes = isProd ? await db.query(adminCheckSQL, ['admin']) : db.prepare(adminCheckSQL).get('admin');
  const existingAdmin = isProd ? adminRes.rows[0] : adminRes;

  if (!existingAdmin) {
    const hashed = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'dapurbibi123', 10);
    const insertSQL = isProd ? "INSERT INTO users (username, password, role) VALUES ($1, $2, $3)" : "INSERT INTO users (username, password, role) VALUES (?, ?, ?)";
    if (isProd) await db.query(insertSQL, ['admin', hashed, 'admin']);
    else db.prepare(insertSQL).run('admin', hashed, 'admin');
    console.log('✅ Admin seeded');
  }

  // Seed Products
  const countRes = isProd ? await db.query("SELECT COUNT(*) as c FROM products") : db.prepare("SELECT COUNT(*) as c FROM products").get();
  const count = isProd ? parseInt(countRes.rows[0].c) : countRes.c;

  if (count === 0) {
    const products = [
      { name: 'Nasi Goreng Spesial', category: 'Makan Berat', price: 25000, description: 'Nasi goreng dengan telur mata sapi, ayam suwir, dan kerupuk.', image: 'product-nasi-goreng.png' },
      { name: 'Mie Goreng Jawa', category: 'Makan Berat', price: 22000, description: 'Mie goreng dengan cita rasa khas Jawa.', image: 'product-mie-goreng.png' },
      { name: 'Ayam Bakar Madu', category: 'Makan Berat', price: 30000, description: 'Ayam pilihan dibakar dengan marinasi madu.', image: 'product-ayam-bakar.png' },
      { name: 'Soto Ayam Kuning', category: 'Makan Berat', price: 20000, description: 'Soto ayam kuning segar dengan bihun.', image: 'product-soto-ayam.png' },
      { name: 'Es Jeruk Peras', category: 'Minuman', price: 8000, description: 'Jeruk peras segar dengan es.', image: 'product-es-jeruk.png' },
      { name: 'Jus Alpukat', category: 'Minuman', price: 15000, description: 'Jus alpukat creamy dengan susu.', image: 'product-jus-alpukat.png' }
    ];

    const insertProductSQL = isProd ? 
      "INSERT INTO products (name, category, price, description, image_filename) VALUES ($1, $2, $3, $4, $5)" :
      "INSERT INTO products (name, category, price, description, image_filename) VALUES (?, ?, ?, ?, ?)";
    
    for (const p of products) {
      if (isProd) await db.query(insertProductSQL, [p.name, p.category, p.price, p.description, p.image]);
      else db.prepare(insertProductSQL).run(p.name, p.category, p.price, p.description, p.image);
    }
    console.log(`✅ ${products.length} produk sample ditambahkan`);
  }
}

// Global query helper to handle SQLite vs PG parameter markers (? vs $1)
db.safeQuery = async (sql, params = []) => {
  if (isProd) {
    // Replace ? with $1, $2, etc.
    let count = 0;
    const pgSql = sql.replace(/\?/g, () => {
      count++;
      return `$${count}`;
    });
    const res = await db.query(pgSql, params);
    return res.rows;
  } else {
    return db.prepare(sql).all(...params);
  }
};

db.safeGet = async (sql, params = []) => {
  if (isProd) {
    let count = 0;
    const pgSql = sql.replace(/\?/g, () => {
      count++;
      return `$${count}`;
    });
    const res = await db.query(pgSql, params);
    return res.rows[0];
  } else {
    return db.prepare(sql).get(...params);
  }
};

db.safeRun = async (sql, params = []) => {
  if (isProd) {
    let count = 0;
    const pgSql = sql.replace(/\?/g, () => {
      count++;
      return `$${count}`;
    });
    return await db.query(pgSql, params);
  } else {
    return db.prepare(sql).run(...params);
  }
};

db.beginTransaction = async () => {
  if (isProd) {
    const client = await db.connect();
    client.release(); // Just check connection
    await db.query('BEGIN');
  } else {
    db.exec('BEGIN TRANSACTION');
  }
};

db.commit = async () => {
  if (isProd) await db.query('COMMIT');
  else db.exec('COMMIT');
};

db.rollback = async () => {
  if (isProd) await db.query('ROLLBACK');
  else db.exec('ROLLBACK');
};

// Start initialization
initDB().catch(console.error);

module.exports = db;
