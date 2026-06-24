// Data API — uses Supabase directly for products, categories, cart, orders, reviews
// Auth is handled automatically via @supabase/supabase-js session management

import { supabase } from '../lib/supabase';

// ── Categories ──────────────────────────────────────────────
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data;
}

// ── Products ────────────────────────────────────────────────
export async function getProducts({ page = 1, perPage = 12, category, search, sort = 'created_at', order = 'desc' } = {}) {
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const sortField = sort === 'price' ? 'price' : sort === 'name' ? 'name' : 'created_at';

  let query = supabase
    .from('products')
    .select('*, categories(name, slug)', { count: 'exact' })
    .eq('active', true)
    .order(sortField, { ascending: order === 'asc' })
    .range(from, to);

  if (category) {
    query = query.not('categories', 'is', null).eq('categories.slug', category);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  return { data, total: count };
}

export async function getProduct(id) {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getProductBySlug(slug) {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getFeaturedProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('featured', true)
    .eq('active', true)
    .limit(8);
  if (error) throw error;
  return data;
}

// ── Cart ────────────────────────────────────────────────────
// Cart helpers transparently use a localStorage-backed guest cart
// when there is no authenticated user, and the Supabase cart_items
// table when signed in. On login the guest cart is merged into the
// server cart and the local copy is cleared (see mergeGuestCart).

const GUEST_CART_KEY = 'mecville_cart';

// Get the current user's ID from the Supabase session, or null when logged out.
async function getCurrentUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

// Dispatch a storage event so other tabs/components (e.g. Header cart badge)
// can react to guest-cart changes. The native 'storage' event only fires
// across tabs, so we fire a same-tab synthetic event as well.
function notifyGuestCartChange() {
  window.dispatchEvent(new CustomEvent('mecville-cart-change'));
}

function readGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeGuestCart(items) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    notifyGuestCartChange();
  } catch {
    /* storage may be unavailable (private mode) — fail silently */
  }
}

// Fetch a single product's public fields for the guest cart (no auth needed).
async function fetchProductForCart(productId) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, price, stock, images, active')
    .eq('id', productId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function shapeGuestCart(items) {
  const cart = items.map(i => ({
    key: `local-${i.product_id}`,
    id: i.product_id,
    product_id: i.product_id,
    name: i.name,
    slug: i.slug,
    quantity: i.quantity,
    price: Number(i.price),
    stock: i.stock,
    image: i.image || '',
    images: i.images || [],
  }));
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return {
    items: cart,
    totals: { total_items: subtotal * 100, total_price: subtotal * 100 },
  };
}

export async function getCart() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return shapeGuestCart(readGuestCart());
  }

  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      quantity,
      product_id,
      products!inner (
        id, name, slug, price, stock, images, active
      )
    `)
    .eq('user_id', userId);
  if (error) throw error;

  const items = (data || []).map(item => ({
    key: item.id.toString(),
    id: item.product_id,
    product_id: item.product_id,
    name: item.products.name,
    slug: item.products.slug,
    quantity: item.quantity,
    price: Number(item.products.price),
    stock: item.products.stock,
    image: item.products.images?.[0]?.src || '',
    images: item.products.images || [],
  }));

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return {
    items,
    totals: {
      total_items: subtotal * 100,
      total_price: subtotal * 100,
    },
  };
}

export async function addToCart(productId, quantity = 1) {
  const userId = await getCurrentUserId();
  if (!userId) {
    const items = readGuestCart();
    const existing = items.find(i => i.product_id === productId);
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + quantity);
    } else {
      const p = await fetchProductForCart(productId);
      if (!p) throw new Error('Product not found');
      if (!p.active) throw new Error('This product is no longer available');
      items.push({
        product_id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        stock: p.stock,
        image: p.images?.[0]?.src || '',
        images: p.images || [],
        quantity: Math.min(99, quantity),
      });
    }
    writeGuestCart(items);
    return shapeGuestCart(items);
  }

  // Check if already in cart (scoped to this user)
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id)
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('cart_items')
      .insert({ user_id: userId, product_id: productId, quantity });
    if (error) throw error;
  }

  return getCart();
}

export async function updateCartItem(itemId, quantity) {
  const userId = await getCurrentUserId();
  if (!userId) {
    const productId = Number(String(itemId).replace(/^local-/, ''));
    const items = readGuestCart();
    const row = items.find(i => i.product_id === productId);
    if (row) row.quantity = Math.max(1, Math.min(99, quantity));
    writeGuestCart(items);
    return shapeGuestCart(items);
  }

  const { error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', itemId)
    .eq('user_id', userId);
  if (error) throw error;
  return getCart();
}

export async function removeCartItem(itemId) {
  const userId = await getCurrentUserId();
  if (!userId) {
    const productId = Number(String(itemId).replace(/^local-/, ''));
    const items = readGuestCart().filter(i => i.product_id !== productId);
    writeGuestCart(items);
    return shapeGuestCart(items);
  }

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId);
  if (error) throw error;
  return getCart();
}

// Merge a persisted guest cart into the authenticated user's server cart,
// then clear the local copy. Call this on successful sign-in.
export async function mergeGuestCart() {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const guestItems = readGuestCart();
  if (!guestItems.length) return;

  for (const gi of guestItems) {
    const { data: existing } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('product_id', gi.product_id)
      .maybeSingle();
    if (existing) {
      await supabase
        .from('cart_items')
        .update({ quantity: Math.min(99, existing.quantity + gi.quantity) })
        .eq('id', existing.id)
        .eq('user_id', userId);
    } else {
      await supabase
        .from('cart_items')
        .insert({ user_id: userId, product_id: gi.product_id, quantity: gi.quantity });
    }
  }
  localStorage.removeItem(GUEST_CART_KEY);
  notifyGuestCartChange();
}

// Read-only access to the raw guest cart for the Header badge (no async).
export function getGuestCartCount() {
  return readGuestCart().reduce((sum, i) => sum + i.quantity, 0);
}

// ── Orders ──────────────────────────────────────────────────
export async function getOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getOrder(id) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// ── Reviews ─────────────────────────────────────────────────
export async function getReviews(productId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profiles(first_name, last_name)')
    .eq('product_id', productId)
    .eq('active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createReview(productId, review) {
  const { data, error } = await supabase
    .from('reviews')
    .insert({ product_id: productId, ...review, active: false })
    .select()
    .single();
  if (error) throw error;
  return data;
}
