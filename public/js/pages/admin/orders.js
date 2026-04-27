let allOrders = [];
let currentOrderStatus = 'semua';

async function initOrdersPage() {
  renderNavbar('admin');
  document.getElementById('app').innerHTML = `
    <div class="page admin-layout">
      ${renderAdminSidebar('orders')}
      <div class="admin-content">
        <div class="admin-page-header">
          <h2 class="admin-page-title">📦 Pesanan Masuk</h2>
          <button class="btn btn-outline btn-sm" onclick="loadOrders()">🔄 Refresh</button>
        </div>
        <div class="filter-bar" id="status-tabs">
          ${['semua','menunggu','diproses','selesai','dibatalkan'].map((s,i) => {
            const icons = ['📋','⏳','🔵','✅','❌'];
            const labels = ['Semua','Menunggu','Diproses','Selesai','Dibatalkan'];
            return `<button class="period-tab ${s==='semua'?'active':''}" onclick="filterOrderStatus('${s}')">${icons[i]} ${labels[i]}</button>`;
          }).join('')}
        </div>
        <div class="admin-search">
          <div class="search-box" style="max-width:300px;flex:1">
            <span class="search-icon">🔍</span>
            <input type="text" class="search-input" id="ord-search" placeholder="Cari nama / kode...">
          </div>
          <input type="date" class="form-control" id="ord-from" style="max-width:155px">
          <input type="date" class="form-control" id="ord-to" style="max-width:155px">
          <button class="btn btn-outline btn-sm" onclick="loadOrders()">Cari</button>
        </div>
        <div class="table-container" id="orders-table"><div class="page-loading"><div class="spinner"></div></div></div>
      </div>
    </div>`;
  await loadOrders();
  document.getElementById('ord-search').addEventListener('input', filterOrdersLocal);
}

async function loadOrders() {
  const from = document.getElementById('ord-from')?.value;
  const to = document.getElementById('ord-to')?.value;
  const params = {};
  if (currentOrderStatus !== 'semua') params.status = currentOrderStatus;
  if (from) params.date_from = from;
  if (to) params.date_to = to;
  try {
    allOrders = await Orders.getAll(params);
    renderOrdersTable(allOrders);
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function filterOrderStatus(s) {
  currentOrderStatus = s;
  document.querySelectorAll('#status-tabs .period-tab').forEach((tab, i) => {
    tab.classList.toggle('active', ['semua','menunggu','diproses','selesai','dibatalkan'][i] === s);
  });
  loadOrders();
}

function filterOrdersLocal() {
  const q = document.getElementById('ord-search').value.toLowerCase();
  renderOrdersTable(q ? allOrders.filter(o => o.customer_name.toLowerCase().includes(q) || o.order_code.toLowerCase().includes(q)) : allOrders);
}

function getStatusColor(s) {
  return { menunggu:'var(--color-warning)', diproses:'var(--color-info)', selesai:'var(--color-success)', dibatalkan:'var(--color-danger)' }[s] || 'var(--color-text-3)';
}

function renderOrdersTable(list) {
  const c = document.getElementById('orders-table');
  if (!list.length) { c.innerHTML = '<div class="no-results"><div class="icon">📦</div><p>Tidak ada pesanan</p></div>'; return; }
  c.innerHTML = `<table>
    <thead><tr><th>Kode</th><th>Pelanggan</th><th>No. HP</th><th>Total</th><th>Tipe</th><th>Bayar</th><th>Status</th><th>Waktu</th><th>Aksi</th></tr></thead>
    <tbody>${list.map(o => `
      <tr>
        <td><strong style="font-family:var(--font-heading)">${o.order_code}</strong></td>
        <td>${o.customer_name}</td>
        <td style="font-size:0.85rem">${o.customer_phone}</td>
        <td style="font-weight:700;color:var(--color-primary)">${formatRupiah(o.total_price)}</td>
        <td><span class="badge ${o.delivery_type==='delivery'?'badge-diproses':'badge-primary'}">${o.delivery_type==='delivery'?'🛵 Antar':'🏪 Ambil'}</span></td>
        <td><span class="badge ${o.payment_status==='sudah_bayar'?'badge-selesai':'badge-menunggu'}" style="font-size:0.7rem">${getPaymentIcon(o.payment_method)} ${o.payment_status==='sudah_bayar'?'Lunas':'Pending'}</span></td>
        <td>
          <select class="status-select" style="border-color:${getStatusColor(o.status)};color:${getStatusColor(o.status)}" onchange="updateStatus(${o.id},this.value)">
            <option value="menunggu" ${o.status==='menunggu'?'selected':''}>⏳ Menunggu</option>
            <option value="diproses" ${o.status==='diproses'?'selected':''}>🔵 Diproses</option>
            <option value="selesai" ${o.status==='selesai'?'selected':''}>✅ Selesai</option>
            <option value="dibatalkan" ${o.status==='dibatalkan'?'selected':''}>❌ Dibatalkan</option>
          </select>
        </td>
        <td style="font-size:0.78rem;color:var(--color-text-3)">${formatDate(o.created_at)}</td>
        <td><button class="btn btn-outline btn-sm" onclick="viewOrderDetail(${o.id})">👁 Detail</button></td>
      </tr>`).join('')}
    </tbody></table>`;
}

async function updateStatus(id, status) {
  try {
    await Orders.updateStatus(id, status);
    showToast('Status diperbarui ✓', 'success', 2000);
    const o = allOrders.find(x => x.id === id); if (o) o.status = status;
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); await loadOrders(); }
}

async function viewOrderDetail(id) {
  try {
    const o = await Orders.getOne(id);
    showModal(`Detail Pesanan — ${o.order_code}`, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div><div style="font-size:0.78rem;color:var(--color-text-3);margin-bottom:4px">Pelanggan</div><div style="font-weight:600">${o.customer_name}</div></div>
        <div><div style="font-size:0.78rem;color:var(--color-text-3);margin-bottom:4px">No. HP</div><div style="font-weight:600">${o.customer_phone}</div></div>
        <div><div style="font-size:0.78rem;color:var(--color-text-3);margin-bottom:4px">Pengiriman</div><div>${o.delivery_type==='delivery'?'🛵 Antar ke Alamat':'🏪 Ambil Sendiri'}</div></div>
        <div><div style="font-size:0.78rem;color:var(--color-text-3);margin-bottom:4px">Status</div><span class="badge badge-${o.status}">${o.status.charAt(0).toUpperCase()+o.status.slice(1)}</span></div>
        <div><div style="font-size:0.78rem;color:var(--color-text-3);margin-bottom:4px">Metode Bayar</div><div>${getPaymentIcon(o.payment_method)} ${getPaymentLabel(o.payment_method)}</div></div>
        <div><div style="font-size:0.78rem;color:var(--color-text-3);margin-bottom:4px">Status Bayar</div><span class="badge ${o.payment_status==='sudah_bayar'?'badge-selesai':'badge-menunggu'}">${o.payment_status==='sudah_bayar'?'✅ Sudah Bayar':'⏳ Belum Bayar'}</span></div>
        ${o.customer_address?`<div style="grid-column:span 2"><div style="font-size:0.78rem;color:var(--color-text-3);margin-bottom:4px">Alamat</div><div>${o.customer_address}</div></div>`:''}
        ${o.notes?`<div style="grid-column:span 2"><div style="font-size:0.78rem;color:var(--color-text-3);margin-bottom:4px">Catatan</div><div style="font-style:italic">${o.notes}</div></div>`:''}
        <div><div style="font-size:0.78rem;color:var(--color-text-3);margin-bottom:4px">Waktu Pesan</div><div style="font-size:0.85rem">${formatDate(o.created_at)}</div></div>
      </div>
      <div class="divider"></div>
      <h4 style="margin-bottom:12px">🛍️ Item yang Dipesan</h4>
      <div style="border:1px solid var(--color-border-light);border-radius:var(--radius-md);overflow:hidden">
        <table><thead><tr><th>Menu</th><th>Harga</th><th>Qty</th><th>Subtotal</th></tr></thead>
        <tbody>${o.items.map(it=>`<tr><td style="font-weight:500">${it.product_name}</td><td>${formatRupiah(it.product_price)}</td><td>${it.quantity}</td><td style="font-weight:700;color:var(--color-primary)">${formatRupiah(it.subtotal)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding:16px;background:var(--color-surface-2);border-radius:var(--radius-md)">
        <span style="font-weight:700;font-family:var(--font-heading)">TOTAL PEMBAYARAN</span>
        <span style="font-size:1.3rem;font-weight:800;font-family:var(--font-heading);color:var(--color-primary)">${formatRupiah(o.total_price)}</span>
      </div>`,
      `${o.payment_status !== 'sudah_bayar' ? `<button class="btn btn-success" id="confirm-pay-btn">💰 Konfirmasi Bayar</button>` : ''}
       <button class="btn btn-primary" onclick="closeModal()">Tutup</button>`);
    if (o.payment_status !== 'sudah_bayar') {
      document.getElementById('confirm-pay-btn')?.addEventListener('click', async () => {
        try { await Orders.confirmPayment(o.id); showToast('Pembayaran dikonfirmasi ✓', 'success'); closeModal(); await loadOrders(); }
        catch(e) { showToast('Gagal: ' + e.message, 'error'); }
      });
    }
  } catch (e) { showToast('Gagal memuat detail: ' + e.message, 'error'); }
}
