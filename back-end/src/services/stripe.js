import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createPaymentIntent(order) {
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(order.total * 100),
    currency: 'cad',
    metadata: {
      order_id: order.id.toString(),
      order_number: order.order_number,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return {
    clientSecret: intent.client_secret,
    paymentId: intent.id,
  };
}

export async function confirmPayment(paymentId) {
  const intent = await stripe.paymentIntents.retrieve(paymentId);
  return intent;
}

export async function createRefund(paymentId, amount) {
  const refund = await stripe.refunds.create({
    payment_intent: paymentId,
    amount: amount ? Math.round(amount * 100) : undefined,
  });
  return refund;
}

export async function constructWebhookEvent(body, signature) {
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  return event;
}

export { stripe };
