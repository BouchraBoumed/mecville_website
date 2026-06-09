import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { supabase } from '../config/supabase.js';

const router = Router();

router.use(requireAuth, requireAdmin, apiLimiter);

const ALLOWED_PRODUCT_FIELDS = [
  'name', 'slug', 'description', 'short_description', 'price',
  'compare_price', 'sku', 'stock', 'stock_alert', 'category_id',
  'images', 'attributes', 'featured', 'active',
];

function pickAllowed(obj, allowed) {
  const result = {};
  for (const key of allowed) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

router.get('/stats', async (req, res, next) => {
  try {
    const [
      { count: totalProducts },
      { count: totalOrders },
      { count: totalCustomers },
      { count: totalMessages },
      { data: revenueData },
      { data: recentOrders },
      { data: lowStock },
    ] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
      supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('read', false),
      supabase.from('orders').select('total').eq('payment_status', 'paid'),
      supabase.from('orders')
        .select('id, order_number, total, status, payment_status, created_at, email')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('products')
        .select('id, name, sku, stock, stock_alert')
        .order('stock', { ascending: true })
        .limit(20),
    ]);

    const totalRevenue = revenueData?.reduce((sum, o) => sum + Number(o.total), 0) || 0;

    res.json({
      totalProducts,
      totalOrders,
      totalCustomers,
      unreadMessages: totalMessages,
      totalRevenue,
      recentOrders,
      lowStock: lowStock || [],
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders — List all orders
router.get('/orders', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({
      orders: data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/orders/:id — Update order status
router.patch('/orders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, tracking_number } = req.body;

    const update = {};
    if (status) update.status = status;
    if (tracking_number !== undefined) update.tracking_number = tracking_number;

    const { data, error } = await supabase
      .from('orders')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/products — List all products (including inactive)
router.get('/products', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabase
      .from('products')
      .select('*, categories(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      products: data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/products — Create product
router.post('/products', async (req, res, next) => {
  try {
    const product = pickAllowed(req.body, ALLOWED_PRODUCT_FIELDS);
    if (!product.name || !product.slug) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name and slug are required' } });
    }
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/products/:id — Update product
router.patch('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = pickAllowed(req.body, ALLOWED_PRODUCT_FIELDS);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/products/:id — Soft-delete (set active=false)
router.delete('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('products')
      .update({ active: false })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/customers — List customers
router.get('/customers', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabase
      .from('profiles')
      .select('*, orders!inner(id)', { count: 'exact' })
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get order counts and totals per customer
    const customersWithStats = await Promise.all(
      (data || []).map(async (customer) => {
        const { data: orders } = await supabase
          .from('orders')
          .select('total')
          .eq('user_id', customer.id)
          .eq('payment_status', 'paid');

        const totalSpent = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
        const orderCount = orders?.length || 0;

        return { ...customer, total_spent: totalSpent, order_count: orderCount };
      })
    );

    res.json({
      customers: customersWithStats,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/messages — Contact messages
router.get('/messages', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabase
      .from('contact_messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      messages: data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/messages/:id — Mark message as read
router.patch('/messages/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { read } = req.body;

    const { error } = await supabase
      .from('contact_messages')
      .update({ read: read ?? true })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reviews — List all reviews (pending approval)
router.get('/reviews', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const active = req.query.active;

    let query = supabase
      .from('reviews')
      .select('*, profiles(first_name, last_name), products(name, slug)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (active !== undefined) {
      query = query.eq('active', active === 'true');
    }

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({
      reviews: data,
      pagination: { page, limit, total: count, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/reviews/:id — Approve/reject review
router.patch('/reviews/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const { data, error } = await supabase
      .from('reviews')
      .update({ active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
