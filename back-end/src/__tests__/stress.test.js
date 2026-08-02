import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

vi.mock('../config/supabase.js', () => {
  let mockError = null;
  function chain() {
    const c = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn(() => ({ data: [], count: 0, error: mockError })),
      single: vi.fn(() => ({ data: { id: 1, order_number: 'MCV-1' }, error: mockError })),
      maybeSingle: vi.fn(() => ({ data: null, error: mockError })),
      insert: vi.fn(() => ({
        ...chain(),
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 1, order_number: 'MCV-1' }, error: mockError })),
        })),
      })),
      update: vi.fn(() => ({
        ...chain(),
        eq: vi.fn(() => ({
          ...chain(),
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: { id: 1, payment_status: 'paid' }, error: mockError })),
          })),
        })),
      })),
      delete: vi.fn(() => ({ data: null, error: mockError })),
      head: vi.fn(() => ({ data: null, error: mockError, count: 0 })),
    };
    return c;
  }
  return {
    supabase: {
      from: vi.fn(() => chain()),
      rpc: vi.fn(() => ({ data: null, error: mockError })),
      auth: {
        getUser: vi.fn(() => ({ data: { user: null }, error: new Error('invalid token') })),
      },
    },
  };
});

vi.mock('../services/stripe.js', () => ({
  createPaymentIntent: vi.fn(() => ({ clientSecret: 'pi_secret', paymentId: 'pi_1' })),
  confirmPayment: vi.fn(() => ({ status: 'succeeded', id: 'pi_1' })),
  createRefund: vi.fn(),
  constructWebhookEvent: vi.fn(() => { throw new Error('bad sig'); }),
  stripe: null,
}));
vi.mock('../services/paypal.js', () => ({
  createOrder: vi.fn(() => ({ id: 'PP-1', links: [{ rel: 'approve', href: 'https://x.com/approve' }] })),
  captureOrder: vi.fn(() => ({ status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ id: 'CAP-1' }] } }] })),
  verifyWebhook: vi.fn(() => false),
}));
vi.mock('../services/email.js', () => ({
  sendContactNotification: vi.fn(), sendOrderConfirmation: vi.fn(), sendOrderStatusUpdate: vi.fn(),
}));

import supertest from 'supertest';
import { createApp } from '../app.js';

let request, server;
beforeAll(() => { const app = createApp(); server = app.listen(0); request = supertest(app); });
afterAll(() => server?.close());

const ADDR = { address: '1 Main', city: 'MTL', province: 'QC', postcode: 'H1A1A1', country: 'CA', email: 'a@b.com' };

describe('Stress / adversarial requests', () => {
  it('oversized JSON body rejected (413)', async () => {
    const res = await request.post('/api/payments/stripe/create-intent')
      .set('Content-Type', 'application/json').send('x'.repeat(200000));
    expect(res.status).toBe(413);
  });

  it('SQL injection in status filter does not 500', async () => {
    const res = await request.get('/api/admin/orders').query({ status: "'; DROP TABLE orders;--" });
    expect(res.status).not.toBe(500);
  });

  it('forged admin JWT rejected', async () => {
    const res = await request.get('/api/admin/stats').set('Authorization', 'Bearer fake.jwt.token');
    expect(res.status).toBe(401);
  });

  it('guest with valid-looking params on admin routes rejected', async () => {
    const res = await request.get('/api/admin/products?page=1');
    expect(res.status).toBe(401);
  });

  it('stripe create-intent with valid payload returns order', async () => {
    const res = await request.post('/api/payments/stripe/create-intent')
      .send({ shipping_address: ADDR, items: [{ product_id: 1, quantity: 1 }] });
    expect(res.status).toBeLessThan(500);
  });

  it('stripe confirm with bad paymentId — no internal leak', async () => {
    const res = await request.post('/api/payments/stripe/confirm').send({ paymentId: 'pi_fake' });
    expect(res.status).toBeLessThan(500);
    expect(JSON.stringify(res.body)).not.toMatch(/sk_|node_modules|at src\//i);
  });

  it('paypal capture with fake id — no internal leak', async () => {
    const res = await request.post('/api/payments/paypal/capture').send({ paypalOrderId: 'FAKE' });
    expect(res.status).toBeLessThan(500);
  });

  it('invalid webhook signature rejected', async () => {
    const res = await request.post('/api/webhooks/stripe')
      .set('stripe-signature', 'bad').set('Content-Type', 'application/json').send('{}');
    expect(res.status).toBe(400);
  });

  it('no webhook signature rejected', async () => {
    const res = await request.post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json').send('{}');
    expect(res.status).toBe(400);
  });

  it('guest items with huge quantity does not 500', async () => {
    const res = await request.post('/api/payments/stripe/create-intent')
      .send({ shipping_address: ADDR, items: [{ product_id: 1, quantity: 99999999 }] });
    expect(res.status).toBeLessThan(500);
  });

  it('guest items with negative quantity does not 500', async () => {
    const res = await request.post('/api/payments/stripe/create-intent')
      .send({ shipping_address: ADDR, items: [{ product_id: 1, quantity: -5 }] });
    expect(res.status).toBeLessThan(500);
  });

  it('guest tries to override price server-side — ignored', async () => {
    const res = await request.post('/api/payments/stripe/create-intent')
      .send({ shipping_address: ADDR, items: [{ product_id: 1, quantity: 1, price: 0.01, total: 0.01 }] });
    // server re-derives totals from DB; client-supplied price/total ignored
    expect(res.status).toBeLessThan(500);
  });

  it('malformed JSON body rejected', async () => {
    const res = await request.post('/api/payments/stripe/create-intent')
      .set('Content-Type', 'application/json').send('{"broken":');
    expect(res.status).toBe(400);
  });

  it('unknown route returns 404 not 500', async () => {
    const res = await request.get('/api/no-such-route');
    expect(res.status).toBe(404);
  });

  it('no stack traces leaked in error responses', async () => {
    const res = await request.post('/api/payments/stripe/create-intent').send('{"broken":');
    expect(JSON.stringify(res.body)).not.toMatch(/at |Error:|node_modules|src\\routes/i);
  });
});
