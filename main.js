// ---------- Cart helpers ----------
// ---------- Backend config — SWAP THESE once your friend gives you real values ----------
const API_BASE_URL = 'https://your-backend-url.example.com'; // TODO: replace
const RAZORPAY_KEY_ID = 'rzp_test_XXXXXXXXXXXX'; // TODO: replace with her public key ID
const DEMO_MODE = true; // TODO: set to false once the real backend is connected
// ---------- Product data (temporary — will move to backend later) ----------
const PRODUCTS = [
  {
    id: '1',
    name: 'Jaipur blue pottery lamp',
    origin: 'Jaipur, Rajasthan',
    price: 2850,
    emoji: '🏺',
    description: 'Hand-thrown and glazed using a traditional Persian-influenced technique unique to Jaipur, this lamp is fired without lead, making the glaze both vivid and food-safe. Each piece varies slightly — no two lamps are identical.'
  },
  {
    id: '2',
    name: 'Pochampally ikat dupatta',
    origin: 'Bhoodan Pochampally, Telangana',
    price: 2200,
    emoji: '🧣',
    description: 'Every thread is tie-dyed before weaving, a technique that lets the pattern emerge only once the fabric is on the loom. This dupatta took approximately three weeks to complete, start to finish.'
  },
  {
    id: '3',
    name: 'Channapatna wooden toy train',
    origin: 'Channapatna, Karnataka',
    price: 890,
    emoji: '🚂',
    description: 'Carved from local ivory wood and colored with vegetable dyes, this toy follows a GI-tagged craft tradition over 200 years old. Safe for children — the dyes are non-toxic by design.'
  }
];
function getCart() {
  const data = localStorage.getItem('kk-cart');
  return data ? JSON.parse(data) : [];
}

function saveCart(cart) {
  localStorage.setItem('kk-cart', JSON.stringify(cart));
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  saveCart(cart);
  updateCartCount();
}

function updateCartCount() {
  const cart = getCart();
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const countEl = document.getElementById('cart-count');
  if (countEl) {
    countEl.textContent = totalItems;
  }
}

// ---------- Wire up "Add to bag" buttons ----------
document.querySelectorAll('.add-to-bag').forEach(button => {
  button.addEventListener('click', () => {
    const card = button.closest('.product-card');
    const product = {
      id: card.dataset.id,
      name: card.dataset.name,
      price: Number(card.dataset.price)
    };
    addToCart(product);
  });
});

// ---------- Run on every page load ----------
updateCartCount();
// ---------- Render cart page ----------
function renderCartPage() {
  const cartItemsEl = document.getElementById('cart-items');
  if (!cartItemsEl) return; // not on the cart page, skip

  const cart = getCart();
  const emptyEl = document.getElementById('cart-empty');
  const summaryEl = document.getElementById('cart-summary');

  if (cart.length === 0) {
    emptyEl.style.display = 'block';
    summaryEl.style.display = 'none';
    cartItemsEl.innerHTML = '';
    return;
  }

  emptyEl.style.display = 'none';
  summaryEl.style.display = 'block';

  cartItemsEl.innerHTML = cart.map(item => `
    <div class="cart-row" data-id="${item.id}">
      <span class="cart-row-name">${item.name}</span>
      <span class="cart-row-qty">Qty: ${item.qty}</span>
      <span class="cart-row-price">₹${item.price * item.qty}</span>
      <button class="cart-remove" data-id="${item.id}">Remove</button>
    </div>
  `).join('');

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  document.getElementById('cart-total').textContent = `₹${total}`;

  document.querySelectorAll('.cart-remove').forEach(button => {
    button.addEventListener('click', () => {
      removeFromCart(button.dataset.id);
    });
  });
}

function removeFromCart(id) {
  const cart = getCart().filter(item => item.id !== id);
  saveCart(cart);
  updateCartCount();
  renderCartPage();
}

renderCartPage();
// ---------- Render checkout summary ----------
function renderCheckoutSummary() {
  const itemsEl = document.getElementById('checkout-items');
  if (!itemsEl) return; // not on checkout page

  const cart = getCart();

  itemsEl.innerHTML = cart.map(item => `
    <div class="summary-row">
      <span>${item.name} × ${item.qty}</span>
      <span>₹${item.price * item.qty}</span>
    </div>
  `).join('');

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  document.getElementById('checkout-total').textContent = `₹${total}`;
}

renderCheckoutSummary();
// ---------- Handle checkout form submit ----------
const checkoutForm = document.getElementById('checkout-form');

if (checkoutForm) {
  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const statusEl = document.getElementById('checkout-status');
    const payButton = document.getElementById('pay-button');
    const cart = getCart();

    if (cart.length === 0) {
      statusEl.textContent = 'Your bag is empty.';
      return;
    }

    const customer = {
      name: document.getElementById('name').value,
      phone: document.getElementById('phone').value,
      address: document.getElementById('address').value
    };

    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    payButton.disabled = true;
    statusEl.textContent = 'Creating your order...';

    try {
     if (DEMO_MODE) {
  await new Promise(resolve => setTimeout(resolve, 1200));
  statusEl.textContent = 'Payment successful (demo mode). Order placed!';

  // Save this order to the profile's order history
  const orders = JSON.parse(localStorage.getItem('kk-orders') || '[]');
  orders.push({
    date: new Date().toLocaleDateString('en-IN'),
    items: cart,
    total: total
  });
  localStorage.setItem('kk-orders', JSON.stringify(orders));

  saveCart([]);
  updateCartCount();
  return;
}
      // ---- Call 1: create the order on the real backend ----
      const orderRes = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, items: cart, total })
      });

      if (!orderRes.ok) throw new Error('Could not create order');
      const orderData = await orderRes.json();

      // ---- Open Razorpay's payment popup ----
      const rzp = new Razorpay({
        key: RAZORPAY_KEY_ID,
        order_id: orderData.razorpayOrderId,
        amount: total * 100, // Razorpay expects amount in paise
        currency: 'INR',
        name: 'Kaarigar Katha',
        handler: async function (response) {
          statusEl.textContent = 'Confirming payment...';

          // ---- Call 2: confirm payment on the backend ----
          const confirmRes = await fetch(`${API_BASE_URL}/api/orders/${orderData.orderId}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response)
          });

          if (confirmRes.ok) {
            statusEl.textContent = 'Payment successful! Order placed.';
            saveCart([]);
            updateCartCount();
          } else {
            statusEl.textContent = 'Payment received, but confirmation failed. Contact support.';
          }
        },
        prefill: { name: customer.name, contact: customer.phone }
      });

      rzp.open();
      statusEl.textContent = '';

    } catch (err) {
      statusEl.textContent = 'Something went wrong. Please try again.';
    } finally {
      payButton.disabled = false;
    }
  });
}
// ---------- Highlight the current page in the nav ----------
function highlightActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const linkPage = link.getAttribute('href').split('#')[0];
    if (linkPage === currentPage) {
      link.classList.add('active-link');
    }
  });
}

highlightActiveNav();
// ---------- Camera capture ----------
const startCameraBtn = document.getElementById('start-camera');

if (startCameraBtn) {
  const video = document.getElementById('camera-preview');
  const canvas = document.getElementById('photo-canvas');
  const photoImg = document.getElementById('captured-photo');
  const captureBtn = document.getElementById('capture-photo');
  const retakeBtn = document.getElementById('retake-photo');
  const statusEl = document.getElementById('camera-status');

  let currentStream = null;

  startCameraBtn.addEventListener('click', async () => {
    statusEl.textContent = 'Requesting camera access...';

    try {
      currentStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // prefers the back camera on phones
      });

      video.srcObject = currentStream;
      video.style.display = 'block';
      photoImg.style.display = 'none';

      startCameraBtn.style.display = 'none';
      captureBtn.style.display = 'inline-block';
      retakeBtn.style.display = 'none';
      statusEl.textContent = '';

    } catch (err) {
      statusEl.textContent = 'Could not access camera. Check your browser permissions.';
    }
  });

  captureBtn.addEventListener('click', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photoDataUrl = canvas.toDataURL('image/jpeg');
    photoImg.src = photoDataUrl;

    video.style.display = 'none';
    photoImg.style.display = 'block';

    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'inline-block';

    // Stop the camera stream once we have our photo — saves battery/privacy
    currentStream.getTracks().forEach(track => track.stop());
  });

  retakeBtn.addEventListener('click', () => {
    startCameraBtn.click(); // simplest way to restart the whole flow
  });
}
// ---------- Voice input ----------
const startMicBtn = document.getElementById('start-mic');

if (startMicBtn) {
  const transcriptEl = document.getElementById('voice-transcript');
  const languageSelect = document.getElementById('voice-language');
  const micStatus = document.getElementById('mic-status');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    micStatus.textContent = 'Voice input is not supported in this browser. Try Chrome.';
    startMicBtn.disabled = true;
  } else {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    let isRecording = false;

    startMicBtn.addEventListener('click', () => {
      if (isRecording) {
        recognition.stop();
        return;
      }

      recognition.lang = languageSelect.value;
      recognition.start();
    });

    recognition.addEventListener('start', () => {
      isRecording = true;
      startMicBtn.textContent = '🔴 Listening...';
      startMicBtn.classList.add('recording');
      micStatus.textContent = '';
    });

    recognition.addEventListener('result', (event) => {
      const spokenText = event.results[0][0].transcript;
      transcriptEl.value += (transcriptEl.value ? ' ' : '') + spokenText;
    });

    recognition.addEventListener('error', (event) => {
      micStatus.textContent = `Error: ${event.error}. Try again.`;
    });

    recognition.addEventListener('end', () => {
      isRecording = false;
      startMicBtn.textContent = '🎤 Start speaking';
      startMicBtn.classList.remove('recording');
    });
  }
}
// ---------- Submit product (photo + voice + details) ----------
const submitProductBtn = document.getElementById('submit-product');

if (submitProductBtn) {
  submitProductBtn.addEventListener('click', async () => {
    const statusEl = document.getElementById('submit-status');
    const photoImg = document.getElementById('captured-photo');
    const transcriptEl = document.getElementById('voice-transcript');
    const nameEl = document.getElementById('product-name');
    const priceEl = document.getElementById('product-price');

    // ---- Basic checks before sending anything ----
    if (photoImg.style.display === 'none' || !photoImg.src) {
      statusEl.textContent = 'Please capture a photo first.';
      return;
    }
    if (!nameEl.value || !priceEl.value) {
      statusEl.textContent = 'Please fill in the product name and price.';
      return;
    }

    const payload = {
      name: nameEl.value,
      price: Number(priceEl.value),
      description: transcriptEl.value,
      photo: photoImg.src, // base64 image string from the canvas capture
      language: document.getElementById('voice-language').value
    };

    submitProductBtn.disabled = true;
    statusEl.textContent = 'Submitting product...';

    try {
      if (DEMO_MODE) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Product payload (demo mode):', payload);
        statusEl.textContent = 'Product submitted (demo mode)! Check the console to see the data.';
        return;
      }

      // ---- Real call to your friend's backend ----
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Upload failed');
      statusEl.textContent = 'Product submitted successfully!';

    } catch (err) {
      statusEl.textContent = 'Something went wrong. Please try again.';
    } finally {
      submitProductBtn.disabled = false;
    }
  });
}
// ---------- Auth tab switching (shared by login & signup) ----------
const authTabs = document.querySelectorAll('.auth-tab');

if (authTabs.length > 0) {
  let selectedRole = 'buyer'; // default

  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      authTabs.forEach(t => t.classList.remove('active-tab'));
      tab.classList.add('active-tab');
      selectedRole = tab.dataset.role;

      // Update submit button text on whichever page we're on
      const loginBtn = document.getElementById('login-submit');
      const signupBtn = document.getElementById('signup-submit');
      const artisanFields = document.getElementById('artisan-only-fields');

      if (loginBtn) {
        loginBtn.textContent = `Log in as ${capitalize(selectedRole)}`;
      }
      if (signupBtn) {
        signupBtn.textContent = `Sign up as ${capitalize(selectedRole)}`;
      }
      if (artisanFields) {
        artisanFields.style.display = selectedRole === 'artisan' ? 'block' : 'none';
      }
    });
  });

  function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
}

// ---------- Login form (demo mode) ----------
const loginForm = document.getElementById('login-form');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById('login-status');
    statusEl.textContent = 'Logging in...';

    await new Promise(resolve => setTimeout(resolve, 800));

    const email = document.getElementById('login-email').value;
    localStorage.setItem('kk-user', JSON.stringify({ email, role: 'buyer' }));
    statusEl.textContent = 'Logged in (demo mode)!';
    updateAuthNav();
  });
}

// ---------- Signup form (demo mode) ----------
const signupForm = document.getElementById('signup-form');

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById('signup-status');
    statusEl.textContent = 'Creating your account...';

    await new Promise(resolve => setTimeout(resolve, 800));

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    localStorage.setItem('kk-user', JSON.stringify({ name, email, role: 'buyer' }));
    statusEl.textContent = 'Account created (demo mode)!';
    updateAuthNav();
  });
}
// ---------- Reflect logged-in state in the nav ----------
function updateAuthNav() {
  const authNavItem = document.getElementById('auth-nav-item');
  if (!authNavItem) return;

  const userData = localStorage.getItem('kk-user');

  if (userData) {
    const user = JSON.parse(userData);
    const displayName = user.name || user.email.split('@')[0];

    authNavItem.innerHTML = `
      <a href="profile.html">${displayName}</a> ·
      <a href="#" id="logout-link">Log out</a>
    `;

    document.getElementById('logout-link').addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('kk-user');
      updateAuthNav();
      window.location.href = 'index.html';
    });

  } else {
    authNavItem.innerHTML = `<a href="login.html">Log in</a>`;
  }
}

updateAuthNav();
// ---------- Render product detail page ----------
function renderProductDetail() {
  const contentEl = document.getElementById('product-content');
  if (!contentEl) return; // not on the product page

  const notFoundEl = document.getElementById('product-not-found');

  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  const product = PRODUCTS.find(p => p.id === productId);

  if (!product) {
    notFoundEl.style.display = 'block';
    contentEl.style.display = 'none';
    return;
  }

  document.getElementById('pd-media').textContent = product.emoji;
  document.getElementById('pd-origin').textContent = product.origin;
  document.getElementById('pd-name').textContent = product.name;
  document.getElementById('pd-price').textContent = `₹${product.price.toLocaleString('en-IN')}`;
  document.getElementById('pd-desc').textContent = product.description;

  contentEl.style.display = 'block';
  notFoundEl.style.display = 'none';

  document.getElementById('pd-add-to-bag').addEventListener('click', () => {
    addToCart({ id: product.id, name: product.name, price: product.price });
    document.getElementById('pd-add-to-bag').textContent = 'Added ✓';
  });
}

renderProductDetail();
// ---------- Render shop grid (from PRODUCTS array) ----------
function renderShopGrid(productsToShow) {
  const gridEl = document.getElementById('product-grid-container');
  if (!gridEl) return; // not on the shop page

  if (productsToShow.length === 0) {
    gridEl.innerHTML = '<p class="no-results">No products match your search.</p>';
    return;
  }

    gridEl.innerHTML = productsToShow.map(product => `
    <article class="product-card" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}">
      <a href="product.html?id=${product.id}" class="product-card-link">
        <div class="product-media">${product.emoji}</div>
        <h3>${product.name}</h3>
        <p class="product-origin">${product.origin}</p>
      </a>
      <div class="product-footer" data-id="${product.id}">
        <span class="product-price">₹${product.price.toLocaleString('en-IN')}</span>
        <button class="add-to-bag" data-id="${product.id}">Add to bag</button>
      </div>
    </article>
  `).join('');

  // Re-attach Add to bag listeners every time we re-render
  document.querySelectorAll('.add-to-bag').forEach(button => {
    button.addEventListener('click', () => {
      const product = PRODUCTS.find(p => p.id === button.dataset.id);
      addToCart({ id: product.id, name: product.name, price: product.price });
    });
  });
}

// ---------- Filtering and searching logic ----------
function applyShopFilters() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return; // not on the shop page

  const searchTerm = searchInput.value.toLowerCase();
  const region = document.getElementById('filter-region').value;
  const sortOrder = document.getElementById('sort-price').value;

  let results = PRODUCTS.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm);
    const matchesRegion = region === '' || product.origin.includes(region);
    return matchesSearch && matchesRegion;
  });

  if (sortOrder === 'low-high') {
    results = results.sort((a, b) => a.price - b.price);
  } else if (sortOrder === 'high-low') {
    results = results.sort((a, b) => b.price - a.price);
  }

  renderShopGrid(results);
}

const searchInputEl = document.getElementById('search-input');
if (searchInputEl) {
  document.getElementById('search-input').addEventListener('input', applyShopFilters);
  document.getElementById('filter-region').addEventListener('change', applyShopFilters);
  document.getElementById('sort-price').addEventListener('change', applyShopFilters);

  applyShopFilters(); // initial render on page load
}
// ---------- Render profile page ----------
function renderProfilePage() {
  const contentEl = document.getElementById('profile-content');
  if (!contentEl) return; // not on the profile page

  const lockedEl = document.getElementById('profile-locked');
  const userData = localStorage.getItem('kk-user');

  if (!userData) {
    lockedEl.style.display = 'block';
    contentEl.style.display = 'none';
    return;
  }

  const user = JSON.parse(userData);
  const displayName = user.name || user.email.split('@')[0];

  document.getElementById('profile-avatar').textContent = displayName.charAt(0).toUpperCase();
  document.getElementById('profile-name').textContent = displayName;
  document.getElementById('profile-email').textContent = user.email;
  document.getElementById('profile-role').textContent = user.role || 'buyer';

  const orders = JSON.parse(localStorage.getItem('kk-orders') || '[]');
  const ordersListEl = document.getElementById('orders-list');
  const ordersEmptyEl = document.getElementById('orders-empty');

  if (orders.length === 0) {
    ordersEmptyEl.style.display = 'block';
    ordersListEl.innerHTML = '';
  } else {
    ordersEmptyEl.style.display = 'none';
    ordersListEl.innerHTML = orders.map(order => `
      <div class="order-card">
        <div class="order-card-top">
          <span>${order.date}</span>
          <span>₹${order.total.toLocaleString('en-IN')}</span>
        </div>
        <div class="order-card-items">
          ${order.items.map(item => `${item.name} × ${item.qty}`).join(', ')}
        </div>
      </div>
    `).join('');
  }

  lockedEl.style.display = 'none';
  contentEl.style.display = 'block';
}

renderProfilePage();