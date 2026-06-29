import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { constructWebhookEvent } from '../services/stripe.js';

const router = Router();

// Stripe webhook — raw body set by express.raw() in index.js
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = await constructWebhookEvent(req.body, sig);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        await handlePaymentSuccess(paymentIntent);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        await handlePaymentFailed(paymentIntent);
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// PayPal webhook — raw body captured by express.json verify hook in app.js
router.post('/paypal', async (req, res) => {
  try {
    const { verifyWebhook } = await import('../services/paypal.js');

    // PayPal's verification API requires the raw request body string,
    // not the parsed JSON object. This is captured in app.js via the
    // express.json verify() hook and stored on req.rawBody.
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const verified = await verifyWebhook(req.headers, rawBody);

    if (!verified) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body;

    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const capture = event.resource;
        await handlePayPalCaptureCompleted(capture);
        break;
      }
      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REFUNDED': {
        const capture = event.resource;
        await handlePayPalCaptureFailed(capture);
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('PayPal webhook error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

async function handlePaymentSuccess(paymentIntent) {
  const paymentId = paymentIntent.id;
  const orderId = paymentIntent.metadata?.order_id;

  if (!orderId) return;

  await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      status: 'processing',
    })
    .eq('id', orderId)
    .eq('payment_id', paymentId);
}

async function handlePaymentFailed(paymentIntent) {
  const paymentId = paymentIntent.id;

  // Mark order as failed and cancelled
  await supabase
    .from('orders')
    .update({ payment_status: 'failed', status: 'cancelled' })
    .eq('payment_id', paymentId);

  // Restore reserved stock for this order
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
}

async function handlePayPalCaptureCompleted(capture) {
  const paypalPaymentId = capture.id;

  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('payment_id', paypalPaymentId)
    .single();

  if (order) return; // Already processed via capture endpoint

  // If not found by payment_id, try custom_id
  if (capture.custom_id) {
    await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'processing',
        payment_id: paypalPaymentId,
      })
      .eq('id', capture.custom_id);
  }
}

async function handlePayPalCaptureFailed(capture) {
  await supabase
    .from('orders')
    .update({ payment_status: 'refunded', status: 'cancelled' })
    .eq('payment_id', capture.id);

  // Restore stock for refunded/denied orders
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('payment_id', capture.id)
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
}

export default router;
