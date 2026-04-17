let allProducts = [];
let currentCategory = 'Semua';
let searchQuery = '';

async function initMenuPage() {
  renderNavbar('customer');
  document.getElementById('app').innerHTML = `
    <div class="page menu-page">
      <div class="menu-hero">
        <div class="container">
          <h1 class="menu-hero-title">Menu Kami 🍽️</h1>
          <p class="menu-hero-sub">Pilihan makanan rumahan yang lezat dan bergizi</p>
        </div>
      </div>
      <div class="menu-toolbar">
        <div class="menu-toolbar-inner">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" class="search-input" id="menu-search" placeholder="Cari makanan...">
          </div>
          <div class="category-filters" id="cat-filters"></div>
        </div>
      </div>
      <div class="menu-grid-section">
        <div class="container">
          <div id="products-container"><div class="page-loading"><div class="spinner"></div></div></div>
        </div>
      </div>
    </div>
    <button class="floating-cart hidden" id="floating-cart" onclick="navigate('cart')">
      🛒 Keranjang (<span id="fc-count">0</span>)
    </button>`;

  try {
    allProducts = await Products.getAll();
    if (window.selectedCategory) { currentCategory = window.selectedCategory; window.selectedCategory = null; }
    else currentCategory = 'Semua';
    renderCategoryFilters();
    renderProducts();
    document.getElementById('menu-search').addEventListener('input', (e) => { searchQuery = e.target.value.toLowerCase(); renderProducts(); });
    updateFloatingCart();
  } catch (err) {
    document.getElementById('products-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😔</div><h3>Gagal memuat menu</h3>
        <p>${err.message}</p>
        <button class="btn btn-primary" onclick="initMenuPage()">Coba Lagi</button>
      </div>`;
  }
}

function renderCategoryFilters() {
  const cats = ['Semua', ...new Set(allProducts.map(p => p.category))];
  document.getElementById('cat-filters').innerHTML = cats.map(c =>
    `<button class="filter-pill ${c===currentCategory?'active':''}" onclick="selectCategory('${c}')">
      ${c==='Semua'?'🍽️ Semua':`${getCategoryEmoji(c)} ${c}`}
    </button>`
  ).join('');
}

function selectCategory(cat) {
  currentCategory = cat; renderCategoryFilters(); renderProducts();
}

function renderProducts() {
  const filtered = allProducts.filter(p => {
    const mc = currentCategory === 'Semua' || p.category === currentCategory;
    const ms = !searchQuery || p.name.toLowerCase().includes(searchQuery) || p.description.toLowerCase().includes(searchQuery);
    return mc && ms;
  });

  const container = document.getElementById('products-container');
  if (filtered.length === 0) {
    container.innerHTML = `<div class="no-results"><div class="icon">🔍</div><p>Tidak ada menu ditemukan</p>
      <button class="btn btn-outline btn-sm" onclick="selectCategory('Semua');document.getElementById('menu-search').value='';searchQuery='';">Reset Filter</button></div>`;
    return;
  }

  if (currentCategory === 'Semua' && !searchQuery) {
    const groups = {};
    for (const p of filtered) { if (!groups[p.category]) groups[p.category] = []; groups[p.category].push(p); }
    container.innerHTML = Object.entries(groups).map(([cat, prods]) =>
      `<div class="category-group">
        <h3 class="category-group-title">${getCategoryEmoji(cat)} ${cat}</h3>
        <div class="products-grid">${prods.map(renderProductCard).join('')}</div>
      </div>`
    ).join('');
  } else {
    container.innerHTML = `<div class="products-grid">${filtered.map(renderProductCard).join('')}</div>`;
  }

  container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = allProducts.find(x => x.id === parseInt(btn.dataset.id));
      if (p) addToCartFromMenu(p, btn);
    });
  });
}

function renderProductCard(p) {
  const img = p.image_filename
    ? `<img class="product-img" src="/uploads/${p.image_filename}" alt="${p.name}">`
    : `<div class="product-img-placeholder" style="background:linear-gradient(135deg,${getCategoryColor(p.category)}18,${getCategoryColor(p.category)}30)">${getCategoryEmoji(p.category)}</div>`;
  return `
    <div class="product-card">
      <div class="product-img-wrap">
        ${img}
        ${p.stock===0?'<div class="out-of-stock-badge">Habis</div>':''}
      </div>
      <div class="product-info">
        <div class="product-category">${p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description}</div>
        <div class="product-footer">
          <div class="product-price">${formatRupiah(p.price)}</div>
          <button class="add-to-cart-btn" data-id="${p.id}" ${p.stock===0?'disabled':''} title="Tambah ke keranjang">+</button>
        </div>
      </div>
    </div>`;
}

function addToCartFromMenu(product, btn) {
  Cart.add(product);
  showToast(`${product.name} ditambahkan! 🛒`, 'success', 2000);
  updateCartBadge();
  updateFloatingCart();
  btn.textContent = '✓'; btn.style.background = 'var(--color-success)';
  setTimeout(() => { btn.textContent = '+'; btn.style.background = ''; }, 1000);
}

function updateFloatingCart() {
  const count = Cart.count();
  const fc = document.getElementById('floating-cart');
  const fcc = document.getElementById('fc-count');
  if (fc) { fc.classList.toggle('hidden', count === 0); if (fcc) fcc.textContent = count; }
}
