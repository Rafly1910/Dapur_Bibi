// Shared: Admin Sidebar
function renderAdminSidebar(active) {
  const links = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', path: 'admin/dashboard' },
    { id: 'products', icon: '🍽️', label: 'Manajemen Menu', path: 'admin/products' },
    { id: 'orders', icon: '📦', label: 'Pesanan Masuk', path: 'admin/orders' },
    { id: 'reports', icon: '📈', label: 'Laporan Penjualan', path: 'admin/reports' },
  ];
  return `
    <aside class="admin-sidebar">
      <div class="sidebar-title">Menu Admin</div>
      ${links.map(l => `
        <button class="sidebar-link ${active===l.id?'active':''}" onclick="navigate('${l.path}')">
          <span class="link-icon">${l.icon}</span><span>${l.label}</span>
        </button>`).join('')}
      <div style="flex:1"></div>
      <div style="padding:16px 20px;border-top:1px solid rgba(255,255,255,0.1);margin-top:16px">
        <button class="sidebar-link" onclick="logoutAdmin()" style="color:rgba(255,107,53,0.9)">
          <span class="link-icon">🚪</span><span>Keluar</span>
        </button>
      </div>
    </aside>`;
}

let dbChart = null;

async function initDashboardPage() {
  renderNavbar('admin');
  document.getElementById('app').innerHTML = `
    <div class="page admin-layout">
      ${renderAdminSidebar('dashboard')}
      <div class="admin-content">
        <div class="admin-page-header">
          <h2 class="admin-page-title">📊 Dashboard</h2>
          <span style="font-size:0.85rem;color:var(--color-text-3)">${new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
        </div>
        <div class="stats-grid" id="db-stats">
          ${[1,2,3,4].map(()=>`<div class="stat-card"><div class="skeleton" style="width:52px;height:52px;border-radius:12px;flex-shrink:0"></div><div style="flex:1"><div class="skeleton" style="height:12px;width:80%;margin-bottom:8px;border-radius:4px"></div><div class="skeleton" style="height:20px;width:60%;border-radius:4px"></div></div></div>`).join('')}
        </div>
        <div class="chart-container" style="margin-bottom:20px">
          <div class="chart-header"><h3 class="chart-title">📈 Pesanan 7 Hari Terakhir</h3><button class="btn btn-outline btn-sm" onclick="loadDashboardData()">🔄</button></div>
          <canvas id="db-chart" height="110"></canvas>
        </div>
        <div class="chart-container">
          <div class="chart-header">
            <h3 class="chart-title">🕐 Pesanan Terbaru</h3>
            <button class="btn btn-outline btn-sm" onclick="navigate('admin/orders')">Lihat Semua</button>
          </div>
          <div id="recent-orders"><div class="page-loading" style="min-height:100px"><div class="spinner"></div></div></div>
        </div>
      </div>
    </div>`;
  await loadDashboardData();
}

async function loadDashboardData() {
  try {
    const [summary, daily, orders] = await Promise.all([
      Reports.getSummary(), Reports.getDaily(7), Orders.getAll()
    ]);

    document.getElementById('db-stats').innerHTML = `
      <div class="stat-card"><div class="stat-icon stat-icon-orange">📦</div><div class="stat-info"><div class="stat-label">Pesanan Hari Ini</div><div class="stat-value">${summary.today_orders}</div></div></div>
      <div class="stat-card"><div class="stat-icon stat-icon-green">💰</div><div class="stat-info"><div class="stat-label">Pendapatan Hari Ini</div><div class="stat-value small">${formatRupiah(summary.today_revenue)}</div></div></div>
      <div class="stat-card"><div class="stat-icon stat-icon-gold">⏳</div><div class="stat-info"><div class="stat-label">Menunggu Diproses</div><div class="stat-value">${summary.pending_orders}</div></div></div>
      <div class="stat-card"><div class="stat-icon stat-icon-blue">📊</div><div class="stat-info"><div class="stat-label">Total Pendapatan</div><div class="stat-value small">${formatRupiah(summary.total_revenue)}</div></div></div>`;

    const labels = daily.map(d => new Date(d.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }));
    if (dbChart) dbChart.destroy();
    dbChart = new Chart(document.getElementById('db-chart').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Pesanan', data: daily.map(d => d.order_count),
          backgroundColor: 'rgba(255,107,53,0.8)', borderColor: 'rgba(255,107,53,1)',
          borderWidth: 2, borderRadius: 8,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          tooltip: { callbacks: { afterLabel: (ctx) => `Pendapatan: ${formatRupiah(daily[ctx.dataIndex].revenue)}` } },
        },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } },
      },
    });

    const recent = orders.slice(0, 5);
    document.getElementById('recent-orders').innerHTML = recent.length === 0
      ? '<div class="no-results"><div class="icon">📦</div><p>Belum ada pesanan</p></div>'
      : `<table><thead><tr><th>Kode</th><th>Pelanggan</th><th>Total</th><th>Status</th><th>Waktu</th></tr></thead>
        <tbody>${recent.map(o=>`
          <tr class="clickable" onclick="navigate('admin/orders')">
            <td><strong>${o.order_code}</strong></td><td>${o.customer_name}</td>
            <td>${formatRupiah(o.total_price)}</td>
            <td><span class="badge badge-${o.status}">${o.status.charAt(0).toUpperCase()+o.status.slice(1)}</span></td>
            <td style="font-size:0.78rem;color:var(--color-text-3)">${formatDate(o.created_at)}</td>
          </tr>`).join('')}</tbody></table>`;
  } catch (err) {
    showToast('Gagal memuat data: ' + err.message, 'error');
  }
}
