// ============================================================
// DapurBibi — SPA Router
// ============================================================

function navigate(path) {
  window.location.hash = path;
}

function requireAdmin(pageInit) {
  const token = localStorage.getItem('db_token');
  if (!token) {
    showToast('Silakan login sebagai admin terlebih dahulu', 'warning');
    navigate('login');
    return;
  }
  pageInit();
}

const ROUTES = {
  '': initHomePage,
  'home': initHomePage,
  'menu': initMenuPage,
  'cart': initCartPage,
  'checkout': initCheckoutPage,
  'login': initLoginPage,
  'admin/dashboard': () => requireAdmin(initDashboardPage),
  'admin/products': () => requireAdmin(initProductsPage),
  'admin/orders': () => requireAdmin(initOrdersPage),
  'admin/reports': () => requireAdmin(initReportsPage),
};

function router() {
  const hash = window.location.hash.slice(1) || 'home';
  closeModal();
  const handler = ROUTES[hash];
  if (handler) handler();
  else navigate('home');
}

window.addEventListener('hashchange', router);
window.addEventListener('load', router);
