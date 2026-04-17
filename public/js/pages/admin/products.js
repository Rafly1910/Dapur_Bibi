let adminProducts = [];

async function initProductsPage() {
  renderNavbar('admin');
  document.getElementById('app').innerHTML = `
    <div class="page admin-layout">
      ${renderAdminSidebar('products')}
      <div class="admin-content">
        <div class="admin-page-header">
          <h2 class="admin-page-title">🍽️ Manajemen Menu</h2>
          <button class="btn btn-primary" onclick="openAddProductModal()">+ Tambah Menu</button>
        </div>
        <div class="admin-search">
          <div class="search-box" style="max-width:280px;flex:1">
            <span class="search-icon">🔍</span>
            <input type="text" class="search-input" id="prod-search" placeholder="Cari menu...">
          </div>
          <select class="form-control" id="prod-cat" style="max-width:180px">
            <option value="">Semua Kategori</option>
            <option>Makan Berat</option><option>Lauk Pauk</option><option>Camilan</option><option>Minuman</option>
          </select>
        </div>
        <div class="table-container" id="prod-table"><div class="page-loading"><div class="spinner"></div></div></div>
      </div>
    </div>`;

  await loadAdminProducts();
  document.getElementById('prod-search').addEventListener('input', filterAdminProducts);
  document.getElementById('prod-cat').addEventListener('change', filterAdminProducts);
}

async function loadAdminProducts() {
  try {
    adminProducts = await Products.getAllAdmin();
    renderProductsTable(adminProducts);
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function filterAdminProducts() {
  const q = document.getElementById('prod-search').value.toLowerCase();
  const cat = document.getElementById('prod-cat').value;
  renderProductsTable(adminProducts.filter(p => (!q || p.name.toLowerCase().includes(q)) && (!cat || p.category === cat)));
}

function renderProductsTable(list) {
  const c = document.getElementById('prod-table');
  if (!list.length) { c.innerHTML = '<div class="no-results"><div class="icon">🍽️</div><p>Belum ada menu</p></div>'; return; }
  c.innerHTML = `<table>
    <thead><tr><th>Gambar</th><th>Nama Menu</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>${list.map(p => `
      <tr>
        <td><div class="product-thumb">${p.image_filename?`<img src="/uploads/${p.image_filename}" alt="${p.name}">`:`<span>${getCategoryEmoji(p.category)}</span>`}</div></td>
        <td><div style="font-weight:600;color:var(--color-secondary)">${p.name}</div><div style="font-size:0.78rem;color:var(--color-text-3);margin-top:2px">${(p.description||'').substring(0,50)}${p.description&&p.description.length>50?'...':''}</div></td>
        <td><span class="badge badge-primary">${p.category}</span></td>
        <td style="font-weight:700;color:var(--color-primary)">${formatRupiah(p.price)}</td>
        <td><span class="badge ${p.stock===1?'badge-selesai':'badge-dibatalkan'}">${p.stock===1?'Tersedia':'Habis'}</span></td>
        <td><span class="badge ${p.is_active===1?'badge-selesai':'badge-dibatalkan'}">${p.is_active===1?'Aktif':'Nonaktif'}</span></td>
        <td><div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" onclick="openEditProductModal(${p.id})">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteProduct(${p.id},'${p.name.replace(/'/g,"\\'")}')">🗑️</button>
        </div></td>
      </tr>`).join('')}
    </tbody></table>`;
}

function productFormHTML(p = null) {
  return `
    <div class="form-group"><label class="form-label">Nama Menu *</label>
      <input type="text" class="form-control" id="pf-name" value="${p?p.name:''}" placeholder="Nama makanan/minuman"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="form-group"><label class="form-label">Kategori *</label>
        <select class="form-control" id="pf-cat">
          ${['Makan Berat','Lauk Pauk','Camilan','Minuman'].map(c=>`<option ${p&&p.category===c?'selected':''}>${c}</option>`).join('')}
        </select></div>
      <div class="form-group"><label class="form-label">Harga (Rp) *</label>
        <input type="number" class="form-control" id="pf-price" value="${p?p.price:''}" placeholder="25000" min="0"></div>
    </div>
    <div class="form-group"><label class="form-label">Deskripsi</label>
      <textarea class="form-control" id="pf-desc" rows="3" placeholder="Deskripsi singkat menu">${p?p.description:''}</textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="form-group"><label class="form-label">Stok</label>
        <select class="form-control" id="pf-stock">
          <option value="1" ${!p||p.stock===1?'selected':''}>Tersedia</option>
          <option value="0" ${p&&p.stock===0?'selected':''}>Habis</option>
        </select></div>
      <div class="form-group"><label class="form-label">Status</label>
        <select class="form-control" id="pf-active">
          <option value="1" ${!p||p.is_active===1?'selected':''}>Aktif</option>
          <option value="0" ${p&&p.is_active===0?'selected':''}>Nonaktif</option>
        </select></div>
    </div>
    <div class="form-group"><label class="form-label">Foto Menu</label>
      <div class="image-upload-area">
        <input type="file" id="pf-img" accept="image/*">
        <div id="upload-ph"><div class="upload-icon">📷</div><div class="upload-text">Klik atau drag gambar (PNG/JPG, max 5MB)</div></div>
        ${p&&p.image_filename?`<img src="/uploads/${p.image_filename}" class="image-preview" id="img-prev">`:`<img class="image-preview hidden" id="img-prev">`}
      </div></div>`;
}

function attachImagePreview() {
  const inp = document.getElementById('pf-img');
  if (inp) inp.addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => { const prev = document.getElementById('img-prev'); prev.src = ev.target.result; prev.classList.remove('hidden'); };
    r.readAsDataURL(f);
  });
}

function openAddProductModal() {
  showModal('Tambah Menu Baru', productFormHTML(),
    `<button class="btn btn-ghost" onclick="closeModal()">Batal</button>
     <button class="btn btn-primary" onclick="saveProduct(null)">Simpan Menu</button>`);
  attachImagePreview();
}

function openEditProductModal(id) {
  const p = adminProducts.find(x => x.id === id); if (!p) return;
  showModal('Edit Menu', productFormHTML(p),
    `<button class="btn btn-ghost" onclick="closeModal()">Batal</button>
     <button class="btn btn-primary" onclick="saveProduct(${id})">Simpan Perubahan</button>`);
  attachImagePreview();
}

async function saveProduct(id) {
  const name = document.getElementById('pf-name').value.trim();
  const price = document.getElementById('pf-price').value;
  if (!name || !price) { showToast('Nama dan harga wajib diisi', 'error'); return; }
  const fd = new FormData();
  fd.append('name', name); fd.append('category', document.getElementById('pf-cat').value);
  fd.append('price', price); fd.append('description', document.getElementById('pf-desc').value.trim());
  fd.append('stock', document.getElementById('pf-stock').value);
  fd.append('is_active', document.getElementById('pf-active').value);
  const imgFile = document.getElementById('pf-img').files[0];
  if (imgFile) fd.append('image', imgFile);
  try {
    if (id) { await Products.update(id, fd); showToast('Menu diperbarui!', 'success'); }
    else { await Products.create(fd); showToast('Menu ditambahkan!', 'success'); }
    closeModal(); await loadAdminProducts();
  } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function confirmDeleteProduct(id, name) {
  showConfirm('Hapus Menu', `Yakin hapus menu "<strong>${name}</strong>"? Tindakan ini tidak bisa dibatalkan.`,
    async () => {
      try { await Products.delete(id); showToast('Menu dihapus', 'success'); await loadAdminProducts(); }
      catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    }, { icon: '🗑️', confirmText: 'Ya, Hapus' });
}
