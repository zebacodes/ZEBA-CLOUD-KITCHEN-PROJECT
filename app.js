/* ============================================================
   CloudEats — Application Layer (SPA router + state + views)
   In a real product this file's responsibilities would split into:
     - services/*.ts   (API calls, replacing the localStorage reads/writes)
     - store/*.ts       (Zustand slices, replacing the `state` object)
     - app routes (page.tsx per folder) replacing the render* functions below
   See README.md for the suggested migration path.
   ============================================================ */

/* ---------------- Utilities ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const app = () => $('#app');
function icons() { if (window.lucide) lucide.createIcons(); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---------------- Persistent state ---------------- */
const LS = {
  theme: 'ce_theme', user: 'ce_user', users: 'ce_users', cart: 'ce_cart',
  addresses: 'ce_addresses', orders: 'ce_orders', payment: 'ce_last_payment',
};
function load(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } }
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

const state = {
  theme: load(LS.theme, 'light'),
  user: load(LS.user, null),
  users: load(LS.users, [{ name: 'Demo User', email: 'demo@cloudeats.in', phone: '9800000000', password: 'password123' }]),
  cart: load(LS.cart, []), // {kitchenId, itemId, variant, qty, priceEach}
  addresses: load(LS.addresses, []),
  orders: load(LS.orders, []),
  coupon: null,
  tip: 0,
  selectedAddressId: null,
  deliveryTime: 'asap',
  paymentMethod: load(LS.payment, 'upi'),
};
function persistUsers() { save(LS.users, state.users); }
function persistUser() { save(LS.user, state.user); }
function persistCart() { save(LS.cart, state.cart); }
function persistAddresses() { save(LS.addresses, state.addresses); }
function persistOrders() { save(LS.orders, state.orders); }

/* ---------------- Auth ---------------- */
function isLoggedIn() { return !!state.user; }
function requireAuth(routeHash) {
  if (isLoggedIn()) return true;
  sessionStorage.setItem('ce_pending_route', routeHash);
  navigate('#/login');
  return false;
}
function afterAuthRedirect() {
  const pending = sessionStorage.getItem('ce_pending_route');
  sessionStorage.removeItem('ce_pending_route');
  navigate(pending || '#/');
}
function logout() {
  state.user = null; persistUser();
  toast('Logged out. See you soon 👋', 'log-out');
  navigate('#/');
}

/* ---------------- Toast ---------------- */
function toast(msg, icon = 'check-circle') {
  let wrap = $('#toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toast-wrap'; wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<i data-lucide="${icon}" style="width:18px;height:18px;flex-shrink:0"></i><span>${escapeHtml(msg)}</span>`;
  wrap.appendChild(el);
  icons();
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; el.style.transition = '.25s'; setTimeout(() => el.remove(), 250); }, 2600);
}

/* ---------------- Overlay / Sheet / Modal ---------------- */
function ensureOverlay() {
  let ov = $('#overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'overlay'; ov.className = 'overlay';
    ov.innerHTML = `<div id="sheet-root"></div><div id="modal-root"></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', (e) => { if (e.target === ov) closeOverlay(); });
  }
  return ov;
}
function openSheet(html) {
  const ov = ensureOverlay();
  $('#modal-root').innerHTML = '';
  $('#sheet-root').innerHTML = `<div class="sheet" id="active-sheet">${html}</div>`;
  requestAnimationFrame(() => { ov.classList.add('open'); $('#active-sheet').classList.add('open'); });
  icons();
}
function openModal(html) {
  const ov = ensureOverlay();
  $('#sheet-root').innerHTML = '';
  $('#modal-root').innerHTML = `<div class="modal-center"><div class="modal-box">${html}</div></div>`;
  requestAnimationFrame(() => ov.classList.add('open'));
  icons();
}
function closeOverlay() {
  const ov = $('#overlay'); if (!ov) return;
  ov.classList.remove('open');
  const sheet = $('#active-sheet'); if (sheet) sheet.classList.remove('open');
  setTimeout(() => { if ($('#sheet-root')) $('#sheet-root').innerHTML = ''; if ($('#modal-root')) $('#modal-root').innerHTML = ''; }, 260);
}

/* ---------------- Cart logic ----------------
   Design decision: single-kitchen-per-order (like most food delivery apps —
   one kitchen == one physical prep queue == one delivery trip). Adding an
   item from a different kitchen prompts to clear & restart the cart. */
function cartKitchenId() { return state.cart.length ? state.cart[0].kitchenId : null; }
function cartCount() { return state.cart.reduce((s, l) => s + l.qty, 0); }
function cartSubtotal() { return state.cart.reduce((s, l) => s + l.qty * l.priceEach, 0); }
function lineKey(kitchenId, itemId, variant) { return `${kitchenId}::${itemId}::${variant || ''}`; }
function findLine(kitchenId, itemId, variant) { return state.cart.find((l) => lineKey(l.kitchenId, l.itemId, l.variant) === lineKey(kitchenId, itemId, variant)); }

function addToCart(kitchenId, itemId, variant, qty = 1) {
  const existingKitchen = cartKitchenId();
  if (existingKitchen && existingKitchen !== kitchenId) {
    const newK = getKitchenById(kitchenId);
    openModal(`
      <h3 style="margin-top:0">Start a new cart?</h3>
      <p class="muted">Your cart has items from <b>${escapeHtml(getKitchenById(existingKitchen)?.name || 'another kitchen')}</b>. CloudEats orders come from one kitchen at a time so everything arrives together. Replace your cart with items from <b>${escapeHtml(newK.name)}</b>?</p>
      <div class="flex gap-12" style="margin-top:20px">
        <button class="btn btn-outline btn-block" data-action="close-modal">Keep current cart</button>
        <button class="btn btn-primary btn-block" data-action="clear-and-add" data-kitchen="${kitchenId}" data-item="${itemId}" data-variant="${variant || ''}">Start new cart</button>
      </div>`);
    return false; // did not add — a confirm modal is now showing, caller must not re-render
  }
  const item = getMenuItem(kitchenId, itemId);
  const line = findLine(kitchenId, itemId, variant);
  if (line) line.qty += qty;
  else state.cart.push({ kitchenId, itemId, variant: variant || null, qty, priceEach: item.priceINR });
  persistCart();
  toast(`Added ${item.name} to cart`, 'shopping-cart');
  renderCartBadge();
  return true;
}
function updateCartQty(kitchenId, itemId, variant, delta) {
  const line = findLine(kitchenId, itemId, variant);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) state.cart = state.cart.filter((l) => l !== line);
  persistCart(); renderCartBadge();
}
function removeCartLine(kitchenId, itemId, variant) {
  state.cart = state.cart.filter((l) => lineKey(l.kitchenId, l.itemId, l.variant) !== lineKey(kitchenId, itemId, variant));
  persistCart(); renderCartBadge();
}
function renderCartBadge() {
  const badge = $('#cart-count-badge');
  const count = cartCount();
  if (badge) { badge.textContent = count; badge.style.display = count ? 'flex' : 'none'; }
}

/* ---------------- Bill computation ---------------- */
function computeBill() {
  const subtotal = cartSubtotal();
  const deliveryFee = subtotal === 0 ? 0 : (subtotal >= 499 ? 0 : 40);
  const packaging = subtotal === 0 ? 0 : 15;
  let discount = 0;
  if (state.coupon) {
    const c = state.coupon;
    if (subtotal >= c.minOrder) {
      discount = c.type === 'flat' ? c.value : Math.min(Math.round(subtotal * c.value / 100), c.cap || Infinity);
    }
  }
  const gst = Math.round((subtotal - discount) * 0.05 * 100) / 100;
  const tip = state.tip || 0;
  const grandTotal = Math.max(0, subtotal - discount) + deliveryFee + packaging + gst + tip;
  return { subtotal, deliveryFee, packaging, discount, gst, tip, grandTotal };
}

/* ---------------- Router ---------------- */
function navigate(hash) { if (location.hash === hash) { render(); } else { location.hash = hash; } }
function parseRoute() {
  const raw = location.hash.slice(1) || '/';
  const [pathPart, queryPart] = raw.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(queryPart || ''));
  return { parts, query, path: pathPart };
}

function render() {
  closeOverlay();
  const { parts, query } = parseRoute();
  let html = '';
  const p0 = parts[0];

  if (!p0) html = renderHome();
  else if (p0 === 'kitchens') html = renderKitchensListing(query);
  else if (p0 === 'kitchen' && parts[1]) html = renderStorefront(parts[1]);
  else if (p0 === 'cart') html = renderCart();
  else if (p0 === 'checkout') { if (!requireAuth('#/checkout')) return; html = renderCheckout(); }
  else if (p0 === 'order-success' && parts[1]) html = renderOrderSuccess(parts[1]);
  else if (p0 === 'orders') { if (!requireAuth('#/orders')) return; html = renderOrders(); }
  else if (p0 === 'profile') { if (!requireAuth('#/profile')) return; html = renderProfile(); }
  else if (p0 === 'login') html = renderLogin();
  else if (p0 === 'signup') html = renderSignup();
  else if (p0 === 'otp-verify') html = renderOtp();
  else if (p0 === 'search') html = renderSearch(query.q || '');
  else html = renderNotFound();

  app().innerHTML = `<div class="page-enter">${html}</div>`;
  document.body.setAttribute('data-theme', state.theme);
  renderNavShell();
  renderCartBadge();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  icons();
  afterRenderHook();
}
window.addEventListener('hashchange', render);

/* ---------------- Nav shell (persistent header/footer) ---------------- */
function renderNavShell() {
  $('#nav-root').innerHTML = renderNav();
  $('#footer-root').innerHTML = renderFooter();
  icons();
}

function renderNav() {
  const user = state.user;
  return `
  <nav class="nav" role="navigation" aria-label="Main">
    <div class="container nav-inner">
      <a href="#/" class="logo" aria-label="CloudEats home">
        <span class="logo-mark">☁️</span> CloudEats
      </a>
      <div class="nav-location" data-action="noop" title="Delivery location">
        <i data-lucide="map-pin" style="width:15px;height:15px"></i><span>Kolkata, WB</span>
        <i data-lucide="chevron-down" style="width:13px;height:13px"></i>
      </div>
      <form class="nav-search" data-action-submit="nav-search" role="search">
        <i data-lucide="search" style="width:16px;height:16px;color:var(--text-soft)"></i>
        <input type="search" name="q" placeholder="Search kitchens or dishes" aria-label="Search kitchens or dishes"/>
      </form>
      <div class="nav-actions">
        <button class="theme-toggle" data-action="toggle-theme" aria-label="Toggle dark mode">
          <i data-lucide="${state.theme === 'dark' ? 'sun' : 'moon'}" style="width:17px;height:17px"></i>
        </button>
        <a href="#/cart" class="btn-icon cart-btn" aria-label="View cart">
          <i data-lucide="shopping-cart" style="width:18px;height:18px"></i>
          <span id="cart-count-badge" class="cart-badge" style="display:${cartCount() ? 'flex' : 'none'}">${cartCount()}</span>
        </a>
        ${user ? `
          <div class="dropdown-wrap">
            <button class="avatar" data-action="toggle-user-menu" aria-haspopup="true" aria-label="Account menu">${escapeHtml((user.name || 'U')[0].toUpperCase())}</button>
            <div class="dropdown" id="user-dropdown">
              <div style="padding:10px 12px 6px"><div style="font-weight:800;font-size:14px">${escapeHtml(user.name)}</div><div class="muted" style="font-size:12px">${escapeHtml(user.email)}</div></div>
              <hr/>
              <a href="#/orders"><i data-lucide="receipt" style="width:16px;height:16px"></i>Orders</a>
              <a href="#/profile"><i data-lucide="map-pin" style="width:16px;height:16px"></i>Addresses</a>
              <a href="#/profile"><i data-lucide="wallet" style="width:16px;height:16px"></i>Wallet</a>
              <hr/>
              <button data-action="logout"><i data-lucide="log-out" style="width:16px;height:16px"></i>Logout</button>
            </div>
          </div>` : `<a href="#/login" class="btn btn-primary btn-sm">Login</a>`}
      </div>
    </div>
    <div class="container nav-mobile-search">
      <form class="nav-search" data-action-submit="nav-search" role="search" style="max-width:none">
        <i data-lucide="search" style="width:16px;height:16px;color:var(--text-soft)"></i>
        <input type="search" name="q" placeholder="Search kitchens or dishes" aria-label="Search kitchens or dishes"/>
      </form>
    </div>
  </nav>`;
}

function renderFooter() {
  return `
  <footer class="footer">
    <div class="container">
      <div>
        <div class="logo" style="color:#fff;margin-bottom:14px"><span class="logo-mark">☁️</span> CloudEats</div>
        <p class="muted" style="max-width:280px;font-size:13.5px;line-height:1.6">One delivery fleet, seven distinct kitchens, endless cravings covered. Order from every brand under one roof — literally.</p>
        <div class="app-cta">
          <div class="app-badge"><i data-lucide="apple" style="width:16px;height:16px"></i> App Store</div>
          <div class="app-badge"><i data-lucide="play" style="width:16px;height:16px"></i> Google Play</div>
        </div>
      </div>
      <div><h4>Company</h4><a href="#/">About us</a><a href="#/">Careers</a><a href="#/">Press</a><a href="#/">Partner with us</a></div>
      <div><h4>For you</h4><a href="#/kitchens">All kitchens</a><a href="#/orders">Your orders</a><a href="#/profile">Your account</a><a href="#/">Help centre</a></div>
      <div><h4>Legal</h4><a href="#/">Terms of use</a><a href="#/">Privacy policy</a><a href="#/">Refund policy</a><a href="#/">FSSAI compliance</a></div>
    </div>
    <div class="container footer-bottom">
      <span>© 2026 CloudEats Technologies Pvt. Ltd. All rights reserved.</span>
      <div class="social-row">
        <a href="#/" aria-label="Instagram"><i data-lucide="instagram" style="width:16px;height:16px"></i></a>
        <a href="#/" aria-label="Twitter"><i data-lucide="twitter" style="width:16px;height:16px"></i></a>
        <a href="#/" aria-label="Facebook"><i data-lucide="facebook" style="width:16px;height:16px"></i></a>
      </div>
    </div>
  </footer>`;
}

/* ================================================================
   PAGE: HOME
   ================================================================ */
function renderHome() {
  const brandNodes = KITCHENS.slice(0, 6).map((k, i) => {
    const angle = (i / 6) * Math.PI - Math.PI * 1.5;
    const rx = 150, ry = 130;
    const x = 50 + Math.cos(angle) * (rx / 3.8);
    const y = 62 + Math.sin(angle) * (ry / 6.2) - 40;
    return `<div class="brand-node" style="--node-color:${k.accent}; left:${x}%; top:${y}%; animation-delay:${i * 0.3}s" title="${escapeHtml(k.name)}">${k.emoji}</div>`;
  }).join('');

  return `
  <section class="hero">
    <div class="container hero-grid">
      <div>
        <span class="hero-eyebrow"><i data-lucide="sparkles" style="width:14px;height:14px"></i> 7 brands, 1 kitchen, 0 compromises</span>
        <h1>One address.<br/>Every <em>craving</em>,<br/>covered.</h1>
        <p class="lead">CloudEats runs seven distinct virtual restaurants out of a single cloud kitchen — biryani, pizza, sushi, tacos, and more — all delivered by one trusted fleet.</p>
        <div class="hero-cta">
          <a href="#/kitchens" class="btn btn-primary btn-lg">Explore kitchens <i data-lucide="arrow-right" style="width:17px;height:17px"></i></a>
          <a href="#/kitchen/bombay-biryani-house" class="btn btn-outline btn-lg">Today's bestseller 🍛</a>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><b>7</b><span>Cloud kitchen brands</span></div>
          <div class="hero-stat"><b>28 min</b><span>Avg. delivery time</span></div>
          <div class="hero-stat"><b>4.5★</b><span>Avg. rating</span></div>
        </div>
      </div>
      <div class="kitchen-diagram" aria-hidden="true">
        <div class="steam"></div><div class="steam"></div><div class="steam"></div>
        ${brandNodes}
        <div class="diagram-hub">🏭</div>
        <div class="diagram-hub-label">Shared cloud kitchen · Kolkata</div>
      </div>
    </div>
  </section>

  <section class="section container">
    <div class="section-head"><div><h2>Explore cuisines</h2><p>Pick a craving, we'll route it to the right brand</p></div></div>
    <div class="chip-row">
      ${CUISINE_CHIPS.map((c) => `<a href="#/kitchens?cuisine=${encodeURIComponent(c.name)}" class="cuisine-chip"><span class="em">${c.emoji}</span><span>${c.name}</span></a>`).join('')}
    </div>
  </section>

  <section class="section container">
    <div class="section-head">
      <div><h2>Cloud kitchens near you</h2><p>All from one address — different flavours, same fast delivery</p></div>
      <a href="#/kitchens" class="see-all">See all <i data-lucide="arrow-right" style="width:14px;height:14px"></i></a>
    </div>
    <div class="kitchen-grid">${KITCHENS.map(kitchenCard).join('')}</div>
  </section>

  <section class="section container">
    <div class="section-head"><div><h2>Trending now</h2><p>What Kolkata is ordering this week</p></div></div>
    <div class="kitchen-grid">${[...KITCHENS].reverse().slice(0, 3).map(kitchenCard).join('')}</div>
  </section>

  <section class="section container">
    <div class="section-head center" style="width:100%;justify-content:center;text-align:center;flex-direction:column">
      <h2>Loved across Kolkata</h2><p>Real words from real regulars</p>
    </div>
    <div class="testimonial-row">
      ${TESTIMONIALS.map((t) => `
        <div class="testimonial-card">
          <div class="testimonial-stars">${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}</div>
          <p class="testimonial-quote">"${escapeHtml(t.quote)}"</p>
          <div class="testimonial-name">${escapeHtml(t.name)}</div>
          <div class="testimonial-city">${escapeHtml(t.city)}</div>
        </div>`).join('')}
    </div>
  </section>`;
}

function kitchenCard(k) {
  return `
  <a href="#/kitchen/${k.slug}" class="kitchen-card">
    <div class="kitchen-cover" style="--kc:${k.accent}">
      <span class="kitchen-badge">${k.deliveryTimeMins} min</span>
      ${k.emoji}
      <span class="kitchen-offer">${escapeHtml(k.offer)}</span>
    </div>
    <div class="kitchen-body">
      <h3 class="kitchen-name">${escapeHtml(k.name)}</h3>
      <p class="kitchen-tags">${k.cuisines.join(' · ')}</p>
      <div class="kitchen-meta">
        <span class="rating-pill"><i data-lucide="star" style="width:11px;height:11px;fill:#fff"></i> ${k.rating}</span>
        <span class="muted">${k.ratingCount.toLocaleString('en-IN')}+ ratings</span>
        <span class="veg-dot ${k.isVeg ? '' : 'nonveg'}"></span>
        <span class="muted">₹${k.priceForTwo} for two</span>
      </div>
    </div>
  </a>`;
}

/* ================================================================
   PAGE: KITCHENS LISTING
   ================================================================ */
const listingState = { cuisine: null, minRating: 0, maxPrice: 1000, maxTime: 60, vegOnly: false, sort: 'rating' };
function renderKitchensListing(query) {
  if (query.cuisine && listingState.cuisine === null) listingState.cuisine = query.cuisine;
  let list = KITCHENS.filter((k) => {
    if (listingState.cuisine && !k.cuisines.includes(listingState.cuisine)) return false;
    if (k.rating < listingState.minRating) return false;
    if (k.priceForTwo > listingState.maxPrice) return false;
    if (k.deliveryTimeMins > listingState.maxTime) return false;
    if (listingState.vegOnly && !k.isVeg) return false;
    return true;
  });
  if (listingState.sort === 'rating') list.sort((a, b) => b.rating - a.rating);
  if (listingState.sort === 'time') list.sort((a, b) => a.deliveryTimeMins - b.deliveryTimeMins);
  if (listingState.sort === 'price-low') list.sort((a, b) => a.priceForTwo - b.priceForTwo);
  if (listingState.sort === 'price-high') list.sort((a, b) => b.priceForTwo - a.priceForTwo);

  const allCuisines = [...new Set(KITCHENS.flatMap((k) => k.cuisines))];

  return `
  <div class="container" style="padding-top:26px;padding-bottom:60px">
    <h1 style="font-size:26px;margin:0 0 20px">All cloud kitchens</h1>
    <div class="listing-layout">
      <aside class="filter-panel">
        <div class="filter-group">
          <div class="filter-title">Cuisine</div>
          ${allCuisines.map((c) => `
            <label class="filter-option">
              <input type="radio" name="cuisine" data-action="filter-cuisine" value="${c}" ${listingState.cuisine === c ? 'checked' : ''}/> ${c}
            </label>`).join('')}
          <label class="filter-option"><input type="radio" name="cuisine" data-action="filter-cuisine" value="" ${!listingState.cuisine ? 'checked' : ''}/> All cuisines</label>
        </div>
        <div class="filter-group">
          <div class="filter-title">Minimum rating</div>
          <input type="range" min="0" max="4.5" step="0.5" value="${listingState.minRating}" data-action="filter-rating" style="width:100%;accent-color:var(--primary)"/>
          <div class="range-row"><span>${listingState.minRating}★+</span><span>4.5★</span></div>
        </div>
        <div class="filter-group">
          <div class="filter-title">Price for two (max)</div>
          <input type="range" min="200" max="1000" step="50" value="${listingState.maxPrice}" data-action="filter-price" style="width:100%;accent-color:var(--primary)"/>
          <div class="range-row"><span>₹200</span><span>₹${listingState.maxPrice}</span></div>
        </div>
        <div class="filter-group">
          <div class="filter-title">Delivery time (max)</div>
          <input type="range" min="15" max="60" step="5" value="${listingState.maxTime}" data-action="filter-time" style="width:100%;accent-color:var(--primary)"/>
          <div class="range-row"><span>15 min</span><span>${listingState.maxTime} min</span></div>
        </div>
        <div class="filter-group">
          <div class="filter-title">Preferences</div>
          <div class="flex-between">
            <span style="font-size:14px;font-weight:600">Veg only</span>
            <div class="toggle ${listingState.vegOnly ? 'on' : ''}" data-action="filter-veg" role="switch" aria-checked="${listingState.vegOnly}" tabindex="0"></div>
          </div>
        </div>
      </aside>
      <div>
        <div class="sort-bar">
          <select class="select-input" data-action="filter-sort" aria-label="Sort kitchens">
            <option value="rating" ${listingState.sort === 'rating' ? 'selected' : ''}>Sort: Rating</option>
            <option value="time" ${listingState.sort === 'time' ? 'selected' : ''}>Sort: Delivery time</option>
            <option value="price-low" ${listingState.sort === 'price-low' ? 'selected' : ''}>Sort: Price (low to high)</option>
            <option value="price-high" ${listingState.sort === 'price-high' ? 'selected' : ''}>Sort: Price (high to low)</option>
          </select>
        </div>
        ${list.length ? `<div class="kitchen-grid">${list.map(kitchenCard).join('')}</div>` : `
          <div class="empty-state">
            <div class="em">🔍</div><h3>No kitchens match those filters</h3>
            <p>Try loosening a filter — every brand ships from the same fast kitchen.</p>
            <button class="btn btn-primary" data-action="reset-filters">Reset filters</button>
          </div>`}
      </div>
    </div>
  </div>`;
}

/* ================================================================
   PAGE: KITCHEN STOREFRONT
   ================================================================ */
const storefrontState = { vegOnly: false, activeCategory: null };
function renderStorefront(slug) {
  const k = getKitchenBySlug(slug);
  if (!k) return renderNotFound();
  storefrontState.activeCategory = storefrontState.activeCategory || null;
  const menu = getMenu(k.id).filter((m) => !storefrontState.vegOnly || m.isVeg);
  const categories = [...new Set(getMenu(k.id).map((m) => m.category))];
  const active = storefrontState.activeCategory || categories[0];

  const cartHasThisKitchen = cartKitchenId() === k.id;

  return `
  <div style="--kc:${k.accent}">
    <div class="container">
      <div class="storefront-banner" style="--kc:${k.accent}">${k.emoji}</div>
      <div class="storefront-header">
        <div class="storefront-logo" style="--kc:${k.accent}">${k.emoji}</div>
        <div class="storefront-info" style="flex:1">
          <h1>${escapeHtml(k.name)}</h1>
          <p class="muted" style="margin:0">${escapeHtml(k.tagline)} · ${k.cuisines.join(', ')}</p>
          <div class="storefront-meta-row">
            <span><span class="rating-pill"><i data-lucide="star" style="width:11px;height:11px;fill:#fff"></i> ${k.rating}</span> <b>${k.ratingCount.toLocaleString('en-IN')}</b> ratings</span>
            <span><i data-lucide="clock" style="width:14px;height:14px;vertical-align:-2px"></i> <b>${k.deliveryTimeMins} min</b></span>
            <span><i data-lucide="banknote" style="width:14px;height:14px;vertical-align:-2px"></i> <b>₹${k.priceForTwo}</b> for two</span>
            <span class="fssai-badge">FSSAI ${k.fssai}</span>
          </div>
        </div>
        <div class="badge-outline" style="background:var(--primary-tint);border-color:transparent;color:var(--kc)">${escapeHtml(k.offer)}</div>
      </div>

      <div class="menu-layout">
        <div class="menu-nav">
          <div class="veg-filter-row">
            <span>Veg only</span>
            <div class="toggle ${storefrontState.vegOnly ? 'on' : ''}" data-action="storefront-veg" role="switch" aria-checked="${storefrontState.vegOnly}" tabindex="0"></div>
          </div>
          ${categories.map((c) => `<div class="menu-nav-item ${c === active ? 'active' : ''}" style="--kc:${k.accent}" data-action="storefront-cat" data-cat="${c}">${c}</div>`).join('')}
        </div>
        <div id="menu-scroll-area">
          ${categories.filter((c) => menu.some((m) => m.category === c)).map((cat) => `
            <div data-category-block="${cat}">
              <h3 class="menu-category-title">${cat}</h3>
              ${menu.filter((m) => m.category === cat).map((item) => menuItemRow(k, item)).join('')}
            </div>
          `).join('') || `<div class="empty-state"><div class="em">🥗</div><h3>No veg items in this view</h3><p>Turn off "Veg only" to see the full menu.</p></div>`}
        </div>
      </div>
    </div>
    ${cartHasThisKitchen ? `
      <div class="sticky-cart-bar" data-action="nav-to" data-href="#/cart">
        <span>${cartCount()} item${cartCount() > 1 ? 's' : ''} · ${formatINR(cartSubtotal())}</span>
        <span style="display:flex;align-items:center;gap:4px">View cart <i data-lucide="arrow-right" style="width:16px;height:16px"></i></span>
      </div>` : ''}
  </div>`;
}

function menuItemRow(k, item) {
  const line = findLine(k.id, item.id, null);
  const hasCustom = item.customizations && item.customizations.length;
  return `
  <div class="menu-item">
    <div class="menu-item-info">
      <div class="menu-item-title"><span class="veg-dot ${item.isVeg ? '' : 'nonveg'}"></span>${escapeHtml(item.name)}</div>
      <div class="menu-item-price">${formatINR(item.priceINR)}</div>
      <p class="menu-item-desc">${escapeHtml(item.description)}</p>
    </div>
    <div class="menu-item-action">
      <div class="menu-item-img" style="--kc:${k.accent}">
        ${item.bestseller ? '<span class="bestseller-tag">BESTSELLER</span>' : ''}
        ${item.emoji}
      </div>
      <div style="margin-top:10px">
        ${hasCustom ? `
          <button class="add-btn" style="--kc:${k.accent}" data-action="open-customize" data-kitchen="${k.id}" data-item="${item.id}">Add</button>
        ` : (line ? `
          <div class="qty-stepper" style="--kc:${k.accent}">
            <button data-action="qty-dec" data-kitchen="${k.id}" data-item="${item.id}" aria-label="Decrease quantity">−</button>
            <span>${line.qty}</span>
            <button data-action="qty-inc" data-kitchen="${k.id}" data-item="${item.id}" aria-label="Increase quantity">+</button>
          </div>` : `<button class="add-btn" style="--kc:${k.accent}" data-action="quick-add" data-kitchen="${k.id}" data-item="${item.id}">Add +</button>`)}
      </div>
    </div>
  </div>`;
}

/* ================================================================
   PAGE: CART
   ================================================================ */
function renderCart() {
  if (!state.cart.length) {
    return `<div class="container" style="padding-top:20px"><div class="empty-state">
      <div class="em">🛒</div><h3>Your cart is empty</h3><p>Add dishes from any of our seven kitchens to get started.</p>
      <a href="#/kitchens" class="btn btn-primary">Browse kitchens</a>
    </div></div>`;
  }
  const k = getKitchenById(cartKitchenId());
  const bill = computeBill();
  return `
  <div class="container" style="padding-top:24px;padding-bottom:60px;max-width:760px">
    <h1 style="font-size:24px;margin:0 0 6px">Your cart</h1>
    <p class="muted" style="margin:0 0 20px">From <b style="color:var(--text)">${escapeHtml(k.name)}</b> · <a href="#/kitchen/${k.slug}" style="color:var(--primary);font-weight:700">Add more items</a></p>

    <div class="checkout-card">
      ${state.cart.map((l) => {
        const item = getMenuItem(l.kitchenId, l.itemId);
        return `
        <div class="cart-line">
          <div class="cart-line-img" style="background:${k.accent}22">${item.emoji}</div>
          <div class="cart-line-info">
            <div class="cart-line-name">${escapeHtml(item.name)}</div>
            ${l.variant ? `<div class="cart-line-note">${escapeHtml(l.variant)}</div>` : ''}
            <div class="cart-line-price">${formatINR(l.priceEach)} × ${l.qty} = ${formatINR(l.priceEach * l.qty)}</div>
          </div>
          <div class="qty-stepper" style="--kc:${k.accent}">
            <button data-action="cart-qty-dec" data-kitchen="${l.kitchenId}" data-item="${l.itemId}" data-variant="${l.variant || ''}" aria-label="Decrease quantity">−</button>
            <span>${l.qty}</span>
            <button data-action="cart-qty-inc" data-kitchen="${l.kitchenId}" data-item="${l.itemId}" data-variant="${l.variant || ''}" aria-label="Increase quantity">+</button>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="checkout-card">
      <h3>Apply coupon</h3>
      ${state.coupon ? `
        <div class="coupon-chip">
          <span><i data-lucide="ticket" style="width:15px;height:15px;vertical-align:-3px"></i> ${state.coupon.code} applied — ${state.coupon.description}</span>
          <button class="remove-link" data-action="remove-coupon">Remove</button>
        </div>` : `
        <div class="coupon-box">
          <input type="text" id="coupon-input" placeholder="Try WELCOME50, FLAT100, CLOUD20" class="form-input" style="margin:0"/>
          <button class="btn btn-outline" data-action="apply-coupon">Apply</button>
        </div>`}
      <p class="muted" style="font-size:12.5px;margin:0">Available: WELCOME50, FLAT100, CLOUD20</p>
    </div>

    <div class="checkout-card">
      <h3>Tip your delivery partner</h3>
      <p class="muted" style="margin-top:-10px;font-size:13px">100% of the tip goes to your delivery partner.</p>
      <div class="tip-row">
        ${[0, 20, 30, 50].map((t) => `<div class="tip-chip ${state.tip === t ? 'active' : ''}" data-action="set-tip" data-tip="${t}">${t === 0 ? 'No tip' : '₹' + t}</div>`).join('')}
      </div>
    </div>

    <div class="checkout-card">
      <h3>Bill summary</h3>
      <div class="bill-row"><span>Item total</span><span>${formatINR(bill.subtotal)}</span></div>
      ${bill.discount ? `<div class="bill-row discount"><span>Coupon discount</span><span>−${formatINR(bill.discount)}</span></div>` : ''}
      <div class="bill-row"><span>Delivery fee ${bill.deliveryFee === 0 ? '(free above ₹499)' : ''}</span><span>${bill.deliveryFee === 0 ? 'FREE' : formatINR(bill.deliveryFee)}</span></div>
      <div class="bill-row"><span>Packaging charge</span><span>${formatINR(bill.packaging)}</span></div>
      <div class="bill-row"><span>GST (5%)</span><span>${formatINR(bill.gst)}</span></div>
      ${bill.tip ? `<div class="bill-row"><span>Delivery tip</span><span>${formatINR(bill.tip)}</span></div>` : ''}
      <div class="bill-row total"><span>Grand total</span><span>${formatINR(bill.grandTotal)}</span></div>
    </div>

    <button class="btn btn-primary btn-lg btn-block" data-action="proceed-checkout">Proceed to checkout · ${formatINR(bill.grandTotal)}</button>
  </div>`;
}

/* ================================================================
   PAGE: CHECKOUT
   ================================================================ */
function renderCheckout() {
  if (!state.cart.length) { navigate('#/cart'); return ''; }
  if (state.addresses.length && !state.selectedAddressId) state.selectedAddressId = state.addresses.find((a) => a.isDefault)?.id || state.addresses[0].id;
  const bill = computeBill();
  return `
  <div class="container" style="padding-top:24px;padding-bottom:60px">
    <h1 style="font-size:24px;margin:0 0 20px">Checkout</h1>
    <div class="checkout-layout">
      <div>
        <div class="checkout-card">
          <h3>Delivery address</h3>
          ${state.addresses.map((a) => `
            <div class="address-card ${state.selectedAddressId === a.id ? 'selected' : ''}" data-action="select-address" data-id="${a.id}">
              <div>
                <span class="address-tag">${a.tag}</span>
                <div style="font-weight:700;font-size:14px">${escapeHtml(a.line1)}</div>
                <div class="muted" style="font-size:13px">${escapeHtml(a.line2)}, ${escapeHtml(a.city)} – ${escapeHtml(a.pincode)}</div>
              </div>
              <i data-lucide="${state.selectedAddressId === a.id ? 'check-circle-2' : 'circle'}" style="width:20px;height:20px;color:var(--primary);flex-shrink:0"></i>
            </div>`).join('')}
          <button class="btn btn-outline btn-block" data-action="open-add-address" style="margin-top:8px"><i data-lucide="plus" style="width:16px;height:16px"></i> Add new address</button>
        </div>

        <div class="checkout-card">
          <h3>Delivery time</h3>
          <div class="time-toggle">
            <div class="time-btn ${state.deliveryTime === 'asap' ? 'active' : ''}" data-action="set-delivery-time" data-val="asap">⚡ As soon as possible</div>
            <div class="time-btn ${state.deliveryTime === 'schedule' ? 'active' : ''}" data-action="set-delivery-time" data-val="schedule">🕒 Schedule for later</div>
          </div>
          ${state.deliveryTime === 'schedule' ? `<input type="time" class="form-input" style="margin-top:14px" id="schedule-time"/>` : ''}
        </div>

        <div class="checkout-card">
          <h3>Payment method</h3>
          ${[
            ['upi', 'UPI (Google Pay, PhonePe, Paytm)', 'smartphone'],
            ['card', 'Credit / Debit Card', 'credit-card'],
            ['netbanking', 'Netbanking', 'landmark'],
            ['wallet', 'CloudEats Wallet · ₹250 available', 'wallet'],
            ['cod', 'Cash on Delivery', 'banknote'],
          ].map(([val, label, icon]) => `
            <label class="pay-option ${state.paymentMethod === val ? 'selected' : ''}" data-action="select-payment" data-val="${val}">
              <input type="radio" name="pay" value="${val}" ${state.paymentMethod === val ? 'checked' : ''}/>
              <i data-lucide="${icon}" style="width:19px;height:19px"></i> ${label}
            </label>`).join('')}
        </div>
      </div>

      <div>
        <div class="checkout-card" style="position:sticky;top:88px">
          <h3>Order summary</h3>
          <div class="bill-row"><span>Item total</span><span>${formatINR(bill.subtotal)}</span></div>
          ${bill.discount ? `<div class="bill-row discount"><span>Coupon discount</span><span>−${formatINR(bill.discount)}</span></div>` : ''}
          <div class="bill-row"><span>Delivery fee</span><span>${bill.deliveryFee === 0 ? 'FREE' : formatINR(bill.deliveryFee)}</span></div>
          <div class="bill-row"><span>Packaging</span><span>${formatINR(bill.packaging)}</span></div>
          <div class="bill-row"><span>GST (5%)</span><span>${formatINR(bill.gst)}</span></div>
          ${bill.tip ? `<div class="bill-row"><span>Delivery tip</span><span>${formatINR(bill.tip)}</span></div>` : ''}
          <div class="bill-row total"><span>To pay</span><span>${formatINR(bill.grandTotal)}</span></div>
          <button class="btn btn-primary btn-lg btn-block" style="margin-top:16px" data-action="place-order" ${!state.addresses.length ? 'disabled' : ''}>
            ${state.paymentMethod === 'cod' ? 'Place order (Pay on delivery)' : 'Pay & place order'}
          </button>
          ${!state.addresses.length ? `<p class="field-error" style="text-align:center;margin-top:10px">Add a delivery address to continue</p>` : ''}
        </div>
      </div>
    </div>
  </div>`;
}

function addAddressSheet() {
  openSheet(`
    <div class="sheet-header"><h3 style="margin:0">Add new address</h3><button class="btn-icon" data-action="close-sheet"><i data-lucide="x" style="width:18px;height:18px"></i></button></div>
    <form id="address-form" data-action-submit="save-address">
      <div class="sheet-body">
        <div class="form-group">
          <label class="form-label">Label</label>
          <select class="form-input" name="tag"><option>Home</option><option>Work</option><option>Other</option></select>
        </div>
        <div class="form-group"><label class="form-label">Flat / House no., Building</label><input required class="form-input" name="line1" placeholder="e.g. 4B, Lake Terrace Apartments"/></div>
        <div class="form-group"><label class="form-label">Street / Area / Landmark</label><input required class="form-input" name="line2" placeholder="e.g. Near Gariahat Market"/></div>
        <div class="two-col">
          <div class="form-group"><label class="form-label">City</label><input required class="form-input" name="city" value="Kolkata"/></div>
          <div class="form-group"><label class="form-label">Pincode</label><input required class="form-input" name="pincode" pattern="[0-9]{6}" placeholder="700019"/></div>
        </div>
      </div>
      <div class="sheet-footer"><button class="btn btn-primary btn-block" type="submit">Save address</button></div>
    </form>`);
}

/* ================================================================
   PAGE: ORDER SUCCESS
   ================================================================ */
function renderOrderSuccess(orderId) {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return renderNotFound();
  const steps = ['placed', 'preparing', 'transit', 'delivered'];
  const idx = steps.indexOf(order.status);
  const labels = { placed: 'Order placed', preparing: 'Preparing', transit: 'Out for delivery', delivered: 'Delivered' };
  const iconsMap = { placed: 'check', preparing: 'chef-hat', transit: 'bike', delivered: 'party-popper' };
  const k = getKitchenById(order.kitchenId);
  return `
  <div class="container" style="padding-top:40px;padding-bottom:60px;max-width:640px;text-align:center">
    <div class="success-check"><i data-lucide="check" style="width:44px;height:44px"></i></div>
    <h1 style="font-size:26px;margin:0 0 6px">Order confirmed!</h1>
    <p class="muted">Order <b style="color:var(--text)">#${order.id}</b> from <b style="color:var(--text)">${escapeHtml(k.name)}</b> is on its way to your kitchen counter.</p>
    <p class="muted">Estimated delivery: <b style="color:var(--text)">${order.eta}</b></p>

    <div class="checkout-card" style="text-align:left;margin-top:26px">
      <div class="tracker" id="tracker">
        <div class="tracker-fill" style="width:${idx === 0 ? 0 : (idx / (steps.length - 1)) * 90}%"></div>
        ${steps.map((s, i) => `
          <div class="tracker-step ${i < idx ? 'done' : i === idx ? 'current' : ''}">
            <div class="tracker-dot"><i data-lucide="${i <= idx ? iconsMap[s] : 'circle'}" style="width:15px;height:15px"></i></div>
            <div class="tracker-label">${labels[s]}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="checkout-card" style="text-align:left">
      <h3>Order details</h3>
      ${order.items.map((it) => `<div class="bill-row"><span>${it.qty} × ${escapeHtml(it.name)}</span><span>${formatINR(it.qty * it.priceEach)}</span></div>`).join('')}
      <div class="bill-row total"><span>Total paid</span><span>${formatINR(order.totals.grandTotal)}</span></div>
      <p class="muted" style="margin-top:10px;font-size:13px">${escapeHtml(order.paymentMethod.toUpperCase())} · Delivering to ${escapeHtml(order.address.line1)}, ${escapeHtml(order.address.city)}</p>
    </div>

    <div class="flex gap-12" style="margin-top:10px">
      <a href="#/orders" class="btn btn-outline btn-block">View all orders</a>
      <a href="#/kitchens" class="btn btn-primary btn-block">Order more food</a>
    </div>
  </div>`;
}

function simulateOrderProgress(orderId) {
  const stages = ['preparing', 'transit', 'delivered'];
  stages.forEach((stage, i) => {
    setTimeout(() => {
      const o = state.orders.find((x) => x.id === orderId);
      if (!o || o.status === 'delivered') return;
      o.status = stage;
      persistOrders();
      if (location.hash === `#/order-success/${orderId}`) render();
      if (stage === 'delivered') toast(`Order #${orderId} delivered! Enjoy 🎉`, 'party-popper');
    }, (i + 1) * 5000);
  });
}

/* ================================================================
   PAGE: ORDERS HISTORY
   ================================================================ */
function renderOrders() {
  const orders = [...state.orders].reverse();
  if (!orders.length) {
    return `<div class="container" style="padding-top:20px"><div class="empty-state"><div class="em">📦</div><h3>No orders yet</h3><p>Your order history will show up here once you place your first order.</p><a href="#/kitchens" class="btn btn-primary">Browse kitchens</a></div></div>`;
  }
  return `
  <div class="container" style="padding-top:24px;padding-bottom:60px;max-width:720px">
    <h1 style="font-size:24px;margin:0 0 20px">Your orders</h1>
    ${orders.map((o) => {
      const k = getKitchenById(o.kitchenId);
      return `
      <div class="order-card">
        <div class="flex-between" style="margin-bottom:10px">
          <div class="flex gap-12" style="align-items:center">
            <div class="kitchen-cover" style="--kc:${k.accent};width:44px;height:44px;font-size:20px;border-radius:12px">${k.emoji}</div>
            <div>
              <div style="font-weight:700">${escapeHtml(k.name)}</div>
              <div class="muted" style="font-size:12.5px">${new Date(o.placedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
          <span class="order-status ${o.status === 'delivered' ? 'delivered' : o.status === 'transit' ? 'transit' : 'preparing'}">${o.status}</span>
        </div>
        <p class="muted" style="font-size:13.5px;margin:0 0 12px">${o.items.map((it) => `${it.qty} × ${it.name}`).join(', ')}</p>
        <div class="flex-between">
          <b>${formatINR(o.totals.grandTotal)}</b>
          <div class="flex gap-12">
            <button class="btn btn-outline btn-sm" data-action="rate-order" data-order="${o.id}">Rate order</button>
            <button class="btn btn-primary btn-sm" data-action="reorder" data-order="${o.id}">Reorder</button>
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

/* ================================================================
   PAGE: PROFILE
   ================================================================ */
const profileState = { tab: 'info' };
function renderProfile() {
  const u = state.user;
  return `
  <div class="container" style="padding-top:24px;padding-bottom:60px;max-width:680px">
    <h1 style="font-size:24px;margin:0 0 16px">Your account</h1>
    <div class="profile-tabs">
      <div class="profile-tab ${profileState.tab === 'info' ? 'active' : ''}" data-action="profile-tab" data-tab="info">Profile info</div>
      <div class="profile-tab ${profileState.tab === 'addresses' ? 'active' : ''}" data-action="profile-tab" data-tab="addresses">Addresses</div>
      <div class="profile-tab ${profileState.tab === 'payments' ? 'active' : ''}" data-action="profile-tab" data-tab="payments">Payment methods</div>
    </div>
    ${profileState.tab === 'info' ? `
      <div class="checkout-card">
        <form data-action-submit="save-profile">
          <div class="form-group"><label class="form-label">Full name</label><input class="form-input" name="name" value="${escapeHtml(u.name)}"/></div>
          <div class="form-group"><label class="form-label">Email</label><input class="form-input" name="email" type="email" value="${escapeHtml(u.email)}"/></div>
          <div class="form-group"><label class="form-label">Phone</label><input class="form-input" name="phone" value="${escapeHtml(u.phone || '')}"/></div>
          <button class="btn btn-primary" type="submit">Save changes</button>
        </form>
      </div>
      <button class="btn btn-outline btn-block" data-action="logout" style="margin-top:6px">Logout</button>
    ` : profileState.tab === 'addresses' ? `
      <div class="checkout-card">
        ${state.addresses.length ? state.addresses.map((a) => `
          <div class="address-card">
            <div><span class="address-tag">${a.tag}</span><div style="font-weight:700;font-size:14px">${escapeHtml(a.line1)}</div><div class="muted" style="font-size:13px">${escapeHtml(a.line2)}, ${escapeHtml(a.city)} – ${escapeHtml(a.pincode)}</div></div>
            <button class="remove-link" data-action="delete-address" data-id="${a.id}">Remove</button>
          </div>`).join('') : `<p class="muted">No saved addresses yet.</p>`}
        <button class="btn btn-outline btn-block" data-action="open-add-address" style="margin-top:8px"><i data-lucide="plus" style="width:16px;height:16px"></i> Add new address</button>
      </div>
    ` : `
      <div class="checkout-card">
        <div class="pay-option selected"><i data-lucide="wallet" style="width:19px;height:19px"></i> CloudEats Wallet — ₹250.00 balance</div>
        <div class="pay-option"><i data-lucide="credit-card" style="width:19px;height:19px"></i> •••• •••• •••• 4821 (Visa, UI only)</div>
        <button class="btn btn-outline btn-block" style="margin-top:6px" data-action="noop"><i data-lucide="plus" style="width:16px;height:16px"></i> Add payment method</button>
      </div>`}
  </div>`;
}

/* ================================================================
   PAGES: LOGIN / SIGNUP / OTP
   ================================================================ */
function renderLogin() {
  return `
  <div class="form-page">
    <div class="form-card">
      <h1 style="font-size:24px;margin:0 0 4px">Welcome back</h1>
      <p class="muted" style="margin:0 0 24px">Log in to continue your order</p>
      <form data-action-submit="login-submit" novalidate>
        <div class="form-group"><label class="form-label">Email or phone</label><input class="form-input" name="identifier" required placeholder="you@example.com"/></div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input class="form-input" name="password" type="password" required placeholder="••••••••"/>
          <div id="login-error" class="field-error" style="display:none">No account found with these details. Try demo@cloudeats.in / password123, or sign up.</div>
        </div>
        <div class="flex-between" style="margin-bottom:18px"><a href="#/" style="font-size:13px;color:var(--primary);font-weight:700">Forgot password?</a></div>
        <button class="btn btn-primary btn-block btn-lg" type="submit">Log in</button>
      </form>
      <div class="form-divider">or continue with</div>
      <div class="oauth-row">
        <button class="oauth-btn" data-action="oauth-demo"><i data-lucide="chrome" style="width:17px;height:17px"></i> Continue with Google</button>
        <button class="oauth-btn" data-action="oauth-demo"><i data-lucide="apple" style="width:17px;height:17px"></i> Continue with Apple</button>
      </div>
      <p class="muted center" style="margin-top:22px;font-size:14px">New to CloudEats? <a href="#/signup" style="color:var(--primary);font-weight:700">Sign up</a></p>
      <p class="muted center" style="margin-top:8px;font-size:12px">Demo login: demo@cloudeats.in / password123</p>
    </div>
  </div>`;
}

function renderSignup() {
  return `
  <div class="form-page">
    <div class="form-card">
      <h1 style="font-size:24px;margin:0 0 4px">Create your account</h1>
      <p class="muted" style="margin:0 0 24px">Takes less than a minute</p>
      <form data-action-submit="signup-submit" novalidate>
        <div class="form-group"><label class="form-label">Full name</label><input class="form-input" name="name" required placeholder="Aditi Sharma"/></div>
        <div class="form-group"><label class="form-label">Email or phone</label><input class="form-input" name="identifier" required placeholder="you@example.com or 98XXXXXXXX"/></div>
        <div class="form-group"><label class="form-label">Password</label><input class="form-input" name="password" type="password" required minlength="6" placeholder="At least 6 characters"/></div>
        <div class="form-group">
          <label class="form-label">Confirm password</label><input class="form-input" name="confirm" type="password" required placeholder="Re-enter password"/>
          <div id="signup-error" class="field-error" style="display:none">Passwords don't match.</div>
        </div>
        <div class="form-group"><label class="form-label">Referral code (optional)</label><input class="form-input" name="referral" placeholder="e.g. FRIEND100"/></div>
        <button class="btn btn-primary btn-block btn-lg" type="submit">Create account</button>
      </form>
      <div class="form-divider">or continue with</div>
      <div class="oauth-row">
        <button class="oauth-btn" data-action="oauth-demo"><i data-lucide="chrome" style="width:17px;height:17px"></i> Continue with Google</button>
        <button class="oauth-btn" data-action="oauth-demo"><i data-lucide="apple" style="width:17px;height:17px"></i> Continue with Apple</button>
      </div>
      <p class="muted center" style="margin-top:22px;font-size:14px">Already have an account? <a href="#/login" style="color:var(--primary);font-weight:700">Log in</a></p>
    </div>
  </div>`;
}

let otpTimer = null;
function renderOtp() {
  const pending = JSON.parse(sessionStorage.getItem('ce_pending_signup') || 'null');
  if (!pending) { navigate('#/signup'); return ''; }
  setTimeout(startOtpTimer, 0);
  return `
  <div class="form-page">
    <div class="form-card">
      <h1 style="font-size:24px;margin:0 0 4px">Verify it's you</h1>
      <p class="muted" style="margin:0 0 24px">Enter the 6-digit code sent to <b style="color:var(--text)">${escapeHtml(pending.identifier)}</b> (demo: any 6 digits work)</p>
      <div class="otp-row">
        ${Array.from({ length: 6 }).map((_, i) => `<input class="otp-digit" maxlength="1" inputmode="numeric" data-otp-idx="${i}" aria-label="Digit ${i + 1}"/>`).join('')}
      </div>
      <div id="otp-error" class="field-error" style="display:none;margin-bottom:14px">Please enter all 6 digits.</div>
      <button class="btn btn-primary btn-block btn-lg" data-action="verify-otp">Verify & continue</button>
      <p class="muted center" style="margin-top:18px;font-size:13.5px">Didn't get a code? <button id="resend-btn" class="remove-link" style="color:var(--primary)" data-action="resend-otp" disabled>Resend in <span id="resend-secs">30</span>s</button></p>
    </div>
  </div>`;
}
function startOtpTimer() {
  const inputs = $$('.otp-digit');
  if (inputs.length) {
    inputs[0].focus();
    inputs.forEach((inp, i) => {
      inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 1); if (inp.value && inputs[i + 1]) inputs[i + 1].focus(); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !inp.value && inputs[i - 1]) inputs[i - 1].focus(); });
    });
  }
  let secs = 30;
  clearInterval(otpTimer);
  const secsEl = $('#resend-secs'); const btn = $('#resend-btn');
  otpTimer = setInterval(() => {
    secs -= 1;
    if (secsEl) secsEl.textContent = secs;
    if (secs <= 0) { clearInterval(otpTimer); if (btn) { btn.disabled = false; btn.innerHTML = 'Resend code'; } }
  }, 1000);
}

/* ================================================================
   PAGE: SEARCH
   ================================================================ */
function renderSearch(q) {
  const query = (q || '').trim().toLowerCase();
  const matchedKitchens = query ? KITCHENS.filter((k) => k.name.toLowerCase().includes(query) || k.cuisines.some((c) => c.toLowerCase().includes(query))) : [];
  const matchedDishes = [];
  if (query) {
    KITCHENS.forEach((k) => getMenu(k.id).forEach((m) => { if (m.name.toLowerCase().includes(query)) matchedDishes.push({ ...m, kitchen: k }); }));
  }
  return `
  <div class="container" style="padding-top:24px;padding-bottom:60px">
    <h1 style="font-size:22px;margin:0 0 6px">Search results for "${escapeHtml(q)}"</h1>
    <p class="muted" style="margin:0 0 24px">${matchedKitchens.length + matchedDishes.length} result(s) found</p>
    ${!query ? `<div class="empty-state"><div class="em">🔎</div><h3>Search for a kitchen or a dish</h3><p>Try "biryani", "pizza", or "Sushi Zen".</p></div>` : ''}
    ${query && matchedKitchens.length ? `<h3 class="menu-category-title" style="margin-top:0">Kitchens</h3><div class="kitchen-grid">${matchedKitchens.map(kitchenCard).join('')}</div>` : ''}
    ${query && matchedDishes.length ? `
      <h3 class="menu-category-title">Dishes</h3>
      <div class="checkout-card">
        ${matchedDishes.map((d) => `
          <div class="menu-item">
            <div class="menu-item-info">
              <div class="menu-item-title"><span class="veg-dot ${d.isVeg ? '' : 'nonveg'}"></span>${escapeHtml(d.name)}</div>
              <p class="menu-item-desc">${escapeHtml(d.kitchen.name)} · ${formatINR(d.priceINR)}</p>
            </div>
            <a href="#/kitchen/${d.kitchen.slug}" class="btn btn-outline btn-sm">View</a>
          </div>`).join('')}
      </div>` : ''}
    ${query && !matchedKitchens.length && !matchedDishes.length ? `<div class="empty-state"><div class="em">🍽️</div><h3>No matches for "${escapeHtml(q)}"</h3><p>Try a different dish or cuisine name.</p></div>` : ''}
  </div>`;
}

function renderNotFound() {
  return `<div class="container" style="padding-top:40px"><div class="empty-state"><div class="em">🧭</div><h3>Page not found</h3><p>That route doesn't exist in this prototype.</p><a href="#/" class="btn btn-primary">Back home</a></div></div>`;
}

/* ================================================================
   EVENT DELEGATION
   ================================================================ */
document.addEventListener('click', (e) => {
  const closeBtn = e.target.closest('[data-action="close-user-menu-outside"]');
  const target = e.target.closest('[data-action]');

  // close user dropdown / sheets on outside click
  const dd = $('#user-dropdown');
  if (dd && dd.classList.contains('open') && !e.target.closest('.dropdown-wrap')) dd.classList.remove('open');

  if (!target) return;
  const action = target.getAttribute('data-action');
  const kitchenId = target.getAttribute('data-kitchen');
  const itemId = target.getAttribute('data-item');
  const variant = target.getAttribute('data-variant') || null;

  switch (action) {
    case 'noop': break;
    case 'nav-to': navigate(target.getAttribute('data-href')); break;
    case 'toggle-theme': {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      save(LS.theme, state.theme);
      document.body.setAttribute('data-theme', state.theme);
      renderNavShell();
      break;
    }
    case 'toggle-user-menu': $('#user-dropdown').classList.toggle('open'); break;
    case 'logout': logout(); break;
    case 'close-modal': case 'close-sheet': closeOverlay(); break;
    case 'clear-and-add': {
      state.cart = [];
      const item = getMenuItem(kitchenId, itemId);
      state.cart.push({ kitchenId, itemId, variant: variant || null, qty: 1, priceEach: item.priceINR });
      persistCart(); closeOverlay(); toast(`Added ${item.name} to a fresh cart`, 'shopping-cart'); render();
      break;
    }
    case 'quick-add': if (addToCart(kitchenId, itemId, null, 1)) render(); break;
    case 'qty-inc': if (addToCart(kitchenId, itemId, null, 1)) render(); break;
    case 'qty-dec': updateCartQty(kitchenId, itemId, null, -1); render(); break;
    case 'cart-qty-inc': updateCartQty(kitchenId, itemId, variant, 1); render(); break;
    case 'cart-qty-dec': updateCartQty(kitchenId, itemId, variant, -1); render(); break;
    case 'open-customize': openCustomizeSheet(kitchenId, itemId); break;
    case 'customize-add': {
      const sheet = $('#active-sheet');
      const qty = parseInt(sheet.querySelector('.qty-stepper span').textContent, 10);
      const variants = $$('.custom-variant-select', sheet).map((sel) => `${sel.dataset.group}: ${sel.value}`).join(', ');
      const added = addToCart(kitchenId, itemId, variants || null, qty);
      if (added) { closeOverlay(); render(); }
      break;
    }
    case 'customize-qty-inc': { const s = target.closest('.sheet-body').querySelector('.qty-stepper span'); s.textContent = parseInt(s.textContent, 10) + 1; break; }
    case 'customize-qty-dec': { const s = target.closest('.sheet-body').querySelector('.qty-stepper span'); s.textContent = Math.max(1, parseInt(s.textContent, 10) - 1); break; }

    case 'filter-cuisine': listingState.cuisine = target.value || null; render(); break;
    case 'filter-veg': listingState.vegOnly = !listingState.vegOnly; render(); break;
    case 'reset-filters': Object.assign(listingState, { cuisine: null, minRating: 0, maxPrice: 1000, maxTime: 60, vegOnly: false, sort: 'rating' }); render(); break;
    case 'storefront-veg': storefrontState.vegOnly = !storefrontState.vegOnly; render(); break;
    case 'storefront-cat': storefrontState.activeCategory = target.getAttribute('data-cat'); render();
      setTimeout(() => { const blk = $(`[data-category-block="${storefrontState.activeCategory}"]`); if (blk) blk.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
      break;

    case 'apply-coupon': {
      const code = ($('#coupon-input')?.value || '').trim().toUpperCase();
      const c = COUPONS[code];
      const subtotal = cartSubtotal();
      if (!c) { toast('Invalid coupon code', 'x-circle'); }
      else if (subtotal < c.minOrder) { toast(`Add ${formatINR(c.minOrder - subtotal)} more to use ${code}`, 'info'); }
      else { state.coupon = c; toast(`${code} applied!`, 'ticket'); }
      render();
      break;
    }
    case 'remove-coupon': state.coupon = null; render(); break;
    case 'set-tip': state.tip = parseInt(target.getAttribute('data-tip'), 10); render(); break;
    case 'proceed-checkout': navigate('#/checkout'); break;

    case 'select-address': state.selectedAddressId = target.getAttribute('data-id'); render(); break;
    case 'open-add-address': addAddressSheet(); break;
    case 'delete-address': state.addresses = state.addresses.filter((a) => a.id !== target.getAttribute('data-id')); persistAddresses(); render(); break;
    case 'set-delivery-time': state.deliveryTime = target.getAttribute('data-val'); render(); break;
    case 'select-payment': state.paymentMethod = target.getAttribute('data-val'); save(LS.payment, state.paymentMethod); render(); break;
    case 'place-order': placeOrder(); break;

    case 'oauth-demo': toast('This is a UI-only demo of social login', 'info'); break;
    case 'resend-otp': startOtpTimer(); toast('New OTP sent (demo): use any 6 digits', 'message-circle'); break;
    case 'verify-otp': verifyOtp(); break;

    case 'profile-tab': profileState.tab = target.getAttribute('data-tab'); render(); break;
    case 'reorder': reorder(target.getAttribute('data-order')); break;
    case 'rate-order': openModal(`<h3 style="margin-top:0">Rate your order</h3><div style="font-size:34px;letter-spacing:6px;margin-bottom:18px" id="star-picker">${[1, 2, 3, 4, 5].map((n) => `<span data-star="${n}" style="cursor:pointer;opacity:.35">★</span>`).join('')}</div><button class="btn btn-primary btn-block" data-action="submit-rating">Submit rating</button>`); break;
    case 'submit-rating': closeOverlay(); toast('Thanks for rating your order!', 'star'); break;
    default: break;
  }
});

// star picker hover/click (simple, no persistence needed for prototype)
document.addEventListener('click', (e) => {
  const star = e.target.closest('[data-star]');
  if (!star) return;
  const n = parseInt(star.getAttribute('data-star'), 10);
  $$('#star-picker span').forEach((s, i) => { s.style.opacity = i < n ? '1' : '.35'; s.style.color = i < n ? '#F0A83F' : ''; });
});

/* Range inputs: update the live number readout while dragging (cheap DOM
   write, no re-render), then commit + full re-render on 'change' (release).
   A full re-render mid-drag would replace the slider node and kill the drag. */
document.addEventListener('input', (e) => {
  if (e.target.matches('[data-action="filter-rating"]')) { const row = e.target.nextElementSibling; if (row) row.firstElementChild.textContent = `${e.target.value}★+`; }
  if (e.target.matches('[data-action="filter-price"]')) { const row = e.target.nextElementSibling; if (row) row.lastElementChild.textContent = `₹${e.target.value}`; }
  if (e.target.matches('[data-action="filter-time"]')) { const row = e.target.nextElementSibling; if (row) row.lastElementChild.textContent = `${e.target.value} min`; }
});
document.addEventListener('change', (e) => {
  if (e.target.matches('[data-action="filter-sort"]')) { listingState.sort = e.target.value; render(); }
  if (e.target.matches('[data-action="filter-rating"]')) { listingState.minRating = parseFloat(e.target.value); render(); }
  if (e.target.matches('[data-action="filter-price"]')) { listingState.maxPrice = parseInt(e.target.value, 10); render(); }
  if (e.target.matches('[data-action="filter-time"]')) { listingState.maxTime = parseInt(e.target.value, 10); render(); }
});

/* Form submits via delegation */
document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-action-submit]');
  if (!form) return;
  e.preventDefault();
  const action = form.getAttribute('data-action-submit');
  const fd = new FormData(form);
  switch (action) {
    case 'nav-search': { const q = fd.get('q'); if (q) navigate(`#/search?q=${encodeURIComponent(q)}`); break; }
    case 'login-submit': doLogin(fd); break;
    case 'signup-submit': doSignup(fd); break;
    case 'save-address': doSaveAddress(fd); break;
    case 'save-profile': doSaveProfile(fd); break;
    default: break;
  }
});

/* ---------------- Action implementations ---------------- */
function openCustomizeSheet(kitchenId, itemId) {
  const item = getMenuItem(kitchenId, itemId);
  const k = getKitchenById(kitchenId);
  openSheet(`
    <div class="sheet-header"><h3 style="margin:0">${escapeHtml(item.name)}</h3><button class="btn-icon" data-action="close-sheet"><i data-lucide="x" style="width:18px;height:18px"></i></button></div>
    <div class="sheet-body">
      <div class="menu-item-img" style="--kc:${k.accent};width:100%;height:140px;font-size:52px;margin-bottom:16px">${item.emoji}</div>
      <p class="muted">${escapeHtml(item.description)}</p>
      <div class="menu-item-price" style="font-size:18px;margin-bottom:18px">${formatINR(item.priceINR)}</div>
      ${item.customizations.map((c) => `
        <div class="form-group">
          <label class="form-label">${escapeHtml(c.name)}</label>
          <select class="form-input custom-variant-select" data-group="${escapeHtml(c.name)}">
            ${c.options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}
          </select>
        </div>`).join('')}
      <div class="flex-between" style="margin-top:20px">
        <span style="font-weight:700">Quantity</span>
        <div class="qty-stepper" style="--kc:${k.accent}">
          <button data-action="customize-qty-dec" aria-label="Decrease">−</button><span>1</span><button data-action="customize-qty-inc" aria-label="Increase">+</button>
        </div>
      </div>
    </div>
    <div class="sheet-footer"><button class="btn btn-primary btn-block" data-action="customize-add" data-kitchen="${kitchenId}" data-item="${itemId}">Add to cart</button></div>
  `);
}

function doLogin(fd) {
  const identifier = fd.get('identifier').trim().toLowerCase();
  const password = fd.get('password');
  const match = state.users.find((u) => (u.email.toLowerCase() === identifier || u.phone === identifier) && u.password === password);
  if (!match) { $('#login-error').style.display = 'block'; return; }
  state.user = { name: match.name, email: match.email, phone: match.phone };
  persistUser();
  toast(`Welcome back, ${match.name.split(' ')[0]}!`, 'check-circle');
  afterAuthRedirect();
}

function doSignup(fd) {
  const password = fd.get('password'), confirm = fd.get('confirm');
  if (password !== confirm) { $('#signup-error').style.display = 'block'; return; }
  const identifier = fd.get('identifier').trim();
  const isEmail = identifier.includes('@');
  sessionStorage.setItem('ce_pending_signup', JSON.stringify({
    name: fd.get('name'), identifier, email: isEmail ? identifier : `${identifier}@cloudeats.demo`,
    phone: isEmail ? '' : identifier, password,
  }));
  navigate('#/otp-verify');
}

function verifyOtp() {
  const digits = $$('.otp-digit').map((i) => i.value);
  if (digits.some((d) => !d)) { $('#otp-error').style.display = 'block'; return; }
  const pending = JSON.parse(sessionStorage.getItem('ce_pending_signup') || 'null');
  if (!pending) { navigate('#/signup'); return; }
  const newUser = { name: pending.name, email: pending.email, phone: pending.phone, password: pending.password };
  state.users.push(newUser); persistUsers();
  state.user = { name: newUser.name, email: newUser.email, phone: newUser.phone };
  persistUser();
  sessionStorage.removeItem('ce_pending_signup');
  clearInterval(otpTimer);
  toast(`Account created. Welcome, ${newUser.name.split(' ')[0]}!`, 'party-popper');
  afterAuthRedirect();
}

function doSaveAddress(fd) {
  const addr = { id: 'addr-' + Date.now(), tag: fd.get('tag'), line1: fd.get('line1'), line2: fd.get('line2'), city: fd.get('city'), pincode: fd.get('pincode'), isDefault: state.addresses.length === 0 };
  state.addresses.push(addr); persistAddresses();
  state.selectedAddressId = addr.id;
  closeOverlay();
  toast('Address saved', 'map-pin');
  render();
}

function doSaveProfile(fd) {
  state.user = { ...state.user, name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone') };
  persistUser();
  // keep users list in sync
  const u = state.users.find((x) => x.email === state.user.email);
  if (u) { u.name = state.user.name; u.phone = state.user.phone; persistUsers(); }
  toast('Profile updated', 'check-circle');
  render();
}

function placeOrder() {
  const bill = computeBill();
  const address = state.addresses.find((a) => a.id === state.selectedAddressId);
  if (!address) { toast('Please add a delivery address', 'alert-circle'); return; }
  const order = {
    id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    userId: state.user.email,
    kitchenId: cartKitchenId(),
    items: state.cart.map((l) => ({ ...getMenuItem(l.kitchenId, l.itemId), qty: l.qty, priceEach: l.priceEach, variant: l.variant })),
    status: 'placed',
    totals: bill,
    placedAt: Date.now(),
    eta: `${new Date(Date.now() + getKitchenById(cartKitchenId()).deliveryTimeMins * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
    address,
    paymentMethod: state.paymentMethod,
  };
  state.orders.push(order); persistOrders();
  state.cart = []; persistCart();
  state.coupon = null; state.tip = 0;
  navigate(`#/order-success/${order.id}`);
  simulateOrderProgress(order.id);
}

function reorder(orderId) {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return;
  if (cartKitchenId() && cartKitchenId() !== order.kitchenId) {
    if (!confirm(`Your cart has items from another kitchen. Replace it with items from ${getKitchenById(order.kitchenId).name}?`)) return;
    state.cart = [];
  }
  order.items.forEach((it) => addToCart(order.kitchenId, it.id, it.variant, it.qty));
  navigate('#/cart');
}

function afterRenderHook() {
  const { path } = parseRoute();
  if (path.startsWith('/order-success/')) {
    const id = path.split('/')[2];
    const o = state.orders.find((x) => x.id === id);
    if (o && o.status !== 'delivered' && !o._simRunning) { o._simRunning = true; simulateOrderProgress(id); }
  }
}

/* ---------------- Init ---------------- */
document.body.setAttribute('data-theme', state.theme);
render();
