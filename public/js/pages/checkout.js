function initCheckoutPage() {
  renderNavbar('customer');
  const cart = Cart.get();
  if (cart.length === 0) {
    document.getElementById('app').innerHTML = `
      <div class="page checkout-page"><div class="container">
        <div class="empty-state"><div class="empty-icon">🛒</div><h3>Keranjang Kosong</h3>
          <p>Pilih menu terlebih dahulu</p>
          <button class="btn btn-primary" onclick="navigate('menu')">Lihat Menu</button>
        </div>
      </div></div>`;
    return;
  }

  const total = Cart.total();
  document.getElementById('app').innerHTML = `
    <div class="page checkout-page"><div class="container">
      <button class="page-back" onclick="navigate('cart')">← Kembali ke Keranjang</button>
      <h2 style="margin-bottom:20px">Checkout Pesanan 📋</h2>
      <div class="checkout-layout">
        <div>
          <!-- DATA PEMESAN -->
          <div class="checkout-form-card" style="margin-bottom:16px">
            <h4 class="checkout-section-title">👤 Data Pemesan</h4>
            <div class="form-group">
              <label class="form-label" for="c-name">Nama Lengkap *</label>
              <input type="text" class="form-control" id="c-name" placeholder="Masukkan nama lengkap Anda">
            </div>
            <div class="form-group">
              <label class="form-label" for="c-phone">Nomor HP / WhatsApp *</label>
              <input type="tel" class="form-control" id="c-phone" placeholder="Contoh: 08123456789">
            </div>

            <h4 class="checkout-section-title" style="margin-top:20px">🚗 Metode Pengiriman</h4>
            <div class="delivery-options">
              <div class="delivery-option">
                <input type="radio" name="delivery" id="del-antar" value="delivery" checked>
                <label class="delivery-label" for="del-antar"><span class="delivery-icon">🛵</span><span class="delivery-name">Antar ke Alamat</span></label>
              </div>
              <div class="delivery-option">
                <input type="radio" name="delivery" id="del-pickup" value="pickup">
                <label class="delivery-label" for="del-pickup"><span class="delivery-icon">🏪</span><span class="delivery-name">Ambil Sendiri</span></label>
              </div>
            </div>

            <div id="addr-field">
              <div class="form-group">
                <label class="form-label" for="c-address">Alamat Lengkap *</label>
                <textarea class="form-control" id="c-address" rows="3" placeholder="Masukkan alamat lengkap dengan patokan jelas"></textarea>
              </div>
            </div>

            <div class="form-group" style="margin-top:8px">
              <label class="form-label" for="c-notes">📝 Catatan (Opsional)</label>
              <textarea class="form-control" id="c-notes" rows="2" placeholder="Contoh: tidak pedas, tanpa bawang, dll."></textarea>
            </div>
          </div>

          <!-- METODE PEMBAYARAN -->
          <div class="checkout-form-card">
            <h4 class="checkout-section-title">💳 Metode Pembayaran</h4>
            <div class="payment-methods-grid" id="payment-methods-grid">
              ${renderPaymentMethods()}
            </div>
            <div id="payment-info-box"></div>
          </div>
        </div>

        <!-- RINGKASAN PESANAN -->
        <div>
          <div class="order-summary-card">
            <div class="order-summary-header">
              <h3>Ringkasan Pesanan</h3>
              <div style="font-size:0.85rem;color:rgba(255,255,255,0.7);margin-top:4px">${cart.length} jenis menu</div>
            </div>
            <div class="order-summary-body">
              ${cart.map(i=>`<div class="summary-row"><span>${i.name} ×${i.quantity}</span><span>${formatRupiah(i.price*i.quantity)}</span></div>`).join('')}
              <div class="summary-row total"><span>Total Pembayaran</span><span class="summary-total-price">${formatRupiah(total)}</span></div>
              <button class="btn btn-primary btn-full" style="margin-top:20px" id="place-order-btn">✅ Buat Pesanan Sekarang</button>
            </div>
          </div>
        </div>
      </div>
    </div></div>`;

  // Events
  document.querySelectorAll('input[name="delivery"]').forEach(r => {
    r.addEventListener('change', () => {
      document.getElementById('addr-field').style.display = r.value === 'delivery' ? 'block' : 'none';
    });
  });

  document.querySelectorAll('input[name="payment"]').forEach(r => {
    r.addEventListener('change', () => updatePaymentInfoBox(r.value));
  });

  // Show default payment info
  updatePaymentInfoBox('cod');
  document.getElementById('place-order-btn').addEventListener('click', placeOrder);
}

function renderPaymentMethods() {
  const methods = [
    { id: 'cod', label: 'COD', sub: 'Bayar di tempat', icon: '💵', color: '#22C55E' },
    { id: 'qris', label: 'QRIS', sub: 'Semua e-wallet', icon: '📱', color: '#8B5CF6' },
    { id: 'transfer_bca', label: 'BCA', sub: 'Transfer bank', icon: '🏦', color: '#0068B4' },
    { id: 'transfer_bri', label: 'BRI', sub: 'Transfer bank', icon: '🏦', color: '#1E5FA7' },
    { id: 'transfer_mandiri', label: 'Mandiri', sub: 'Transfer bank', icon: '🏦', color: '#003D79' },
    { id: 'gopay', label: 'GoPay', sub: 'Dompet digital', icon: '📲', color: '#01A94C' },
    { id: 'ovo', label: 'OVO', sub: 'Dompet digital', icon: '📲', color: '#4C3BCE' },
    { id: 'dana', label: 'DANA', sub: 'Dompet digital', icon: '📲', color: '#118EEA' },
  ];

  return methods.map((m, i) => `
    <div class="payment-method-option">
      <input type="radio" name="payment" id="pay-${m.id}" value="${m.id}" ${i===0?'checked':''}>
      <label class="payment-method-label" for="pay-${m.id}">
        <div class="pay-icon" style="background:${m.color}18;color:${m.color}">${m.icon}</div>
        <div class="pay-text">
          <div class="pay-name">${m.label}</div>
          <div class="pay-sub">${m.sub}</div>
        </div>
        <div class="pay-check">✓</div>
      </label>
    </div>`).join('');
}

function updatePaymentInfoBox(method) {
  const info = PAYMENT_INFO[method];
  if (!info) return;
  const isTransfer = method !== 'cod';
  document.getElementById('payment-info-box').innerHTML = `
    <div class="payment-info-box ${isTransfer ? 'payment-info-alert' : 'payment-info-cod'}">
      <div class="payment-info-title">${info.icon} ${info.name}</div>
      <p class="payment-info-instruction">${info.instruction}</p>
      ${method !== 'cod' ? `<div class="payment-info-detail">${info.detail}</div>` : ''}
      <div class="payment-info-note">📌 ${info.note}</div>
    </div>`;
}

async function placeOrder() {
  const name = document.getElementById('c-name').value.trim();
  const phone = document.getElementById('c-phone').value.trim();
  const deliveryType = document.querySelector('input[name="delivery"]:checked').value;
  const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
  const addrEl = document.getElementById('c-address');
  const address = addrEl ? addrEl.value.trim() : '';
  const notes = document.getElementById('c-notes').value.trim();

  if (!name) { showToast('Nama lengkap harus diisi', 'error'); return; }
  if (!phone) { showToast('Nomor HP harus diisi', 'error'); return; }
  if (deliveryType === 'delivery' && !address) { showToast('Alamat pengiriman harus diisi', 'error'); return; }

  const btn = document.getElementById('place-order-btn');
  btn.disabled = true; btn.textContent = '⏳ Memproses...';

  try {
    const result = await Orders.create({
      customer_name: name, customer_phone: phone,
      customer_address: address, delivery_type: deliveryType,
      payment_method: paymentMethod,
      items: Cart.get().map(i => ({ product_id: i.id, quantity: i.quantity })),
      notes,
    });
    Cart.clear();
    updateCartBadge();

    const pInfo = PAYMENT_INFO[paymentMethod];
    const isCod = paymentMethod === 'cod';

    document.getElementById('app').innerHTML = `
      <div class="page" style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:20px">
        <div class="order-success" style="max-width:520px">
          <div class="success-icon">🎉</div>
          <h2>Pesanan Berhasil Dibuat!</h2>
          <p style="margin-bottom:8px">Terima kasih, <strong>${name}</strong>!</p>
          <div class="success-code">${result.order_code}</div>

          <!-- Payment Instructions -->
          <div class="payment-success-box" style="margin:20px 0">
            <div class="pay-success-title">💳 Instruksi Pembayaran</div>
            <div class="pay-success-method">${pInfo.icon} ${pInfo.name}</div>
            <p class="pay-success-instruction">${pInfo.instruction}</p>
            ${!isCod ? `<div class="pay-success-detail">${pInfo.detail}</div>
            <div class="pay-success-amount">
              <span>Jumlah yang dibayar:</span>
              <strong>${formatRupiah(result.total_price)}</strong>
            </div>` : `<p style="color:var(--color-text-3);font-size:0.9rem">${pInfo.detail}</p>`}
            <div class="pay-success-note">📌 ${pInfo.note}</div>
          </div>

          <p class="success-desc" style="margin-bottom:20px">Simpan kode pesanan sebagai referensi Anda.</p>
          <div class="success-actions">
            <button class="btn btn-primary" onclick="navigate('menu')">🍽️ Pesan Lagi</button>
            <button class="btn btn-outline" onclick="navigate('home')">🏠 Ke Beranda</button>
          </div>
        </div>
      </div>`;
  } catch (err) {
    showToast('Gagal membuat pesanan: ' + err.message, 'error');
    btn.disabled = false; btn.textContent = '✅ Buat Pesanan Sekarang';
  }
}
