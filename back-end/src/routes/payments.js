import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';
import { supabase } from '../config/supabase.js';
import { createPaymentIntent } from '../services/stripe.js';
import { createOrder as createPayPalOrder } from '../services/paypal.js';
import { AppError } from '../utils/errors.js';
import { calculateTax } from '../utils/tax.js';
import crypto from 'crypto';

const router = Router();

/**
 * Generate a deterministic idempotency key from the user's cart contents.
 * This ensures that if the user double-clicks "Pay" or the network retries,
 * the same key is produced and Stripe deduplicates the request.
 * The key includes a 5-minute time window so a retry within 5 minutes
 * hits the same key, but a new checkout attempt after 5 minutes gets a fresh one.
 */
function generateIdempotencyKey(userId, cartItems) {
  const cartHash = cartItems
    .map(ci => `${ci.products.id}:${ci.quantity}`)
    .sort()
    .join('|');
  const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000)); // 5-minute bucket
  const raw = `${userId}:${cartHash}:${timeWindow}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 36);
}

// POST /api/payments/stripe/create-intent
router.post('/stripe/create-intent', requireAuth, paymentLimiter, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { shipping_address, billing_address } = req.body;

    // Basic address validation — shipping address is required
    if (!shipping_address || !shipping_address.address || !shipping_address.city ||
        !shipping_address.province || !shipping_address.postcode || !shipping_address.country) {
      throw new AppError('Complete shipping address is required', 400, 'VALIDATION_ERROR');
    }

    // Fetch cart items with product details
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select(`
        quantity,
        products!inner (
          id, name, price, stock, active, images
        )
      `)
      .eq('user_id', userId);

    if (cartError) throw cartError;
    if (!cartItems?.length) {
      throw new AppError('Cart is empty', 400, 'EMPTY_CART');
    }

    // Calculate totals
    let subtotal = 0;
    const items = cartItems.map(ci => {
      const p = ci.products;
      if (!p.active) throw new AppError(`Product "${p.name}" is no longer available`, 400);
      if (p.stock < ci.quantity) throw new AppError(`Insufficient stock for "${p.name}"`, 400);
      const total = Number(p.price) * ci.quantity;
      subtotal += total;
      return {
        product_id: p.id,
        name: p.name,
        price: Number(p.price),
        quantity: ci.quantity,
        total,
        image_url: p.images?.[0]?.src || null,
      };
    });

    const shipping_cost = subtotal >= 100 ? 0 : 15;
    const taxInfo = calculateTax(subtotal, shipping_address.province);
    const total = subtotal + shipping_cost + taxInfo.amount;

    // Get user profile for billing
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    // Create order in database with real addresses + tax
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        email: profile?.email || req.user.email,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'stripe',
        subtotal,
        shipping_cost,
        tax: taxInfo.amount,
        discount: 0,
        total,
        billing_address: billing_address || shipping_address,
        shipping_address,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Insert order items
    const orderItems = items.map(item => ({ ...item, order_id: order.id }));
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Reserve stock: decrement immediately so concurrent checkouts can't oversell.
    // If the payment ultimately fails, the webhook/confirm handler will restore stock.
    for (const item of items) {
      const { error: stockError } = await supabase.rpc('decrement_stock', {
        product_id: item.product_id,
        qty: item.quantity,
      });
      if (stockError) {
        // Insufficient stock — cancel the order and throw
        await supabase.from('orders').delete().eq('id', order.id);
        throw new AppError(`Insufficient stock for "${item.name}"`, 400, 'INSUFFICIENT_STOCK');
      }
    }

    // Generate idempotency key from cart contents to prevent duplicate intents
    const idempotencyKey = generateIdempotencyKey(userId, cartItems);

    // Create Stripe payment intent with idempotency key
    const payment = await createPaymentIntent(
      { id: order.id, total, order_number: order.order_number },
      idempotencyKey
    );

    // Update order with payment ID
    await supabase
      .from('orders')
      .update({ payment_id: payment.paymentId })
      .eq('id', order.id);

    res.json({
      clientSecret: payment.clientSecret,
      paymentId: payment.paymentId,
      orderId: order.id,
      orderNumber: order.order_number,
      total,
      tax: taxInfo.amount,
      taxLabel: taxInfo.label,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/stripe/confirm
router.post('/stripe/confirm', requireAuth, async (req, res, next) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) throw new AppError('paymentId is required', 400);
    const userId = req.user.id;

    const { confirmPayment } = await import('../services/stripe.js');
    const intent = await confirmPayment(paymentId);

    if (intent.status === 'succeeded') {
      const { data: order } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'processing',
        })
        .eq('payment_id', paymentId)
        .eq('user_id', userId)
        .select()
        .single();

      if (order) {
        // Stock was already reserved at intent creation — no decrement needed here.
        // Clear the user's cart since the payment succeeded.
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', req.user.id);

        try {
          const { sendOrderConfirmation } = await import('../services/email.js');
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('product_id, quantity, name, total')
            .eq('order_id', order.id);
          await sendOrderConfirmation({
            ...order,
            items: orderItems || [],
            subtotal: order.subtotal || orderItems?.reduce((s, i) => s + Number(i.total), 0) || 0,
            shipping_cost: order.shipping_cost || 0,
          });
        } catch { /* email failure is non-critical */ }
      }

      return res.json({ success: true, order });
    }

    // Payment did not succeed — restore the reserved stock
    if (intent.status === 'canceled' || intent.status === 'requires_payment_method') {
      await restoreStockForOrder(paymentId);
    }

    res.json({ success: false, status: intent.status });
  } catch (err) {
    next(err);
  }
});

/**
 * Restore stock for an order whose payment failed or was cancelled.
 * Looks up order items by payment_id and increments stock back.
 */
async function restoreStockForOrder(paymentId) {
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('payment_id', paymentId)
    .maybeSingle();

  if (!order) return;

  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', order.id);

  for (const item of items || []) {
    await supabase.rpc('increment_stock', {
      product_id: item.product_id,
      qty: item.quantity,
    });
  }

  // Mark order as cancelled
  await supabase
    .from('orders')
    .update({ status: 'cancelled', payment_status: 'failed' })
    .eq('id', order.id);
}

// POST /api/payments/paypal/create-order
router.post('/paypal/create-order', requireAuth, paymentLimiter, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { shipping_address, billing_address } = req.body;

    // Basic address validation
    if (!shipping_address || !shipping_address.address || !shipping_address.city ||
        !shipping_address.province || !shipping_address.postcode || !shipping_address.country) {
      throw new AppError('Complete shipping address is required', 400, 'VALIDATION_ERROR');
    }

    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select(`
        quantity,
        products!inner (
          id, name, price, stock, active, images
        )
      `)
      .eq('user_id', userId);

    if (cartError) throw cartError;
    if (!cartItems?.length) throw new AppError('Cart is empty', 400, 'EMPTY_CART');

    let subtotal = 0;
    const items = cartItems.map(ci => {
      const p = ci.products;
      if (!p.active) throw new AppError(`Product "${p.name}" is no longer available`, 400);
      if (p.stock < ci.quantity) throw new AppError(`Insufficient stock for "${p.name}"`, 400);
      const total = Number(p.price) * ci.quantity;
      subtotal += total;
      return {
        product_id: p.id,
        name: p.name,
        price: Number(p.price),
        quantity: ci.quantity,
        total,
        image_url: p.images?.[0]?.src || null,
      };
    });

    const shipping_cost = subtotal >= 100 ? 0 : 15;
    const taxInfo = calculateTax(subtotal, shipping_address.province);
    const total = subtotal + shipping_cost + taxInfo.amount;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    // Create order in DB with real addresses + tax
    const { data: order } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        email: profile?.email || req.user.email,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'paypal',
        subtotal,
        shipping_cost,
        tax: taxInfo.amount,
        discount: 0,
        total,
        billing_address: billing_address || shipping_address,
        shipping_address,
      })
      .select()
      .single();

    const orderItems = items.map(item => ({ ...item, order_id: order.id }));
    await supabase.from('order_items').insert(orderItems);

    // Reserve stock: decrement immediately so concurrent checkouts can't oversell.
    // If the PayPal payment ultimately fails, the webhook handler will restore stock.
    for (const item of items) {
      const { error: stockError } = await supabase.rpc('decrement_stock', {
        product_id: item.product_id,
        qty: item.quantity,
      });
      if (stockError) {
        await supabase.from('orders').delete().eq('id', order.id);
        throw new AppError(`Insufficient stock for "${item.name}"`, 400, 'INSUFFICIENT_STOCK');
      }
    }

    // Create PayPal order
    const paypalOrder = await createPayPalOrder({
      ...order,
      items,
      subtotal,
      shipping_cost,
      tax: taxInfo.amount,
      total,
    });

    if (paypalOrder?.error?.disabled) {
      throw new AppError('PayPal is not configured', 503, 'PAYPAL_DISABLED');
    }

    // Find the approval URL
    const approvalUrl = paypalOrder.links?.find(l => l.rel === 'approve')?.href;

    res.json({
      paypalOrderId: paypalOrder.id,
      approvalUrl,
      orderId: order.id,
      orderNumber: order.order_number,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/paypal/capture
router.post('/paypal/capture', requireAuth, async (req, res, next) => {
  try {
    const { paypalOrderId } = req.body;
    if (!paypalOrderId) throw new AppError('paypalOrderId is required', 400);

    const { captureOrder } = await import('../services/paypal.js');
    const capture = await captureOrder(paypalOrderId);

    if (capture.status === 'COMPLETED') {
      const paypalPaymentId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id;

      const { data: order } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'processing',
          payment_id: paypalPaymentId,
        })
        .eq('user_id', req.user.id)
        .eq('payment_method', 'paypal')
        .is('payment_id', null)
        .select()
        .single();

      if (order) {
        // Stock was already reserved at order creation — no decrement needed here.
        // Clear the user's cart since the payment succeeded.
        await supabase.from('cart_items').delete().eq('user_id', req.user.id);

        try {
          const { sendOrderConfirmation } = await import('../services/email.js');
          const { data: items } = await supabase
            .from('order_items')
            .select('product_id, quantity, name, total')
            .eq('order_id', order.id);
          await sendOrderConfirmation({
            ...order,
            items: items || [],
            subtotal: order.subtotal || items?.reduce((s, i) => s + Number(i.total), 0) || 0,
            shipping_cost: order.shipping_cost || 0,
          });
        } catch { /* non-critical */ }
      }

      return res.json({ success: true, order });
    }

    // PayPal payment did not complete — restore reserved stock
    await restoreStockForPayPalOrder(paypalOrderId, req.user.id);

    res.json({ success: false, status: capture.status });
  } catch (err) {
    next(err);
  }
});

/**
 * Restore stock for a PayPal order whose capture failed.
 */
async function restoreStockForPayPalOrder(paypalOrderId, userId) {
  // Find the order by the pending PayPal order reference
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('user_id', userId)
    .eq('payment_method', 'paypal')
    .eq('payment_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!order) return;

  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', order.id);

  for (const item of items || []) {
    await supabase.rpc('increment_stock', {
      product_id: item.product_id,
      qty: item.quantity,
    });
  }

  await supabase
    .from('orders')
    .update({ status: 'cancelled', payment_status: 'failed' })
    .eq('id', order.id);
}

export default router;
