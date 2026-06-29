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
        custom_id: order.id?.toString() || order.order_number,
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
              value: (order.tax || 0).toFixed(2),
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

/**
 * Verify a PayPal webhook signature.
 *
 * @param {Object} headers - The request headers (must include paypal headers)
 * @param {string} rawBody - The RAW request body as a string (NOT parsed JSON)
 * @returns {Promise<boolean>}
 */
export async function verifyWebhook(headers, rawBody) {
  if (!ENABLED) return false;

  const token = await getAccessToken();
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!webhookId) {
    console.error('Missing PAYPAL_WEBHOOK_ID in .env — cannot verify webhook');
    return false;
  }

  // PayPal's verification API requires these transmission headers
  // along with the raw event body string for cryptographic verification.
  const verification = {
    auth_algo: headers['paypal-auth-algo'],
    cert_url: headers['paypal-cert-url'],
    transmission_id: headers['paypal-transmission-id'],
    transmission_sig: headers['paypal-transmission-sig'],
    transmission_time: headers['paypal-transmission-time'],
    webhook_id: webhookId,
    event_body: typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody),
  };

  const res = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(verification),
  });

  if (!res.ok) {
    console.error('PayPal webhook verification request failed:', res.status);
    return false;
  }

  const data = await res.json();
  return data.verification_status === 'SUCCESS';
}
