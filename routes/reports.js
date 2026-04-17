const express = require('express');
const router = express.Router();
const db = require('../database');
const { verifyToken } = require('../middleware/auth');

// GET /api/reports/summary
router.get('/summary', verifyToken, (req, res) => {
  const { date_from, date_to } = req.query;
  let dateWhere = '';
  if (date_from && date_to) dateWhere = `AND date(o.created_at) BETWEEN '${date_from}' AND '${date_to}'`;
  else if (date_from) dateWhere = `AND date(o.created_at) >= '${date_from}'`;
  else if (date_to) dateWhere = `AND date(o.created_at) <= '${date_to}'`;

  const baseWhere = `status != 'dibatalkan' ${dateWhere}`;

  const totalOrders = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE ${baseWhere}`).get();
  const totalRevenue = db.prepare(`SELECT COALESCE(SUM(total_price),0) as t FROM orders WHERE ${baseWhere}`).get();
  const totalItems = db.prepare(`
    SELECT COALESCE(SUM(oi.quantity),0) as c FROM order_items oi
    JOIN orders o ON oi.order_id = o.id WHERE o.${baseWhere}
  `).get();
  const pending = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status='menunggu'`).get();
  const today = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE date(created_at)=date('now','localtime') AND status!='dibatalkan'`).get();
  const todayRev = db.prepare(`SELECT COALESCE(SUM(total_price),0) as t FROM orders WHERE date(created_at)=date('now','localtime') AND status!='dibatalkan'`).get();

  res.json({
    total_orders: totalOrders.c,
    total_revenue: totalRevenue.t,
    total_items_sold: totalItems.c,
    pending_orders: pending.c,
    avg_order_value: totalOrders.c > 0 ? Math.round(totalRevenue.t / totalOrders.c) : 0,
    today_orders: today.c,
    today_revenue: todayRev.t,
  });
});

// GET /api/reports/daily
router.get('/daily', verifyToken, (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const data = db.prepare(`
    SELECT date(created_at,'localtime') as date, COUNT(*) as order_count, COALESCE(SUM(total_price),0) as revenue
    FROM orders WHERE status!='dibatalkan' AND date(created_at,'localtime') >= date('now','localtime','-${days - 1} days')
    GROUP BY date(created_at,'localtime') ORDER BY date ASC
  `).all();

  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const found = data.find(r => r.date === ds);
    result.push({ date: ds, order_count: found ? found.order_count : 0, revenue: found ? found.revenue : 0 });
  }
  res.json(result);
});

// GET /api/reports/top-products
router.get('/top-products', verifyToken, (req, res) => {
  const { limit = 10, date_from, date_to } = req.query;
  let dateWhere = '';
  if (date_from && date_to) dateWhere = `AND date(o.created_at) BETWEEN '${date_from}' AND '${date_to}'`;
  else if (date_from) dateWhere = `AND date(o.created_at) >= '${date_from}'`;

  const products = db.prepare(`
    SELECT oi.product_name, SUM(oi.quantity) as total_quantity, SUM(oi.subtotal) as total_revenue
    FROM order_items oi JOIN orders o ON oi.order_id = o.id
    WHERE o.status != 'dibatalkan' ${dateWhere}
    GROUP BY oi.product_name ORDER BY total_quantity DESC LIMIT ${parseInt(limit)}
  `).all();
  res.json(products);
});

// GET /api/reports/transactions
router.get('/transactions', verifyToken, (req, res) => {
  const { date_from, date_to, limit = 20, page = 1 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let query = `SELECT * FROM orders WHERE status != 'dibatalkan'`;
  const params = [];
  if (date_from) { query += ` AND date(created_at) >= ?`; params.push(date_from); }
  if (date_to) { query += ` AND date(created_at) <= ?`; params.push(date_to); }
  query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
  res.json(db.prepare(query).all(...params));
});

module.exports = router;
