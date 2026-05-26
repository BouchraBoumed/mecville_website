import dotenv from 'dotenv';
dotenv.config();

const PAYPAL_API = process.env.PAYPAL_API || 'https://api-m.paypal.com';
const ENABLED = process.env.ENABLE_PAYPAL === 'true';

async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`PayPal auth failed: ${err.error_description || res.statusText}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function createOrder(order) {
  if (!ENABLED) {
    return { error: 'PayPal is disabled', disabled: true };
  }

  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: order.order_number,
        description: `Mecville Order ${order.order_number}`,
        amount: {
          currency_code: 'CAD',
          value: order.total.toFixed(2),
          breakdown: {
            item_total: {
              currency_code: 'CAD',
              value: order.subtotal.toFixed(2),
            },
            shipping: {
              currency_code: 'CAD',
              value: order.shipping_cost.toFixed(2),
            },
            tax_total: {
              currency_code: 'CAD',
              value: order.tax.toFixed(2),
            },
          },
        },
        items: order.items.map(item => ({
          name: item.name,
          unit_amount: {
            currency_code: 'CAD',
            value: item.price.toFixed(2),
          },
          quantity: item.quantity.toString(),
          category: 'PHYSICAL_GOODS',
        })),
      }],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
            landing_page: 'LOGIN',
            user_action: 'PAY_NOW',
            return_url: `${process.env.CORS_ORIGIN}/order/confirm`,
            cancel_url: `${process.env.CORS_ORIGIN}/checkout`,
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`PayPal order creation failed: ${err.message || res.statusText}`);
  }

  const data = await res.json();
  return data;
}

export async function captureOrder(orderId) {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`PayPal capture failed: ${err.message || res.statusText}`);
  }

  const data = await res.json();
  return data;
}

export async function verifyWebhook(headers, body) {
  if (!ENABLED) return false;

  const token = await getAccessToken();
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  const verification = {
    webhook_id: webhookId,
    event_type: headers['paypal-event-type'],
    event_body: body,
  };

  const res = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(verification),
  });

  if (!res.ok) return false;
  const data = await res.json();
  return data.verification_status === 'SUCCESS';
}
