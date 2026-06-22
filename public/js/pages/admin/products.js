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
    <tbody>${list.map(p => {
      // Deteksi apakah gambar menggunakan link dari luar atau gambar bawaan lama
      const imgSrc = p.image_filename 
        ? (p.image_filename.startsWith('http') ? p.image_filename : `/uploads/${p.image_filename}`) 
        : '';
        
      return `
      <tr>
        <td><div class="product-thumb">${imgSrc ? `<img src="${imgSrc}" alt="${p.name}">` : `<span>${getCategoryEmoji(p.category)}</span>`}</div></td>
        <td><div style="font-weight:600;color:var(--color-secondary)">${p.name}</div><div style="font-size:0.78rem;color:var(--color-text-3);margin-top:2px">${(p.description||'').substring(0,50)}${p.description&&p.description.length>50?'...':''}</div></td>
        <td><span class="badge badge-primary">${p.category}</span></td>
        <td style="font-weight:700;color:var(--color-primary)">${formatRupiah(p.price)}</td>
        <td><span class="badge ${p.stock===1?'badge-selesai':'badge-dibatalkan'}">${p.stock===1?'Tersedia':'Habis'}</span></td>
        <td><span class="badge ${p.is_active===1?'badge-selesai':'badge-dibatalkan'}">${p.is_active===1?'Aktif':'Nonaktif'}</span></td>
        <td><div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" onclick="openEditProductModal(${p.id})">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteProduct(${p.id},'${p.name.replace(/'/g,"\\'")}')">🗑️</button>
        </div></td>
      </tr>`}).join('')}
    </tbody></table>`;
}

function productFormHTML(p = null) {
  // Ambil link yang sudah ada (jika sedang mode edit)
  const existingLink = p && p.image_filename && p.image_filename.startsWith('http') ? p.image_filename : '';

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
    
    <div class="form-group"><label class="form-label">Link Foto Menu (Opsional)</label>
      <input type="text" class="form-control" id="pf-img-url" value="${existingLink}" placeholder="Contoh: https://i.postimg.cc/gambar.jpg">
      <small style="color:var(--color-text-3); font-size: 0.8rem; margin-top: 4px;">* Anda bisa menyalin link gambar dari Postimages, Imgur, atau Google.</small>
      <div style="margin-top: 12px; text-align: center; background: var(--color-surface-2); border-radius: var(--radius-md); padding: 8px;">
        <img id="img-prev" class="image-preview ${existingLink ? '' : 'hidden'}" src="${existingLink}" style="max-height: 160px; object-fit: contain; width: 100%;">
      </div>
    </div>`;
}

function attachImagePreview() {
  const inp = document.getElementById('pf-img-url');
  const prev = document.getElementById('img-prev');
  
  if (inp && prev) {
    inp.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      // Memeriksa apakah link diawali dengan http/https
      if (url.startsWith('http')) {
        prev.src = url;
        prev.classList.remove('hidden');
      } else {
        prev.classList.add('hidden');
        prev.src = '';
      }
    });
  }
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
  fd.append('name', name); 
  fd.append('category', document.getElementById('pf-cat').value);
  fd.append('price', price); 
  fd.append('description', document.getElementById('pf-desc').value.trim());
  fd.append('stock', document.getElementById('pf-stock').value);
  fd.append('is_active', document.getElementById('pf-active').value);
  
  // Mengambil link gambar dari inputan
  const imgUrl = document.getElementById('pf-img-url').value.trim();
  if (imgUrl) fd.append('image_url', imgUrl);

  try {
    if (id) { 
      await Products.update(id, fd); 
      showToast('Menu diperbarui!', 'success'); 
    } else { 
      await Products.create(fd); 
      showToast('Menu ditambahkan!', 'success'); 
    }
    closeModal(); 
    await loadAdminProducts();
  } catch (e) { 
    showToast('Gagal: ' + e.message, 'error'); 
  }
}

function confirmDeleteProduct(id, name) {
  showConfirm('Hapus Menu', `Yakin hapus menu "<strong>${name}</strong>"? Tindakan ini tidak bisa dibatalkan.`,
    async () => {
      try { await Products.delete(id); showToast('Menu dihapus', 'success'); await loadAdminProducts(); }
      catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    }, { icon: '🗑️', confirmText: 'Ya, Hapus' });
}