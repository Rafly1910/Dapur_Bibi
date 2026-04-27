const express = require('express');
const router = express.Router();
const db = require('../database');
const { verifyToken } = require('../middleware/auth');

// GET /api/reports/summary
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const isProd = process.env.DATABASE_URL ? true : false;
    const { date_from, date_to } = req.query;
    let dateWhereSimple = '';
    let dateWhereAliased = '';
    
    if (date_from && date_to) {
      dateWhereSimple = `AND date(created_at) BETWEEN '${date_from}' AND '${date_to}'`;
      dateWhereAliased = `AND date(o.created_at) BETWEEN '${date_from}' AND '${date_to}'`;
    } else if (date_from) {
      dateWhereSimple = `AND date(created_at) >= '${date_from}'`;
      dateWhereAliased = `AND date(o.created_at) >= '${date_from}'`;
    } else if (date_to) {
      dateWhereSimple = `AND date(created_at) <= '${date_to}'`;
      dateWhereAliased = `AND date(o.created_at) <= '${date_to}'`;
    }

    const todaySql = isProd ? 
      "date(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE" : 
      "date(created_at) = date('now','localtime')";

    const totalOrders = await db.safeGet(`SELECT COUNT(*) as c FROM orders WHERE status != 'dibatalkan' ${dateWhereSimple}`);
    const totalRevenue = await db.safeGet(`SELECT COALESCE(SUM(total_price),0) as t FROM orders WHERE status != 'dibatalkan' ${dateWhereSimple}`);
    const totalItems = await db.safeGet(`
      SELECT COALESCE(SUM(oi.quantity),0) as c FROM order_items oi
      JOIN orders o ON oi.order_id = o.id WHERE o.status != 'dibatalkan' ${dateWhereAliased}
    `);
    const pending = await db.safeGet(`SELECT COUNT(*) as c FROM orders WHERE status='menunggu'`);
    const today = await db.safeGet(`SELECT COUNT(*) as c FROM orders WHERE ${todaySql} AND status!='dibatalkan'`);
    const todayRev = await db.safeGet(`SELECT COALESCE(SUM(total_price),0) as t FROM orders WHERE ${todaySql} AND status!='dibatalkan'`);

    res.json({
      total_orders: parseInt(totalOrders.c),
      total_revenue: parseFloat(totalRevenue.t),
      total_items_sold: parseInt(totalItems.c),
      pending_orders: parseInt(pending.c),
      avg_order_value: totalOrders.c > 0 ? Math.round(totalRevenue.t / totalOrders.c) : 0,
      today_orders: parseInt(today.c),
      today_revenue: parseFloat(todayRev.t),
    });
  } catch (err) {
    console.error('Reports summary error:', err);
    res.status(500).json({ error: 'Gagal memuat ringkasan laporan' });
  }
});

// GET /api/reports/daily
router.get('/daily', verifyToken, async (req, res) => {
  try {
    const isProd = process.env.DATABASE_URL ? true : false;
    const days = parseInt(req.query.days) || 7;
    
    const sql = isProd ? `
      SELECT date(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') as date, COUNT(*) as order_count, COALESCE(SUM(total_price),0) as revenue
      FROM orders WHERE status!='dibatalkan' AND created_at >= (CURRENT_DATE - INTERVAL '${days - 1} days')
      GROUP BY date ORDER BY date ASC
    ` : `
      SELECT date(created_at,'localtime') as date, COUNT(*) as order_count, COALESCE(SUM(total_price),0) as revenue
      FROM orders WHERE status!='dibatalkan' AND date(created_at,'localtime') >= date('now','localtime','-${days - 1} days')
      GROUP BY date(created_at,'localtime') ORDER BY date ASC
    `;

    const data = await db.safeQuery(sql);

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      // Format PG date string if it's an object
      const found = data.find(r => {
        const rowDate = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date;
        return rowDate === ds;
      });
      result.push({ 
        date: ds, 
        order_count: found ? parseInt(found.order_count) : 0, 
        revenue: found ? parseFloat(found.revenue) : 0 
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/top-products
router.get('/top-products', verifyToken, async (req, res) => {
  try {
    const { limit = 10, date_from, date_to } = req.query;
    let dateWhere = '';
    if (date_from && date_to) dateWhere = `AND date(o.created_at) BETWEEN '${date_from}' AND '${date_to}'`;
    else if (date_from) dateWhere = `AND date(o.created_at) >= '${date_from}'`;

    const products = await db.safeQuery(`
      SELECT oi.product_name, SUM(oi.quantity) as total_quantity, SUM(oi.subtotal) as total_revenue
      FROM order_items oi JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'dibatalkan' ${dateWhere}
      GROUP BY oi.product_name ORDER BY total_quantity DESC LIMIT ${parseInt(limit)}
    `);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/transactions
router.get('/transactions', verifyToken, async (req, res) => {
  try {
    const { date_from, date_to, limit = 20, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = `SELECT * FROM orders WHERE status != 'dibatalkan'`;
    const params = [];
    if (date_from) { query += ` AND date(created_at) >= ?`; params.push(date_from); }
    if (date_to) { query += ` AND date(created_at) <= ?`; params.push(date_to); }
    query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    const tx = await db.safeQuery(query, params);
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
