function initCartPage() {
  renderNavbar('customer');
  renderCartPage();
}

function renderCartPage() {
  const cart = Cart.get();
  const app = document.getElementById('app');

  if (cart.length === 0) {
    app.innerHTML = `
      <div class="page cart-page"><div class="container">
        <button class="page-back" onclick="navigate('menu')">← Kembali ke Menu</button>
        <div class="empty-state">
          <div class="empty-icon">🛒</div><h3>Keranjang Masih Kosong</h3>
          <p>Yuk, tambah menu favorit Anda!</p>
          <button class="btn btn-primary" onclick="navigate('menu')">🍽️ Lihat Menu</button>
        </div>
      </div></div>`;
    return;
  }

  const total = Cart.total();
  const count = Cart.count();
  app.innerHTML = `
    <div class="page cart-page"><div class="container">
      <button class="page-back" onclick="navigate('menu')">← Lanjut Belanja</button>
      <h2 style="margin-bottom:20px">Keranjang Belanja 🛒</h2>
      <div class="cart-layout">
        <div id="cart-items">${cart.map(renderCartItem).join('')}</div>
        <div>
          <div class="order-summary-card">
            <div class="order-summary-header"><h3>Ringkasan Pesanan</h3></div>
            <div class="order-summary-body">
              ${cart.map(it=>`<div class="summary-row"><span>${it.name} ×${it.quantity}</span><span>${formatRupiah(it.price*it.quantity)}</span></div>`).join('')}
              <div class="summary-row total">
                <span>Total (${count} item)</span>
                <span class="summary-total-price">${formatRupiah(total)}</span>
              </div>
              <button class="btn btn-primary btn-full" style="margin-top:16px" onclick="navigate('checkout')">Lanjut Checkout →</button>
              <button class="btn btn-ghost btn-full btn-sm" style="margin-top:8px" onclick="navigate('menu')">+ Tambah Menu Lain</button>
            </div>
          </div>
        </div>
      </div>
    </div></div>`;
  attachCartEvents();
}

function renderCartItem(item) {
  const img = item.image_filename
    ? `<img src="/uploads/${item.image_filename}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;">`
    : `<div style="font-size:2.2rem;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,${getCategoryColor(item.category)}18,${getCategoryColor(item.category)}30)">${getCategoryEmoji(item.category)}</div>`;
  return `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-img">${img}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatRupiah(item.price)} / porsi</div>
        <div class="cart-item-controls">
          <div class="qty-control">
            <button class="qty-btn" data-action="decrease" data-id="${item.id}">−</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" data-action="increase" data-id="${item.id}">+</button>
          </div>
          <button class="remove-btn" data-action="remove" data-id="${item.id}" title="Hapus">🗑️</button>
        </div>
      </div>
      <div class="cart-item-subtotal">${formatRupiah(item.price * item.quantity)}</div>
    </div>`;
}

function attachCartEvents() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const id = parseInt(btn.dataset.id);
      const item = Cart.get().find(i => i.id === id);
      if (action === 'increase') Cart.updateQty(id, item.quantity + 1);
      else if (action === 'decrease') Cart.updateQty(id, item.quantity - 1);
      else if (action === 'remove') { Cart.remove(id); showToast('Item dihapus', 'info', 2000); }
      updateCartBadge();
      renderCartPage();
    });
  });
}
