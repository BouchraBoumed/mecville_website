const API = '/wp-json/wc/v3';
const STORE_API = '/wp-json/wc/store/v1';

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// Products
export async function getProducts({ page = 1, perPage = 12, category, search } = {}) {
  const params = new URLSearchParams({ page, per_page: perPage });
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  return fetchJSON(`${API}/products?${params}`);
}

export async function getProduct(id) {
  return fetchJSON(`${API}/products/${id}`);
}

export async function getProductBySlug(slug) {
  const products = await fetchJSON(`${API}/products?slug=${slug}`);
  return products[0] || null;
}

// Categories
export async function getCategories() {
  return fetchJSON(`${API}/products/categories?per_page=50`);
}

// Featured products
export async function getFeaturedProducts() {
  return fetchJSON(`${API}/products?featured=true&per_page=8`);
}

// Cart (Store API)
export async function getCart() {
  return fetchJSON(`${STORE_API}/cart`, { credentials: 'include' });
}

export async function addToCart(productId, quantity = 1, variation = {}) {
  return fetchJSON(`${STORE_API}/cart/add-item`, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ id: productId, quantity, variation }),
  });
}

export async function updateCartItem(itemKey, quantity) {
  return fetchJSON(`${STORE_API}/cart/update-item`, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ key: itemKey, quantity }),
  });
}

export async function removeCartItem(itemKey) {
  return fetchJSON(`${STORE_API}/cart/remove-item`, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ key: itemKey }),
  });
}

// Checkout
export async function submitOrder(orderData) {
  const nonceRes = await fetchJSON(`${STORE_API}/cart`);
  const nonce = nonceRes?.nonce || '';
  return fetchJSON(`${STORE_API}/checkout`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-WC-Store-API-Nonce': nonce,
    },
    body: JSON.stringify(orderData),
  });
}
