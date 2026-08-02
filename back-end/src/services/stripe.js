import Stripe from 'stripe';
import dotenv from 'dotenv';
import { AppError } from '../utils/errors.js';
dotenv.config();

/**
 * Convert a Stripe SDK error into a generic, client-safe AppError.
 * Stripe errors carry a `type`, `code`, and `statusCode`. Without this
 * mapping, an invalid API key surfaces to the client as
 * "Invalid API Key provided: sk_test_...-key" — leaking the key prefix.
 */
function mapStripeError(err) {
  if (err instanceof AppError) return err;
  if (err?.type === 'StripeAuthenticationError' ||
      err?.code === 'authentication_error' ||
      err?.code === 'invalid_api_key' ||
      /invalid api key/i.test(err?.message || '')) {
    return new AppError('Payment processor is not configured. Please contact support.', 503, 'PAYMENT_CONFIG_ERROR');
  }
  if (err?.type === 'StripeCardError' || err?.code === 'card_error') {
    return new AppError(err.message || 'Your card was declined.', 402, 'CARD_DECLINED');
  }
  if (err?.type === 'StripeRateLimitError') {
    return new AppError('Payment processor is busy. Please try again shortly.', 429, 'PAYMENT_RATE_LIMITED');
  }
  // Any other Stripe error — don't leak internal details to the client.
  return new AppError('Payment could not be processed. Please try again.', 502, 'PAYMENT_ERROR');
}

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.warn('Missing STRIPE_SECRET_KEY in .env - Stripe features will fail at runtime');
}

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
  : null;

export async function createPaymentIntent(order, idempotencyKey) {
  if (!stripe) throw new AppError('Stripe is not configured', 503, 'PAYMENT_CONFIG_ERROR');
  try {
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
  } catch (err) {
    throw mapStripeError(err);
  }
}

export async function confirmPayment(paymentId) {
  if (!stripe) throw new AppError('Stripe is not configured', 503, 'PAYMENT_CONFIG_ERROR');
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentId);
    return intent;
  } catch (err) {
    throw mapStripeError(err);
  }
}

export async function createRefund(paymentId, amount) {
  if (!stripe) throw new AppError('Stripe is not configured', 503, 'PAYMENT_CONFIG_ERROR');
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });
    return refund;
  } catch (err) {
    throw mapStripeError(err);
  }
}

export async function constructWebhookEvent(body, signature) {
  if (!stripe) throw new AppError('Stripe is not configured', 503, 'PAYMENT_CONFIG_ERROR');
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (err) {
    throw mapStripeError(err);
  }
}

export { stripe };
