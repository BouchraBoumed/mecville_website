import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';
import { supabase } from '../config/supabase.js';
import { createPaymentIntent } from '../services/stripe.js';
import { createOrder as createPayPalOrder } from '../services/paypal.js';
import { AppError } from '../utils/errors.js';

const router = Router();

// POST /api/payments/stripe/create-intent
router.post('/stripe/create-intent', requireAuth, paymentLimiter, async (req, res, next) => {
  try {
    const userId = req.user.id;

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
    const tax = 0;
    const total = subtotal + shipping_cost + tax;

    // Get user profile for billing
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        email: profile?.email || req.user.email,
        status: 'pending',
        payment_status: 'pending',
        subtotal,
        shipping_cost,
        tax,
        discount: 0,
        total,
        billing_address: {},
        shipping_address: {},
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

    // Create Stripe payment intent
    const payment = await createPaymentIntent({
      id: order.id,
      total,
      order_number: order.order_number,
    });

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
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity, name, total')
          .eq('order_id', order.id);

        for (const item of orderItems || []) {
          await supabase.rpc('decrement_stock', {
            product_id: item.product_id,
            qty: item.quantity,
          });
        }

        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', req.user.id);

        try {
          const { sendOrderConfirmation } = await import('../services/email.js');
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

    res.json({ success: false, status: intent.status });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/paypal/create-order
router.post('/paypal/create-order', requireAuth, paymentLimiter, async (req, res, next) => {
  try {
    const userId = req.user.id;

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
    const total = subtotal + shipping_cost;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    // Create order in DB
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
        tax: 0,
        discount: 0,
        total,
        billing_address: {},
        shipping_address: {},
      })
      .select()
      .single();

    const orderItems = items.map(item => ({ ...item, order_id: order.id }));
    await supabase.from('order_items').insert(orderItems);

    // Create PayPal order
    const paypalOrder = await createPayPalOrder({
      ...order,
      items,
      subtotal,
      shipping_cost,
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
        const { data: items } = await supabase
          .from('order_items')
          .select('product_id, quantity, name, total')
          .eq('order_id', order.id);

        for (const item of items || []) {
          await supabase.rpc('decrement_stock', {
            product_id: item.product_id,
            qty: item.quantity,
          });
        }

        await supabase.from('cart_items').delete().eq('user_id', req.user.id);

        try {
          const { sendOrderConfirmation } = await import('../services/email.js');
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

    res.json({ success: false, status: capture.status });
  } catch (err) {
    next(err);
  }
});

export default router;
