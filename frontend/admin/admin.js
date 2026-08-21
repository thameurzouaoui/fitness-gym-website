'use strict';
/* ============================================================
   ACTIV FITNESS — Admin dashboard (French)
   ============================================================ */

const API_BASE = 'https://activ-fitness-api.onrender.com/api';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function getAuthToken() {
  return localStorage.getItem('auth_token');
}

function setAuthHeaders(headers = {}) {
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

const api = async (url, opts = {}) => {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: setAuthHeaders({ 'Content-Type': 'application/json' }),
    ...opts
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}
let PRODUCTS = [];

const toastMsg = $('#toast-admin-msg');
const toastEl = $('#toast-admin');
let toastTimer;
function toast(msg, ok = true) {
  toastMsg.textContent = msg;
  toastEl.style.background = ok ? '#2ecc71' : '#e74c3c';
  toastEl.style.color = ok ? '#04210f' : '#fff';
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDT = n => Number(n).toFixed(2).replace(/\.00$/, '') + ' DT';
const fmtDate = s => {
  if (!s) return '';
  const d = new Date(s + 'Z');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
         d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

/* ==================== AUTH ==================== */
async function checkAuth() {
  const token = getAuthToken();
  if (!token) {
    $('#login-screen').style.display = 'flex';
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: setAuthHeaders({ 'Content-Type': 'application/json' })
    });
    const data = await res.json();
    if (data.user) { enterApp(data.user); return; }
  } catch { /* offline */ }
  localStorage.removeItem('auth_token');
  $('#login-screen').style.display = 'flex';
}
function enterApp(user) {
  $('#login-screen').style.display = 'none';
  const app = $('#admin-app');
  app.removeAttribute('hidden');
  app.style.display = 'flex';
  loadAll();
}
$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  $('#login-error').textContent = '';
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: $('#login-user').value.trim(), password: $('#login-pass').value })
    });
    if (data.token) localStorage.setItem('auth_token', data.token);
    enterApp(data);
  } catch (err) {
    $('#login-error').textContent = err.message;
  }
});
$('#logout-btn').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  localStorage.removeItem('auth_token');
  location.reload();
});

/* ==================== NAVIGATION ==================== */
$$('.side-item').forEach(btn => btn.addEventListener('click', () => {
  $$('.side-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  $$('.tab-panel').forEach(p => p.classList.remove('active'));
  $('#tab-' + btn.dataset.tab).classList.add('active');
}));

/* ==================== LOADERS ==================== */
async function loadAll() {
  try {
    const [stats, orders, prods, contacts, members] = await Promise.all([
      api('/api/admin/stats'), api('/api/admin/orders'),
      api('/api/admin/products'), api('/api/admin/contacts'), api('/api/admin/members')
    ]);
    renderStats(stats.stats, stats.recentOrders);
    renderOrders(orders.orders);
    renderProducts(prods.products);
    renderContacts(contacts.contacts);
    renderMembers(members.members);
  } catch (err) { toast('Erreur de chargement: ' + err.message, false); }
}

/* ==================== DASHBOARD ==================== */
function renderStats(s, recent) {
  $('#st-orders').textContent = s.orders;
  $('#st-pending').textContent = s.pending;
  $('#st-revenue').textContent = fmtDT(s.revenue);
  $('#st-members').textContent = s.members;
  $('#st-products').textContent = s.products;
  $('#st-unread').textContent = s.unread;

  $('#count-orders').textContent = s.orders;
  $('#count-orders').classList.toggle('hot', s.pending > 0);
  $('#count-products').textContent = s.products;
  $('#count-unread').textContent = s.unread;
  $('#count-unread').classList.toggle('hot', s.unread > 0);
  $('#count-members').textContent = s.members;

  $('#recent-list').innerHTML = recent.length ? recent.map(o => `
    <div class="card">
      <div><strong>${esc(o.customer_name)}</strong> <span class="muted">${esc(o.order_ref)}</span></div>
      <div class="muted">${fmtDT(o.total)} &bull; ${fmtDate(o.created_at)}</div>
      <span class="badge ${o.status}">${o.status}</span>
    </div>`).join('') : '<p class="empty">Aucune commande pour le moment</p>';
}

/* ==================== ORDERS ==================== */
let ALL_ORDERS = [];
let ORDER_FILTER = 'all';
function renderOrders(orders) {
  ALL_ORDERS = orders;
  paintOrders();
}
function paintOrders() {
  const list = ORDER_FILTER === 'all' ? ALL_ORDERS : ALL_ORDERS.filter(o => o.status === ORDER_FILTER);
  $('#orders-list').innerHTML = list.length ? list.map(o => `
    <div class="card">
      <div class="order-head">
        <div>
          <h4>${esc(o.customer_name)} <span class="muted">(&#35;${esc(o.order_ref)})</span></h4>
          <span class="muted">${fmtDate(o.created_at)}</span>
        </div>
        <span class="badge ${o.status}">${o.status}</span>
      </div>
      <div class="grid2">
        <span class="muted"><i class="fas fa-phone"></i> ${esc(o.phone || '—')}</span>
        <span class="muted"><i class="fas fa-envelope"></i> ${esc(o.email || '—')}</span>
        <span class="muted"><i class="fas fa-location-dot"></i> ${esc(o.address || '—')} ${esc(o.city ? ', ' + o.city : '')}</span>
        <span class="muted"><i class="fas fa-coins"></i> <strong>${fmtDT(o.total)}</strong></span>
      </div>
      <div class="muted">
        ${o.items.map(it => `<span class="qty-tag">${it.qty} &times; ${esc(it.product_name)} (${fmtDT(it.price)})</span>`).join('')}
      </div>
      <div class="actions">
        <select class="status-select" data-id="${o.id}">
          ${['pending', 'paid', 'delivered', 'cancelled'].map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <button class="btn-ghost2 del-order" data-id="${o.id}"><i class="fas fa-trash"></i> Supprimer</button>
      </div>
    </div>`).join('') : '<p class="empty">Aucune commande ici</p>';

  $$('#orders-list .status-select').forEach(sel => sel.addEventListener('change', async () => {
    try {
      await api(`/api/admin/orders/${sel.dataset.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: sel.value }) });
      const o = ALL_ORDERS.find(x => x.id == sel.dataset.id);
      if (o) o.status = sel.value;
      toast('Statut mis à jour');
      loadAll();
    } catch (err) { toast(err.message, false); }
  }));
  $$('#orders-list .del-order').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Supprimer définitivement cette commande ?')) return;
    try {
      await api(`/api/admin/orders/${btn.dataset.id}`, { method: 'DELETE' });
      toast('Commande supprimée');
      loadAll();
    } catch (err) { toast(err.message, false); }
  }));
}

$$('#order-filters .f-btn').forEach(btn => btn.addEventListener('click', () => {
  $$('#order-filters .f-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ORDER_FILTER = btn.dataset.status;
  paintOrders();
}));

/* ==================== PRODUCTS ==================== */
function renderProducts(products) {
  PRODUCTS = products;
  $('#products-list').innerHTML = products.length ? products.map(p => `
    <div class="prod-card">
      ${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}">` : '<div style="height:150px" class="muted"></div>'}
      ${p.badge ? `<span class="badge paid" style="margin:10px 0 0 10px; display:inline-block">${esc(p.badge)}</span>` : ''}
      <div class="prod-body">
        <h4>${esc(p.name)}</h4>
        <span class="muted">${fmtDT(p.price)} &bull; ${esc(p.category)}</span>
        <div class="prod-actions">
          <button class="btn-ghost2 edit-prod" data-id="${p.id}"><i class="fas fa-pen"></i></button>
          <button class="btn-ghost2 del-prod" data-id="${p.id}"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`).join('') : '<p class="empty">Aucun produit</p>';

  $$('#products-list .edit-prod').forEach(b => b.addEventListener('click', () => {
    const p = PRODUCTS.find(x => x.id == b.dataset.id);
    openProductModal(p);
  }));
  $$('#products-list .del-prod').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Supprimer ce produit ?')) return;
    try {
      await api(`/api/admin/products/${b.dataset.id}`, { method: 'DELETE' });
      toast('Produit supprimé');
      loadAll();
    } catch (err) { toast(err.message, false); }
  }));
}

/* ---------- Product modal ---------- */
let EDITING_ID = null;
const modal = $('#product-modal');
  const showModal = () => { modal.removeAttribute('hidden'); modal.style.display = 'flex'; };
  const hideModal = () => { modal.hidden = true; modal.style.display = 'none'; };
  function openProductModal(p) {
    EDITING_ID = p ? p.id : null;
    $('#modal-title').textContent = p ? 'Modifier le produit' : 'Nouveau produit';
    $('#p-id').value = p ? p.id : '';
    $('#p-name').value = p ? p.name : '';
    $('#p-price').value = p ? p.price : '';
    $('#p-category').value = p ? p.category : 'supplements';
    $('#p-badge').value = p ? p.badge : '';
    $('#p-description').value = p ? p.description : '';
    $('#p-image').value = '';
    const preview = $('#p-preview');
    if (p && p.image) { preview.src = p.image; preview.hidden = false; } else preview.hidden = true;
    showModal();
    EDIT_KEEP_IMAGE = p ? p.image : '';
  }
  let EDIT_KEEP_IMAGE = '';
  $('#add-product-btn').addEventListener('click', () => openProductModal(null));
  $('#modal-close').addEventListener('click', hideModal);
  modal.addEventListener('click', e => { if (e.target === modal) hideModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideModal(); });
$('#p-image').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => { $('#p-preview').src = r.result; $('#p-preview').hidden = false; };
  r.readAsDataURL(f);
});

$('#product-form').addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData();
  fd.append('name', $('#p-name').value.trim());
  fd.append('price', $('#p-price').value);
  fd.append('category', $('#p-category').value);
  fd.append('badge', $('#p-badge').value.trim());
  fd.append('description', $('#p-description').value.trim());
  if (EDIT_KEEP_IMAGE) fd.append('keep_image', '1');
  const file = $('#p-image').files[0];
  if (file) fd.append('image', file);
  try {
    const url = EDITING_ID ? `/api/admin/products/${EDITING_ID}` : '/api/admin/products';
    const res = await fetch(`${API_BASE}${url}`, {
      method: EDITING_ID ? 'PUT' : 'POST',
      headers: setAuthHeaders({}),
      body: fd
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Erreur');
    toast(EDITING_ID ? 'Produit modifié' : 'Produit ajouté');
    hideModal();
    loadAll();
  } catch (err) { toast(err.message, false); }
});

/* ==================== CONTACTS ==================== */
function renderContacts(contacts) {
  const list = $('#contacts-list');
  if (!contacts.length) { list.innerHTML = '<p class="empty">Aucun message reçu</p>'; return; }
  list.innerHTML = contacts.map(c => `
    <div class="card ${c.is_read ? '' : 'unread'}">
      <div class="card-top">
        <div>
          <h4>${esc(c.name)} ${c.is_read ? '' : '<span class="badge pending">Non lu</span>'}</h4>
          <span class="muted">${fmtDate(c.created_at)}</span>
        </div>
        <span class="muted">${esc(c.subject || '—')}</span>
      </div>
      <div class="contact-line muted">
        <span><i class="fas fa-envelope"></i> ${esc(c.email || '—')}</span>
        <span><i class="fas fa-phone"></i> ${esc(c.phone || '—')}</span>
      </div>
      ${c.message ? `<div class="msg-box">${esc(c.message)}</div>` : ''}
      <div class="actions">
        <button class="btn-ghost2 toggle-read" data-id="${c.id}" data-read="${c.is_read}">
          ${c.is_read ? 'Marquer non lu' : 'Marquer lu'}
        </button>
        <button class="btn-ghost2 del-contact" data-id="${c.id}"><i class="fas fa-trash"></i></button>
      </div>
    </div>`).join('');

  $$('#contacts-list .toggle-read').forEach(b => b.addEventListener('click', async () => {
    await api(`/api/admin/contacts/${b.dataset.id}/read`, { method: 'PATCH', body: JSON.stringify({ is_read: b.dataset.read === '0' }) });
    loadAll();
  }));
  $$('#contacts-list .del-contact').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Supprimer ce message ?')) return;
    await api(`/api/admin/contacts/${b.dataset.id}`, { method: 'DELETE' });
    toast('Message supprimé');
    loadAll();
  }));
}

/* ==================== MEMBERS ==================== */
function renderMembers(members) {
  const list = $('#members-list');
  if (!members.length) { list.innerHTML = '<p class="empty">Aucune demande d\'adhésion</p>'; return; }
  list.innerHTML = `<div class="member-grid">` + members.map(m => `
    <div class="card">
      <h4>${esc(m.name)}</h4>
      <div class="muted"><i class="fas fa-phone"></i> ${esc(m.phone)}</div>
      <div class="muted"><i class="fas fa-calendar"></i> ${fmtDate(m.created_at)}</div>
      <div class="actions">
        <span class="badge paid">Plan: ${esc(m.plan)}</span>
        ${m.price ? `<span class="badge pending">${esc(m.price)}</span>` : ''}
      </div>
      <div class="actions">
        <button class="btn-ghost2 del-member" data-id="${m.id}"><i class="fas fa-trash"></i> Supprimer</button>
      </div>
    </div>`).join('') + `</div>`;

  $$('#members-list .del-member').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Supprimer cette adhésion ?')) return;
    await api(`/api/admin/members/${b.dataset.id}`, { method: 'DELETE' });
    toast('Adhésion supprimée');
    loadAll();
  }));
}

$('#refresh-contacts').addEventListener('click', async () => {
  const c = await api('/api/admin/contacts');
  renderContacts(c.contacts);
  toast('Messages actualisés');
});
$('#refresh-members').addEventListener('click', async () => {
  const m = await api('/api/admin/members');
  renderMembers(m.members);
  toast('Adhésions actualisées');
});

checkAuth();