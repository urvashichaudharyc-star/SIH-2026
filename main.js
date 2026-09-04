// ---------- Cart helpers ----------
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