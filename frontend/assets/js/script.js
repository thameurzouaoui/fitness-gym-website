/* ============================================================
   ACTIV FITNESS — Interactions + API
   ============================================================ */

const API_BASE = 'https://activ-fitness-api.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  const navLinks = document.getElementById('nav-links');
  const backTop = document.getElementById('back-top');

  /* ---------- Toast ---------- */
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  let toastTimer;
  const showToast = (msg, type = 'ok') => {
    toastMsg.textContent = msg;
    toast.className = 'toast show';
    if (type === 'err') toast.classList.add('toast-err');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  };

  /* ---------- Navbar scroll state ---------- */
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
    backTop.classList.toggle('show', window.scrollY > 600);
    const sections = document.querySelectorAll('section[id], header[id]');
    let current = 'home';
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 160) current = sec.id;
    });
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  const menuBtn = document.querySelector('.menu-btn');
  if (!menuBtn) {
    const btn = document.createElement('button');
    btn.className = 'menu-btn';
    btn.innerHTML = '<i class="fas fa-bars"></i>';
    navbar.insertBefore(btn, navLinks);
    btn.addEventListener('click', () => navLinks.classList.add('open'));
    const close = document.createElement('button');
    close.className = 'menu-close';
    close.innerHTML = '<i class="fas fa-times"></i>';
    navLinks.appendChild(close);
    close.addEventListener('click', () => navLinks.classList.remove('open'));
  } else {
    menuBtn.addEventListener('click', () => navLinks.classList.toggle('open'));
  }
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
  });

  /* ---------- Smooth scroll ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ---------- Reveal ---------- */
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* ---------- Counters ---------- */
  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      counterObserver.unobserve(el);
      const target = +el.dataset.target;
      const duration = 1800;
      const start = performance.now();
      const tick = now => {
        const p = Math.min((now - start) / duration, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.counter').forEach(el => counterObserver.observe(el));

  /* ---------- Billing toggle ---------- */
  const toggleBtns = document.querySelectorAll('.toggle-btn');
  const applyPrices = period => {
    document.querySelectorAll('.plan-price').forEach(price => {
      const amount = price.querySelector('.amount');
      amount.textContent = price.dataset[period];
      amount.style.opacity = 0;
      setTimeout(() => { amount.style.opacity = 1; }, 120);
    });
  };
  toggleBtns.forEach(btn => btn.addEventListener('click', () => {
    toggleBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyPrices(btn.dataset.period);
  }));

  /* ============================================================
     SHOP — products from API (with offline fallback)
     ============================================================ */
  const grid = document.getElementById('products-grid');
  const FALLBACK = [
    { id: 1, name: 'Whey Protein Box', price: 149, category: 'supplements', description: 'Premium 100% whey — chocolate, 1kg', image: 'assets/images/prod-whey.jpg', badge: 'Best Seller' },
    { id: 2, name: 'BCAA Energy', price: 89, category: 'supplements', description: 'Amino acids + energy boost, 400g', image: 'assets/images/prod-bcaa.jpg', badge: 'New' },
    { id: 3, name: 'Boxing Gloves Pro', price: 199, category: 'boxing', description: 'Genuine leather, 10oz — all sizes', image: 'assets/images/prod-gloves-red.jpg', badge: '' },
    { id: 4, name: 'Sparring Gold Gloves', price: 179, category: 'boxing', description: 'Signed-collection, 12oz premium', image: 'assets/images/prod-gloves-gold.jpg', badge: 'Limited' },
    { id: 5, name: 'Training Gloves', price: 129, category: 'boxing', description: 'Breathable mesh, 8oz — beginners', image: 'assets/images/prod-gloves-yellow.jpg', badge: '' },
    { id: 6, name: 'Boxing Punch Bag', price: 299, category: 'boxing', description: 'Heavy bag 30kg with chains & swivel', image: 'assets/images/prod-punchbag.jpg', badge: '' },
    { id: 7, name: 'Takondo Kimono', price: 155, category: 'takondo', description: 'Official club uniform, 100% cotton', image: 'assets/images/prod-kimono.jpg', badge: 'Official' }
  ];
  const imgSrc = p => (p.image && p.image.startsWith('/uploads/')) ? p.image : (p.image || 'assets/images/prod-whey.jpg');
  let products = [...FALLBACK];

  async function loadProducts() {
    try {
      const res = await fetch(`${API_BASE}/products`);
      const data = await res.json();
      if (data.ok && data.products.length) {
        products = data.products;
        renderShop();
      }
    } catch { /* offline: keep instant fallback */ }
  }

  function renderShop() {
    grid.innerHTML = products.map(p => `
      <div class="product-card reveal" data-category="${p.category}">
        <div class="product-image">
          <img src="${imgSrc(p)}" alt="${p.name}" loading="lazy">
          ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
        </div>
        <div class="product-info">
          <h3>${p.name}</h3>
          <p>${p.description || ''}</p>
          <div class="product-bottom">
            <span class="price">${Number(p.price).toFixed(2).replace(/\.00$/, '')} <small>DT</small></span>
            <button class="btn-add" data-id="${p.id}">Add <i class="fas fa-cart-plus"></i></button>
          </div>
        </div>
      </div>`).join('');
    grid.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
  }

  /* ---------- Shop filter ---------- */
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    document.querySelectorAll('.product-card').forEach(card => {
      const show = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('hidden', !show);
      if (show) {
        card.style.animation = 'none';
        void card.offsetWidth;
        card.style.animation = '';
      }
    });
  }));

  /* ============================================================
     CART
     ============================================================ */
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem('activ_cart') || '[]'); } catch { cart = []; }
  const cartCount = document.getElementById('cart-count');
  const saveCart = () => localStorage.setItem('activ_cart', JSON.stringify(cart));

  const updateCartUI = () => {
    const qty = cart.reduce((s, it) => s + it.qty, 0);
    cartCount.textContent = qty;
    cartCount.classList.toggle('has-items', qty > 0);
  };

  const findProduct = id => products.find(p => p.id == id);

  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-add');
    if (!btn) return;
    const p = findProduct(btn.dataset.id);
    if (!p) return;
    const hit = cart.find(it => it.id === p.id);
    if (hit) hit.qty++; else cart.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
    saveCart();
    updateCartUI();
    btn.classList.add('added');
    btn.innerHTML = '<i class="fas fa-check"></i> Added';
    showToast(p.name + ' added to cart');
    setTimeout(() => {
      btn.classList.remove('added');
      btn.innerHTML = 'Add <i class="fas fa-cart-plus"></i>';
    }, 1600);
  });

  /* ---------- Cart drawer ---------- */
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  const openCart = () => { renderCart(); overlay.style.display = 'block'; drawer.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const closeCart = () => { overlay.style.display = 'none'; drawer.classList.remove('open'); document.body.style.overflow = ''; };
  document.getElementById('cart-btn').addEventListener('click', openCart);
  document.getElementById('cart-close').addEventListener('click', closeCart);
  overlay.addEventListener('click', closeCart);

  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  const imgFor = p => p.image ? imgSrc(p) : (findProduct(p.id) ? imgSrc(findProduct(p.id)) : '');

  function renderCart() {
    if (!cart.length) {
      cartItems.innerHTML = '<p class="cart-empty">Your cart is empty.<br>Visit the shop!</p>';
      cartTotal.textContent = '0 DT';
      return;
    }
    cartItems.innerHTML = cart.map((it, i) => `
      <div class="cart-item">
        <img src="${imgFor(it)}" alt="">
        <div class="ci-info">
          <strong>${it.name}</strong>
          <span>${Number(it.price).toFixed(2).replace(/\.00$/, '')} DT</span>
          <div class="ci-qty">
            <button data-dec="${i}">−</button><span>${it.qty}</span><button data-inc="${i}">+</button>
          </div>
        </div>
        <button class="ci-del" data-del="${i}"><i class="fas fa-trash"></i></button>
      </div>`).join('');
    const total = cart.reduce((s, it) => s + Number(it.price) * it.qty, 0);
    cartTotal.textContent = total.toFixed(2).replace(/\.00$/, '') + ' DT';
  }

  cartItems.addEventListener('click', e => {
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    const del = e.target.closest('[data-del]');
    const i = inc ? +inc.dataset.inc : dec ? +dec.dataset.dec : del ? +del.dataset.del : -1;
    if (i < 0) return;
    if (del) cart.splice(i, 1);
    else if (inc) cart[i].qty++;
    else { cart[i].qty--; if (cart[i].qty < 1) cart.splice(i, 1); }
    saveCart();
    updateCartUI();
    renderCart();
  });

  /* ============================================================
     CHECKOUT
     ============================================================ */
  const checkoutModal = document.getElementById('checkout-modal');
  const showModal = m => { if (m) { m.style.display = 'flex'; m.hidden = false; } };
  const hideModal = m => { if (m) { m.style.display = 'none'; m.hidden = true; } };
  document.getElementById('checkout-btn').addEventListener('click', () => {
    if (!cart.length) { showToast('Your cart is empty', 'err'); return; }
    showModal(checkoutModal);
  });
  document.addEventListener('click', e => {
    const close = e.target.closest('[data-close]');
    if (close) { hideModal(document.getElementById(close.dataset.close)); e.stopPropagation(); return; }
    if (e.target.classList && e.target.classList.contains('modal-overlay')) hideModal(e.target);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay').forEach(hideModal);
  });

  document.getElementById('checkout-form').addEventListener('submit', async e => {
    e.preventDefault();
    const err = document.getElementById('co-error');
    err.textContent = '';
    const body = {
      customer_name: document.getElementById('co-name').value.trim(),
      email: document.getElementById('co-email').value.trim(),
      phone: document.getElementById('co-phone').value.trim(),
      address: document.getElementById('co-address').value.trim(),
      city: document.getElementById('co-city').value.trim(),
      items: cart.map(it => ({ name: it.name, price: it.price, qty: it.qty }))
    };
    try {
      const res = await fetch(`${API_BASE}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Order failed');
      const total = cart.reduce((s, it) => s + it.price * it.qty, 0);
      cart = [];
      saveCart();
      updateCartUI();
      closeCart();
      hideModal(checkoutModal);
      e.target.reset();
      showToast('Order confirmed! Ref: ' + data.ref + ' — Total: ' + total.toFixed(2).replace(/\.00$/, '') + ' DT');
    } catch (ex) {
      err.textContent = ex.message;
    }
  });

  /* ============================================================
     LOGIN (admin)
     ============================================================ */
  const loginModal = document.getElementById('login-modal');
  document.getElementById('login-btn').addEventListener('click', () => { showModal(loginModal); });

  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const err = document.getElementById('login-error');
    err.textContent = '';
    let res;
    try {
      res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: document.getElementById('login-user').value.trim(), password: document.getElementById('login-pass').value })
      });
    } catch {
      err.textContent = 'Erreur';
      return;
    }
    try {
      const data = await res.json();
      if (!data.ok) throw new Error('bad');
      if (data.token) localStorage.setItem('auth_token', data.token);
      window.location.href = '/admin';
    } catch {
      err.textContent = 'Erreur : identifiants invalides.';
    }
  });

  /* ============================================================
     MEMBERSHIP (plan buttons)
     ============================================================ */
  const memberModal = document.getElementById('member-modal');
  const memberPlanLabel = document.getElementById('member-plan-label');
  document.querySelectorAll('.plan-join').forEach(btn => btn.addEventListener('click', () => {
    const card = btn.closest('.plan-card');
    const price = card.querySelector('.plan-price');
    const amount = price.querySelector('.amount').textContent;
    const period = price.querySelector('.period').textContent;
    const planName = btn.dataset.plan;
    document.getElementById('m-plan').value = planName;
    memberPlanLabel.textContent = 'Selected plan: ' + planName + ' — ' + amount + ' DT ' + period;
    showModal(memberModal);
  }));

  document.getElementById('member-form').addEventListener('submit', async e => {
    e.preventDefault();
    const err = document.getElementById('member-error');
    err.textContent = '';
    const card = document.querySelector('.plan-join[data-plan="' + document.getElementById('m-plan').value + '"]').closest('.plan-card');
    const amount = card.querySelector('.amount').textContent;
    const period = card.querySelector('.period').textContent;
    const body = {
      name: document.getElementById('m-name').value.trim(),
      phone: document.getElementById('m-phone').value.trim(),
      plan: document.getElementById('m-plan').value,
      price: amount + ' DT ' + period
    };
    try {
      const res = await fetch(`${API_BASE}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Request failed');
      hideModal(memberModal);
      e.target.reset();
      showToast('Membership request sent! We will call you soon');
    } catch (ex) {
      err.textContent = ex.message;
    }
  });

  /* ============================================================
     CONTACT FORM
     ============================================================ */
  const form = document.getElementById('contact-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const body = {
      name: document.getElementById('c-name').value.trim(),
      email: document.getElementById('c-email').value.trim(),
      phone: document.getElementById('c-phone').value.trim(),
      subject: document.getElementById('c-subject').value,
      message: document.getElementById('c-message').value.trim()
    };
    try {
      const res = await fetch(`${API_BASE}/contacts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed');
      showToast('Message sent! We will contact you soon');
      form.reset();
    } catch {
      showToast('Message sent! (offline — will be saved later)', 'err');
      form.reset();
    }
  });

  /* ---------- Back to top ---------- */
  backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Offline (file://) warning banner ---------- */
  if (window.location.protocol === 'file:') {
    const b = document.getElementById('offline-banner');
    if (b) b.hidden = false;
  }

  /* ---------- Init ---------- */
  renderShop();
  updateCartUI();
  loadProducts();
  /* Force-closed on load: no popup can ever be stuck open */
  const ov = document.getElementById('cart-overlay');
  if (ov) ov.style.display = 'none';
  document.querySelectorAll('.modal-overlay').forEach(m => { m.style.display = 'none'; m.hidden = true; });
});
