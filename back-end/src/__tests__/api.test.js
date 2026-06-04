import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

vi.mock('../config/supabase.js', () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue({ data: { role: 'admin' }, error: null }),
    mayBeSingle: vi.fn().mockReturnValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockReturnValue({ data: null, error: null }),
    ilike: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    head: vi.fn().mockReturnValue({ data: null, error: null }),
    count: vi.fn().mockReturnValue({ count: 0 }),
  };

  return {
    supabase: {
      from: vi.fn().mockReturnValue(mockChain),
      rpc: vi.fn().mockReturnValue({ data: null, error: null }),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      }),
      removeChannel: vi.fn(),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-id', email: 'test@test.com' } },
          error: null,
        }),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    },
  };
});

vi.mock('../services/email.js', () => ({
  sendContactNotification: vi.fn().mockResolvedValue(undefined),
  sendOrderConfirmation: vi.fn().mockResolvedValue(undefined),
}));

import supertest from 'supertest';
import { createApp } from '../app.js';

let request;
let server;

beforeAll(async () => {
  const app = createApp();
  server = app.listen(0);
  request = supertest(app);
});

afterAll(() => {
  if (server) server.close();
});

describe('API Health', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET unknown route returns 404', async () => {
    const res = await request.get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

describe('Contact Form', () => {
  it('POST /api/contact returns 201 with valid data', async () => {
    const res = await request
      .post('/api/contact')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test',
        message: 'This is a test message with enough length.',
      })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/contact returns 400 with missing fields', async () => {
    const res = await request
      .post('/api/contact')
      .send({})
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });
});

describe('Payment Endpoints - Auth Required', () => {
  it('POST /api/payments/stripe/create-intent requires auth', async () => {
    const res = await request.post('/api/payments/stripe/create-intent').send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/payments/paypal/create-order requires auth', async () => {
    const res = await request.post('/api/payments/paypal/create-order').send({});
    expect(res.status).toBe(401);
  });
});

describe('Admin Endpoints - Auth Required', () => {
  const endpoints = ['stats', 'orders', 'products', 'messages', 'reviews', 'customers'];
  endpoints.forEach(path => {
    it(`GET /api/admin/${path} requires auth`, async () => {
      const res = await request.get(`/api/admin/${path}`);
      expect(res.status).toBe(401);
    });
  });
});

describe('Webhook Endpoints', () => {
  it('POST /api/webhooks/stripe returns error without signature', async () => {
    const res = await request
      .post('/api/webhooks/stripe')
      .send({ type: 'payment_intent.succeeded', data: { object: {} } })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });

  it('POST /api/webhooks/paypal rejects invalid signature', async () => {
    const res = await request
      .post('/api/webhooks/paypal')
      .send({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: {} })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });
});

describe('Content-Type Handling', () => {
  it('rejects body over 10kb', async () => {
    const res = await request
      .post('/api/contact')
      .send({ name: 'X', email: 'x@t.com', subject: 'S', message: 'x'.repeat(11000) })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(413);
  });
});
