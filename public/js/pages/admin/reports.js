let reportChart = null;

async function initReportsPage() {
  renderNavbar('admin');
  const today = new Date().toISOString().slice(0, 10);
  const thirtyAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

  document.getElementById('app').innerHTML = `
    <div class="page admin-layout">
      ${renderAdminSidebar('reports')}
      <div class="admin-content">
        <div class="admin-page-header"><h2 class="admin-page-title">📈 Laporan Penjualan</h2></div>
        <div class="date-filter">
          <div class="period-tabs">
            <button class="period-tab" onclick="applyQuickFilter('today')">Hari Ini</button>
            <button class="period-tab" onclick="applyQuickFilter('week')">7 Hari</button>
            <button class="period-tab active" onclick="applyQuickFilter('month')">30 Hari</button>
            <button class="period-tab" onclick="applyQuickFilter('all')">Semua</button>
          </div>
          <div class="date-inputs">
            <label>Dari:</label>
            <input type="date" class="form-control" id="rpt-from" value="${thirtyAgo}" style="max-width:155px">
            <label>Sampai:</label>
            <input type="date" class="form-control" id="rpt-to" value="${today}" style="max-width:155px">
            <button class="btn btn-primary btn-sm" onclick="loadReportData()">Terapkan</button>
          </div>
        </div>
        <div class="stats-grid" id="rpt-stats">
          <div class="page-loading" style="min-height:60px;grid-column:span 4"><div class="spinner"></div></div>
        </div>
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:20px">
          <div class="chart-container">
            <div class="chart-header"><h3 class="chart-title">📊 Pendapatan Harian</h3></div>
            <canvas id="rpt-chart" height="130"></canvas>
          </div>
          <div class="chart-container">
            <div class="chart-header"><h3 class="chart-title">🏆 Menu Terlaris</h3></div>
            <div id="top-prods"><div class="page-loading" style="min-height:80px"><div class="spinner"></div></div></div>
          </div>
        </div>
        <div class="chart-container">
          <div class="chart-header"><h3 class="chart-title">🧾 Histori Transaksi</h3></div>
          <div id="transactions"><div class="page-loading" style="min-height:60px"><div class="spinner"></div></div></div>
        </div>
      </div>
    </div>`;

  await loadReportData();
}

function applyQuickFilter(p) {
  const today = new Date();
  let from = '', to = today.toISOString().slice(0, 10);
  document.querySelectorAll('.period-tab').forEach((t, i) => t.classList.toggle('active', ['today','week','month','all'][i] === p));
  if (p === 'today') from = to;
  else if (p === 'week') from = new Date(Date.now()-6*86400000).toISOString().slice(0,10);
  else if (p === 'month') from = new Date(Date.now()-29*86400000).toISOString().slice(0,10);
  else { from = ''; to = ''; }
  document.getElementById('rpt-from').value = from;
  document.getElementById('rpt-to').value = to;
  loadReportData();
}

async function loadReportData() {
  const from = document.getElementById('rpt-from').value;
  const to = document.getElementById('rpt-to').value;
  const params = {};
  if (from) params.date_from = from;
  if (to) params.date_to = to;
  try {
    const [summary, transactions, topProds] = await Promise.all([
      Reports.getSummary(params), Reports.getTransactions({ ...params, limit: 20 }), Reports.getTopProducts({ ...params, limit: 5 })
    ]);
    let days = 30;
    if (from && to) days = Math.min(Math.ceil((new Date(to)-new Date(from))/86400000)+1, 30);
    const daily = await Reports.getDaily(days);

    document.getElementById('rpt-stats').innerHTML = `
      <div class="stat-card"><div class="stat-icon stat-icon-green">💰</div><div class="stat-info"><div class="stat-label">Total Pendapatan</div><div class="stat-value small">${formatRupiah(summary.total_revenue)}</div></div></div>
      <div class="stat-card"><div class="stat-icon stat-icon-orange">📦</div><div class="stat-info"><div class="stat-label">Total Transaksi</div><div class="stat-value">${summary.total_orders}</div></div></div>
      <div class="stat-card"><div class="stat-icon stat-icon-blue">🍽️</div><div class="stat-info"><div class="stat-label">Item Terjual</div><div class="stat-value">${summary.total_items_sold}</div></div></div>
      <div class="stat-card"><div class="stat-icon stat-icon-gold">📊</div><div class="stat-info"><div class="stat-label">Rata-rata Pesanan</div><div class="stat-value small">${formatRupiah(summary.avg_order_value)}</div></div></div>`;

    if (reportChart) reportChart.destroy();
    reportChart = new Chart(document.getElementById('rpt-chart').getContext('2d'), {
      type: 'line',
      data: {
        labels: daily.map(d => new Date(d.date).toLocaleDateString('id-ID',{day:'numeric',month:'short'})),
        datasets: [{ label: 'Pendapatan', data: daily.map(d => d.revenue), backgroundColor: 'rgba(255,107,53,0.1)', borderColor: 'rgba(255,107,53,1)', borderWidth: 2.5, fill: true, tension: 0.4, pointBackgroundColor: '#FF6B35', pointRadius: 4 }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${formatRupiah(c.raw)}` } } },
        scales: { y: { beginAtZero: true, ticks: { callback: v => 'Rp '+v.toLocaleString('id-ID') } } },
      },
    });

    document.getElementById('top-prods').innerHTML = !topProds.length
      ? '<p style="text-align:center;color:var(--color-text-3);padding:20px">Belum ada data</p>'
      : topProds.map((p,i) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--color-border-light)">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:28px;height:28px;border-radius:50%;background:rgba(255,107,53,${0.9-i*0.15});color:white;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700">${i+1}</div>
            <div><div style="font-size:0.875rem;font-weight:600">${p.product_name}</div><div style="font-size:0.75rem;color:var(--color-text-3)">${p.total_quantity} terjual</div></div>
          </div>
          <div style="font-weight:700;font-size:0.875rem;color:var(--color-primary)">${formatRupiah(p.total_revenue)}</div>
        </div>`).join('');

    document.getElementById('transactions').innerHTML = !transactions.length
      ? '<div class="no-results"><div class="icon">🧾</div><p>Tidak ada transaksi</p></div>'
      : `<table><thead><tr><th>Kode</th><th>Tanggal</th><th>Pelanggan</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>${transactions.map(t=>`
          <tr><td><strong>${t.order_code}</strong></td><td style="font-size:0.85rem">${formatDateShort(t.created_at)}</td><td>${t.customer_name}</td>
          <td style="font-weight:700;color:var(--color-primary)">${formatRupiah(t.total_price)}</td>
          <td><span class="badge badge-${t.status}">${t.status.charAt(0).toUpperCase()+t.status.slice(1)}</span></td></tr>`).join('')}
        </tbody></table>`;

  } catch (e) { showToast('Gagal memuat laporan: ' + e.message, 'error'); }
}
