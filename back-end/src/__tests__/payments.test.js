import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

// Mock supabase BEFORE importing app
vi.mock('../config/supabase.js', () => {
  let mockData = {};
  let mockError = null;

  // Build a chainable mock that returns `this` for chaining methods,
  // and returns data for terminal methods (single, maybeSingle, etc.)
  function createChain() {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn(() => ({ data: mockData.single || mockData.default, error: mockError })),
      maybeSingle: vi.fn(() => ({ data: mockData.maybeSingle ?? mockData.default, error: mockError })),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn(() => ({ data: null, error: mockError })),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn(() => ({ data: mockData.range || [], count: mockData.count ?? 0, error: mockError })),
      rpc: vi.fn(() => ({ data: null, error: mockError })),
      ilike: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      head: vi.fn(() => ({ data: null, error: mockError, count: mockData.count ?? 0 })),
      count: vi.fn(() => ({ count: mockData.count ?? 0 })),
    };
    // Make insert().select() work — select after insert should return data
    chain.insert.mockReturnValue({
      ...chain,
      select: vi.fn(() => ({ data: mockData.insert || { id: 1, order_number: 'MCV-TEST-001' }, error: mockError })),
    });
    // Make update().eq().select().single() work
    chain.update.mockReturnValue({
      ...chain,
      eq: vi.fn().mockReturnValue({
        ...chain,
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: mockData.update || { id: 1, order_number: 'MCV-TEST-001', payment_status: 'paid' }, error: mockError })),
        })),
      }),
    });
    return chain;
  }
  const mockChain = createChain();

  return {
    supabase: {
      from: vi.fn(() => mockChain),
      rpc: vi.fn(() => ({ data: null, error: mockError })),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
      })),
      removeChannel: vi.fn(),
      auth: {
        getUser: vi.fn(() => ({
          data: { user: { id: 'user-123', email: 'test@test.com' } },
          error: null,
        })),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        getSession: vi.fn(() => ({
          data: { session: { user: { id: 'user-123' }, access_token: 'token-123' } },
        })),
      },
    },
    __setMockData: (d) => { mockData = { ...mockData, ...d }; },
    __setMockError: (e) => { mockError = e; },
    __resetMock: () => { mockData = {}; mockError = null; },
  };
});

vi.mock('../services/stripe.js', () => ({
  createPaymentIntent: vi.fn(() => ({
    clientSecret: 'pi_test_secret',
    paymentId: 'pi_test_123',
  })),
  confirmPayment: vi.fn(() => ({
    status: 'succeeded',
    id: 'pi_test_123',
  })),
  createRefund: vi.fn(),
  constructWebhookEvent: vi.fn(() => { throw new Error('No Stripe signature found'); }),
  stripe: null,
}));

vi.mock('../services/paypal.js', () => ({
  createOrder: vi.fn(() => ({
    id: 'PAYPAL-ORDER-123',
    links: [
      { rel: 'approve', href: 'https://paypal.com/approve' },
      { rel: 'self', href: 'https://paypal.com/self' },
    ],
  })),
  captureOrder: vi.fn(() => ({
    status: 'COMPLETED',
    purchase_units: [{ payments: { captures: [{ id: 'CAP-123' }] } }],
  })),
  verifyWebhook: vi.fn(() => false),
}));

vi.mock('../services/email.js', () => ({
  sendContactNotification: vi.fn(() => Promise.resolve()),
  sendOrderConfirmation: vi.fn(() => Promise.resolve()),
  sendOrderStatusUpdate: vi.fn(() => Promise.resolve()),
}));

import supertest from 'supertest';
import { createApp } from '../app.js';

let request, server;

beforeAll(() => {
  const app = createApp();
  server = app.listen(0);
  request = supertest(app);
});

afterAll(() => {
  if (server) server.close();
});

const VALID_ADDRESS = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@test.com',
  address: '123 Main St',
  city: 'Montreal',
  province: 'QC',
  postcode: 'H1A1A1',
  country: 'CA',
};

const AUTH_HEADER = { Authorization: 'Bearer test-token' };

describe('Payment Routes — Auth Required', () => {
  it('POST /api/payments/stripe/create-intent requires auth', async () => {
    const res = await request.post('/api/payments/stripe/create-intent').send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/payments/stripe/confirm requires auth', async () => {
    const res = await request.post('/api/payments/stripe/confirm').send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/payments/paypal/create-order requires auth', async () => {
    const res = await request.post('/api/payments/paypal/create-order').send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/payments/paypal/capture requires auth', async () => {
    const res = await request.post('/api/payments/paypal/capture').send({});
    expect(res.status).toBe(401);
  });
});

describe('POST /api/payments/stripe/create-intent — Address Validation', () => {
  it('returns 400 when no shipping_address provided', async () => {
    const res = await request
      .post('/api/payments/stripe/create-intent')
      .set(AUTH_HEADER)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when shipping_address missing required fields', async () => {
    const res = await request
      .post('/api/payments/stripe/create-intent')
      .set(AUTH_HEADER)
      .send({ shipping_address: { address: '123 Main St' } });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('shipping address');
  });

  it('returns 400 when shipping_address has no province', async () => {
    const res = await request
      .post('/api/payments/stripe/create-intent')
      .set(AUTH_HEADER)
      .send({
        shipping_address: {
          ...VALID_ADDRESS,
          province: '',
        },
      });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/payments/paypal/create-order — Address Validation', () => {
  it('returns 400 when no shipping_address provided', async () => {
    const res = await request
      .post('/api/payments/paypal/create-order')
      .set(AUTH_HEADER)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 with incomplete address', async () => {
    const res = await request
      .post('/api/payments/paypal/create-order')
      .set(AUTH_HEADER)
      .send({ shipping_address: { city: 'Montreal' } });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/payments/stripe/confirm', () => {
  it('returns 400 when paymentId is missing', async () => {
    const res = await request
      .post('/api/payments/stripe/confirm')
      .set(AUTH_HEADER)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when paymentId is empty', async () => {
    const res = await request
      .post('/api/payments/stripe/confirm')
      .set(AUTH_HEADER)
      .send({ paymentId: '' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/payments/paypal/capture', () => {
  it('returns 400 when paypalOrderId is missing', async () => {
    const res = await request
      .post('/api/payments/paypal/capture')
      .set(AUTH_HEADER)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when paypalOrderId is empty', async () => {
    const res = await request
      .post('/api/payments/paypal/capture')
      .set(AUTH_HEADER)
      .send({ paypalOrderId: '' });
    expect(res.status).toBe(400);
  });
});

describe('Webhook endpoints — no auth required', () => {
  it('POST /api/webhooks/stripe returns 400 without signature', async () => {
    const res = await request
      .post('/api/webhooks/stripe')
      .send({ type: 'test' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });

  it('POST /api/webhooks/paypal returns 400 with invalid signature', async () => {
    const res = await request
      .post('/api/webhooks/paypal')
      .send({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: {} })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });
});

describe('Health endpoint', () => {
  it('GET /api/health returns ok with timestamp', async () => {
    const res = await request.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request.get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('Admin routes — auth required', () => {
  const endpoints = ['stats', 'orders', 'products', 'messages', 'reviews', 'customers'];
  for (const path of endpoints) {
    it(`GET /api/admin/${path} returns 401 without auth`, async () => {
      const res = await request.get(`/api/admin/${path}`);
      expect(res.status).toBe(401);
    });
  }
});
