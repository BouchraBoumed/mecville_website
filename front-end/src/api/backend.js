// API layer for the Mecville Express backend (payments, contact, admin)
// Products, cart, and auth use Supabase directly via the JS client.

import { supabase } from '../lib/supabase';

const API = '/api';

/**
 * Get the current session's access token via the Supabase client.
 * This is resilient to Supabase SDK storage format changes —
 * the SDK manages token refresh and storage internals for us.
 */
async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function request(path, options = {}) {
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Payments (Stripe) ─────────────────────────────────────────
export async function createStripePaymentIntent(shippingAddress, billingAddress) {
  return request('/payments/stripe/create-intent', {
    method: 'POST',
    body: JSON.stringify({
      shipping_address: shippingAddress,
      billing_address: billingAddress || shippingAddress,
    }),
  });
}

export async function confirmStripePayment(paymentId) {
  return request('/payments/stripe/confirm', {
    method: 'POST',
    body: JSON.stringify({ paymentId }),
  });
}

// ── Payments (PayPal) ─────────────────────────────────────────
export async function createPayPalOrder(shippingAddress, billingAddress) {
  return request('/payments/paypal/create-order', {
    method: 'POST',
    body: JSON.stringify({
      shipping_address: shippingAddress,
      billing_address: billingAddress || shippingAddress,
    }),
  });
}

export async function capturePayPalOrder(paypalOrderId) {
  return request('/payments/paypal/capture', {
    method: 'POST',
    body: JSON.stringify({ paypalOrderId }),
  });
}

// ── Contact Form ──────────────────────────────────────────────
export async function submitContactForm(data) {
  return request('/contact', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Admin ─────────────────────────────────────────────────────
export async function getAdminStats() {
  return request('/admin/stats');
}

export async function getAdminOrders(page = 1, status) {
  const params = new URLSearchParams({ page });
  if (status) params.set('status', status);
  return request(`/admin/orders?${params}`);
}

export async function updateOrderStatus(id, data) {
  return request(`/admin/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getAdminProducts(page = 1) {
  return request(`/admin/products?page=${page}`);
}

export async function createProduct(data) {
  return request('/admin/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProduct(id, data) {
  return request(`/admin/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(id) {
  return request(`/admin/products/${id}`, { method: 'DELETE' });
}

export async function getAdminCustomers(page = 1) {
  return request(`/admin/customers?page=${page}`);
}

export async function getAdminMessages(page = 1) {
  return request(`/admin/messages?page=${page}`);
}

export async function markMessageRead(id) {
  return request(`/admin/messages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ read: true }),
  });
}

export async function getAdminReviews(page = 1, active) {
  const params = new URLSearchParams({ page });
  if (active !== undefined) params.set('active', active);
  return request(`/admin/reviews?${params}`);
}

export async function updateReview(id, active) {
  return request(`/admin/reviews/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}
