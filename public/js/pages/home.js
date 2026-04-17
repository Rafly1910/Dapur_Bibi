function initHomePage() {
  renderNavbar('customer');
  document.getElementById('app').innerHTML = `
    <div class="page">
      <section class="hero-section">
        <div class="hero-bg-decoration">
          <div class="hero-blob hero-blob-1"></div>
          <div class="hero-blob hero-blob-2"></div>
        </div>
        <div class="hero-container">
          <div class="hero-content">
            <div class="hero-badge">🍽️ Makanan Rumahan Berkualitas</div>
            <h1 class="hero-title">Pesan Makanan <span class="highlight">Lezat</span><br>dari Dapur Kami</h1>
            <p class="hero-subtitle">Nikmati cita rasa masakan rumahan yang hangat dan lezat. Pesan dengan mudah, data tercatat otomatis.</p>
            <div class="hero-actions">
              <button class="btn btn-primary btn-lg" onclick="navigate('menu')">🍽️ Lihat Menu</button>
              <button class="btn btn-outline btn-lg" onclick="document.getElementById('cara-pesan').scrollIntoView({behavior:'smooth'})">Cara Pesan</button>
            </div>
          </div>
          <div class="hero-visual">
            <div class="hero-food-grid">
              <div class="food-card-preview">
                <div class="food-emoji-bg" style="background:linear-gradient(135deg,#FF6B3520,#FF6B3540)">🍚</div>
                <div class="food-card-info"><div class="food-card-name">Nasi Goreng Spesial</div><div class="food-card-price">Rp 25.000</div></div>
              </div>
              <div class="food-card-preview">
                <div class="food-emoji-bg" style="background:linear-gradient(135deg,#22C55E20,#22C55E40)">🍗</div>
                <div class="food-card-info"><div class="food-card-name">Ayam Bakar Madu</div><div class="food-card-price">Rp 30.000</div></div>
              </div>
              <div class="food-card-preview">
                <div class="food-emoji-bg" style="background:linear-gradient(135deg,#F59E0B20,#F59E0B40)">🍪</div>
                <div class="food-card-info"><div class="food-card-name">Pisang Goreng Crispy</div><div class="food-card-price">Rp 12.000</div></div>
              </div>
              <div class="food-card-preview">
                <div class="food-emoji-bg" style="background:linear-gradient(135deg,#3B82F620,#3B82F640)">🥤</div>
                <div class="food-card-info"><div class="food-card-name">Jus Alpukat</div><div class="food-card-price">Rp 15.000</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="categories-section">
        <div class="container">
          <div class="section-header">
            <span class="section-label">Pilih Kategori</span>
            <h2 class="section-title">Apa yang Anda Inginkan?</h2>
          </div>
          <div class="categories-grid">
            <div class="category-tile" onclick="navigateToMenu('Makan Berat')"><div class="category-emoji">🍚</div><div class="category-name">Makan Berat</div></div>
            <div class="category-tile" onclick="navigateToMenu('Lauk Pauk')"><div class="category-emoji">🍗</div><div class="category-name">Lauk Pauk</div></div>
            <div class="category-tile" onclick="navigateToMenu('Camilan')"><div class="category-emoji">🍪</div><div class="category-name">Camilan</div></div>
            <div class="category-tile" onclick="navigateToMenu('Minuman')"><div class="category-emoji">🥤</div><div class="category-name">Minuman</div></div>
          </div>
        </div>
      </section>

      <section class="features-section" id="cara-pesan">
        <div class="container">
          <div class="section-header">
            <span class="section-label">Cara Pemesanan</span>
            <h2 class="section-title">Mudah & Cepat dalam 3 Langkah</h2>
            <p class="section-subtitle">Pesan makanan favorit Anda dengan proses yang simpel dan menyenangkan</p>
          </div>
          <div class="features-grid">
            <div class="feature-card"><div class="feature-icon">🛍️</div><h3 class="feature-title">1. Pilih Menu</h3><p class="feature-desc">Jelajahi berbagai pilihan menu lezat dan tambahkan ke keranjang belanja Anda dengan mudah.</p></div>
            <div class="feature-card"><div class="feature-icon">📋</div><h3 class="feature-title">2. Isi Data</h3><p class="feature-desc">Lengkapi data diri dan pilih metode pengiriman: antar ke alamat atau ambil sendiri.</p></div>
            <div class="feature-card"><div class="feature-icon">✅</div><h3 class="feature-title">3. Pesanan Diproses</h3><p class="feature-desc">Pesanan Anda langsung tercatat di sistem kami dan segera diproses oleh dapur.</p></div>
          </div>
        </div>
      </section>

      <footer class="footer">
        <div class="container">
          <div class="footer-content">
            <div>
              <div class="navbar-brand" style="cursor:default">
                <div class="brand-logo">🍽️</div>
                <div class="brand-name" style="color:white">Dapur<span>Bibi</span></div>
              </div>
              <p class="footer-desc">Menyajikan cita rasa rumahan yang hangat dan lezat. Pesanan Anda tercatat otomatis dan diproses dengan cepat.</p>
            </div>
            <div>
              <div class="footer-title">Menu</div>
              <div class="footer-links">
                <a onclick="navigateToMenu('Makan Berat')">Makan Berat</a>
                <a onclick="navigateToMenu('Lauk Pauk')">Lauk Pauk</a>
                <a onclick="navigateToMenu('Camilan')">Camilan</a>
                <a onclick="navigateToMenu('Minuman')">Minuman</a>
              </div>
            </div>
            <div>
              <div class="footer-title">Informasi</div>
              <div class="footer-links">
                <a onclick="navigate('menu')">Lihat Semua Menu</a>
                <a onclick="navigate('cart')">Keranjang</a>
                <a onclick="navigate('login')">Admin Login</a>
              </div>
            </div>
          </div>
          <div class="footer-bottom">© ${new Date().getFullYear()} DapurBibi. Dibuat dengan ❤️ untuk UMKM Indonesia.</div>
        </div>
      </footer>
    </div>`;
}

function navigateToMenu(category) {
  window.selectedCategory = category;
  navigate('menu');
}
