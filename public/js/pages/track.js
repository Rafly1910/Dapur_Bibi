function initTrackPage() {
  renderNavbar('customer');
  
  document.getElementById('app').innerHTML = `
    <div class="page" style="padding: 40px 16px; min-height: 80vh; display: flex; align-items: center; flex-direction: column;">
      <div class="container" style="max-width: 600px; width: 100%;">
        <div class="card card-body" style="text-align: center; padding: 40px 24px;">
          <h2 style="margin-bottom: 8px; color: var(--color-secondary);">🔍 Lacak Pesanan</h2>
          <p style="color: var(--color-text-3); margin-bottom: 24px;">Masukkan Kode Pesanan Anda (contoh: DB-20260427-001)</p>
          
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <input type="text" id="track-code" class="form-control" placeholder="Masukkan kode pesanan..." style="flex: 1; min-width: 200px; text-transform: uppercase;">
            <button class="btn btn-primary" onclick="trackOrder()">Cari Pesanan</button>
          </div>
        </div>

        <div id="track-result" style="margin-top: 24px;"></div>
      </div>
    </div>
  `;
}

async function trackOrder() {
  const codeEl = document.getElementById('track-code');
  const code = codeEl.value.trim().toUpperCase();
  const resultDiv = document.getElementById('track-result');

  if (!code) {
    showToast('Masukkan kode pesanan terlebih dahulu!', 'error');
    return;
  }

  resultDiv.innerHTML = `<div style="text-align:center; padding: 20px;"><div class="spinner" style="margin: 0 auto;"></div><p style="margin-top: 10px;">Mencari data...</p></div>`;

  try {
    const res = await fetch(`/api/orders/track/${code}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    // Cocokkan warna status dengan CSS yang ada
    const statusClasses = {
      'menunggu': 'badge-menunggu',
      'diproses': 'badge-diproses',
      'selesai': 'badge-selesai',
      'dibatalkan': 'badge-dibatalkan'
    };
    const badgeClass = statusClasses[data.status] || 'badge-primary';

    // Format tanggal
    const orderDate = new Date(data.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });

    resultDiv.innerHTML = `
      <div class="card card-body" style="animation: slideUp 0.3s ease;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
          <div>
            <h3 style="margin-bottom: 4px;">Kode: ${data.order_code}</h3>
            <p style="font-size: 0.85rem; color: var(--color-text-3);">${orderDate}</p>
          </div>
          <span class="badge ${badgeClass}" style="font-size: 0.9rem; padding: 6px 12px;">${data.status.toUpperCase()}</span>
        </div>

        <div style="background: var(--color-surface-2); padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px;">
          <p style="margin-bottom: 4px;"><strong>Nama:</strong> ${data.customer_name}</p>
          <p style="margin-bottom: 4px;"><strong>Pengiriman:</strong> ${data.delivery_type === 'delivery' ? '🛵 Antar ke Alamat' : '🏪 Ambil Sendiri'}</p>
          <p style="margin-bottom: 4px;"><strong>Metode Pembayaran:</strong> ${data.payment_method.toUpperCase()}</p>
        </div>

        <h4 style="margin-bottom: 12px; border-bottom: 2px solid var(--color-border-light); padding-bottom: 8px;">Daftar Pesanan</h4>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
          ${data.items.map(i => `
            <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
              <span>${i.product_name} <span style="color: var(--color-primary); font-weight: bold;">×${i.quantity}</span></span>
              <span>${formatRupiah(i.subtotal)}</span>
            </div>
          `).join('')}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 2px dashed var(--color-border);">
          <span style="font-weight: 600; font-size: 1.1rem;">Total Tagihan</span>
          <span style="font-weight: 800; font-size: 1.2rem; color: var(--color-primary);">${formatRupiah(data.total_price)}</span>
        </div>
      </div>
    `;
  } catch (err) {
    resultDiv.innerHTML = `
      <div class="card card-body" style="text-align:center; padding: 32px 16px;">
        <div style="font-size: 3rem; margin-bottom: 12px;">🧐</div>
        <h4 style="color: var(--color-danger); margin-bottom: 8px;">Oops!</h4>
        <p style="color: var(--color-text-2);">${err.message}</p>
      </div>`;
  }
}