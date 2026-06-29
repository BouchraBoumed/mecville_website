import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.warn('Missing STRIPE_SECRET_KEY in .env - Stripe features will fail at runtime');
}

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
  : null;

export async function createPaymentIntent(order, idempotencyKey) {
  if (!stripe) throw new Error('Stripe is not configured');
  const intent = await stripe.paymentIntents.create(
    {
      amount: Math.round(order.total * 100),
      currency: 'cad',
      metadata: {
        order_id: order.id.toString(),
        order_number: order.order_number,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    },
    idempotencyKey ? { idempotencyKey } : undefined
  );

  return {
    clientSecret: intent.client_secret,
    paymentId: intent.id,
  };
}

export async function confirmPayment(paymentId) {
  if (!stripe) throw new Error('Stripe is not configured');
  const intent = await stripe.paymentIntents.retrieve(paymentId);
  return intent;
}

export async function createRefund(paymentId, amount) {
  if (!stripe) throw new Error('Stripe is not configured');
  const refund = await stripe.refunds.create({
    payment_intent: paymentId,
    amount: amount ? Math.round(amount * 100) : undefined,
  });
  return refund;
}

export async function constructWebhookEvent(body, signature) {
  if (!stripe) throw new Error('Stripe is not configured');
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  return event;
}

export { stripe };
