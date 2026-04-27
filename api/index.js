require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Update path karena pindah ke folder api/
const db = require('../database'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure DB is ready
app.use(async (req, res, next) => {
  await db.initIfNeeded();
  next();
});

// Static: uploads & frontend (Update path)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// API Routes (Update path)
app.use('/api/auth', require('../routes/auth'));
app.use('/api/products', require('../routes/products'));
app.use('/api/orders', require('../routes/orders'));
app.use('/api/reports', require('../routes/reports'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', app: 'DapurBibi' }));

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🍽️  DapurBibi Server berjalan di http://localhost:${PORT}`);
  });
}
