function initLoginPage() {
  if (localStorage.getItem('db_token')) { navigate('admin/dashboard'); return; }
  renderNavbar('customer');
  document.getElementById('app').innerHTML = `
    <div class="page login-page">
      <div class="login-card">
        <div class="login-header">
          <div class="login-logo">🍽️</div>
          <h2>Admin DapurBibi</h2>
          <p class="login-subtitle">Masuk untuk mengelola pesanan & menu</p>
        </div>
        <form id="login-form" autocomplete="on">
          <div class="form-group">
            <label class="form-label" for="l-user">Username</label>
            <input type="text" class="form-control" id="l-user" name="username" placeholder="Masukkan username" autocomplete="username">
          </div>
          <div class="form-group">
            <label class="form-label" for="l-pass">Password</label>
            <input type="password" class="form-control" id="l-pass" name="password" placeholder="Masukkan password" autocomplete="current-password">
          </div>
          <div id="login-err" style="color:var(--color-danger);font-size:0.85rem;margin-bottom:12px;display:none;padding:10px;background:var(--color-danger-bg);border-radius:var(--radius-md)"></div>
          <button type="submit" class="btn btn-primary btn-full btn-lg" id="login-btn">Masuk ke Dashboard</button>
        </form>
        <div style="text-align:center;margin-top:20px">
          <button class="btn btn-ghost btn-sm" onclick="navigate('home')">← Kembali ke Beranda</button>
        </div>
      </div>
    </div>`;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('l-user').value.trim();
    const password = document.getElementById('l-pass').value;
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-err');
    if (!username || !password) { errEl.textContent = 'Username dan password harus diisi'; errEl.style.display = 'block'; return; }
    btn.disabled = true; btn.textContent = 'Memproses...'; errEl.style.display = 'none';
    try {
      const res = await Auth.login(username, password);
      localStorage.setItem('db_token', res.token);
      showToast(`Selamat datang, ${res.username}! 👋`, 'success');
      navigate('admin/dashboard');
    } catch (err) {
      errEl.textContent = err.message; errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Masuk ke Dashboard';
    }
  });
}
