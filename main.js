// ---------- Cart helpers ----------
// ---------- Backend config — SWAP THESE once your friend gives you real values ----------
const API_BASE_URL = 'https://your-backend-url.example.com'; // TODO: replace
const RAZORPAY_KEY_ID = 'rzp_test_XXXXXXXXXXXX'; // TODO: replace with her public key ID
const DEMO_MODE = true; // TODO: set to false once the real backend is connected
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
        // ---- Fake a short delay, then simulate success ----
        await new Promise(resolve => setTimeout(resolve, 1200));
        statusEl.textContent = 'Payment successful (demo mode). Order placed!';
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