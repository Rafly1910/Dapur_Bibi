function renderNavbar(role) {
  const navbar = document.getElementById('navbar');
  const count = Cart.count();

  if (role === 'admin') {
    navbar.innerHTML = `
      <div class="navbar-inner">
        <a class="navbar-brand" onclick="navigate('home')">
          <div class="brand-logo">🍽️</div>
          <div class="brand-name">Dapur<span>Bibi</span></div>
        </a>
        <div class="navbar-nav">
          <span style="font-size:0.85rem;color:var(--color-text-3);margin-right:8px">👤 Admin</span>
          <button class="nav-link" onclick="navigate('home')">Lihat Toko</button>
          <button class="btn btn-outline btn-sm" onclick="logoutAdmin()">Keluar</button>
        </div>
      </div>`;
  } else {
    const hash = window.location.hash.slice(1) || 'home';
    navbar.innerHTML = `
      <div class="navbar-inner">
        <a class="navbar-brand" onclick="navigate('home')">
          <div class="brand-logo">🍽️</div>
          <div class="brand-name">Dapur<span>Bibi</span></div>
        </a>
        <div class="navbar-nav">
          <button class="nav-link ${hash==='home'||hash===''?'active':''}" onclick="navigate('home')">Beranda</button>
          <button class="nav-link ${hash==='menu'?'active':''}" onclick="navigate('menu')">Menu</button>
          <button class="cart-btn" onclick="navigate('cart')">
            🛒 <span class="btn-label">Keranjang</span>
            ${count > 0 ? `<span class="cart-badge">${count}</span>` : ''}
          </button>
        </div>
        <button class="hamburger" id="hamburger-btn"><span></span><span></span><span></span></button>
      </div>
      <div class="mobile-menu" id="mobile-menu">
        <button class="nav-link" onclick="navigate('home');closeMobileMenu()">🏠 Beranda</button>
        <button class="nav-link" onclick="navigate('menu');closeMobileMenu()">🍽️ Menu</button>
        <button class="nav-link" onclick="navigate('cart');closeMobileMenu()">🛒 Keranjang ${count>0?`(${count})`:''}</button>
      </div>`;

    const hb = document.getElementById('hamburger-btn');
    const mm = document.getElementById('mobile-menu');
    if (hb) hb.addEventListener('click', () => mm.classList.toggle('open'));
  }

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

function closeMobileMenu() {
  const mm = document.getElementById('mobile-menu');
  if (mm) mm.classList.remove('open');
}

function updateCartBadge() {
  const badge = document.querySelector('.cart-badge');
  const count = Cart.count();
  if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'flex' : 'none'; }
}

function logoutAdmin() {
  localStorage.removeItem('db_token');
  showToast('Berhasil keluar', 'success');
  navigate('home');
}
