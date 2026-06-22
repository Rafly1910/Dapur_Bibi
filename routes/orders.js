async function generateOrderCode() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const isProd = process.env.DATABASE_URL ? true : false;
  
  const sql = isProd ? 
    "SELECT COUNT(*) as c FROM orders WHERE date(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE" :
    "SELECT COUNT(*) as c FROM orders WHERE date(created_at) = date('now','localtime')";
    
  const res = await db.safeGet(sql);
  // PERBAIKAN: Beri fallback '0' jika res undefined agar tidak error
  const count = res && res.c ? parseInt(res.c) + 1 : 1; 
  return `DB-${date}-${String(count).padStart(3, '0')}`;
}

// POST /api/orders — Public (Customer)
router.post('/', async (req, res) => {
  const { customer_name, customer_phone, customer_address, delivery_type, items, notes, payment_method } = req.body;

  if (!customer_name || !customer_phone || !items || items.length === 0) {
    return res.status(400).json({ error: 'Data pelanggan dan item pesanan wajib diisi' });
  }
  if (delivery_type === 'delivery' && !customer_address) {
    return res.status(400).json({ error: 'Alamat pengiriman wajib diisi untuk opsi antar' });
  }

  let total_price = 0;
  const validatedItems = [];

  try {
    for (const item of items) {
      const product = await db.safeGet('SELECT * FROM products WHERE id = ? AND is_active = 1', [item.product_id]);
      if (!product) return res.status(400).json({ error: `Produk ID ${item.product_id} tidak ditemukan` });
      const qty = Math.max(1, parseInt(item.quantity));
      const subtotal = product.price * qty;
      total_price += subtotal;
      validatedItems.push({ product, qty, subtotal });
    }

    // PERBAIKAN: Pastikan fungsi ada sebelum dipanggil untuk menghindari crash
    if (typeof db.beginTransaction === 'function') await db.beginTransaction();
    
    const code = await generateOrderCode();
    await db.safeRun(
      'INSERT INTO orders (order_code, customer_name, customer_phone, customer_address, delivery_type, total_price, status, payment_method, payment_status, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [code, customer_name, customer_phone, customer_address || '', delivery_type, total_price, 'menunggu', payment_method || 'cod', 'belum_bayar', notes || '']
    );

    const orderRecord = await db.safeGet('SELECT id FROM orders WHERE order_code = ?', [code]);
    if (!orderRecord) throw new Error('Gagal mengambil data pesanan setelah disimpan');
    const oid = orderRecord.id;

    for (const it of validatedItems) {
      await db.safeRun(
        'INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal) VALUES (?,?,?,?,?,?)',
        [oid, it.product.id, it.product.name, it.product.price, it.qty, it.subtotal]
      );
    }
    
    const order = await db.safeGet('SELECT * FROM orders WHERE id = ?', [oid]);
    if (typeof db.commit === 'function') await db.commit();
    
    res.status(201).json({ message: 'Pesanan berhasil dibuat', order_code: order.order_code, total_price: order.total_price, order_id: order.id });
    
  } catch (err) {
    // PERBAIKAN: Tangkap error dengan aman, lalu paksakan kirim status 500
    console.error("🔴 Error saat memproses pesanan:", err.message);
    
    try {
      if (typeof db.rollback === 'function') await db.rollback();
    } catch (rollbackErr) {
      console.error("Gagal melakukan rollback:", rollbackErr.message);
    }
    
    // Pastikan respons 500 selalu terkirim ke frontend
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan internal server' });
  }
});