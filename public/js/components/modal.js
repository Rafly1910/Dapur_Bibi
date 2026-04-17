function showModal(title, bodyHTML, footerHTML = '', opts = {}) {
  const ov = document.getElementById('modal-overlay');
  ov.innerHTML = `
    <div class="modal" id="modal-dialog">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" id="modal-close-btn">✕</button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>`;
  ov.classList.remove('hidden');
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  if (!opts.noBackdropClose) {
    ov.addEventListener('click', (e) => { if (e.target === ov) closeModal(); });
  }
}

function closeModal() {
  const ov = document.getElementById('modal-overlay');
  ov.classList.add('hidden');
  ov.innerHTML = '';
}

function showConfirm(title, message, onConfirm, opts = {}) {
  showModal(title,
    `<div class="confirm-dialog"><div class="warning-icon">${opts.icon || '⚠️'}</div><p>${message}</p></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Batal</button>
     <button class="btn btn-danger" id="confirm-ok-btn">${opts.confirmText || 'Ya, Hapus'}</button>`,
    { noBackdropClose: true }
  );
  document.getElementById('confirm-ok-btn').addEventListener('click', () => { closeModal(); onConfirm(); });
}
