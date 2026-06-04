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
export async function getCart() {
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      quantity,
      product_id,
      products!inner (
        id, name, slug, price, stock, images, active
      )
    `);
  if (error) throw error;

  // Transform to match cart-like structure
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
  // Check if already in cart
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('cart_items')
      .insert({ product_id: productId, quantity });
    if (error) throw error;
  }

  return getCart();
}

export async function updateCartItem(itemId, quantity) {
  const { error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', itemId);
  if (error) throw error;
  return getCart();
}

export async function removeCartItem(itemId) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', itemId);
  if (error) throw error;
  return getCart();
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
