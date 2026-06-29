import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

vi.mock('../config/supabase.js', () => {
  let getUserResult = { data: { user: { id: 'test-id', email: 'test@test.com' } }, error: null };
  let profileResult = { data: { role: 'admin' }, error: null };

  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => profileResult),
    maybeSingle: vi.fn(() => profileResult),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    rpc: vi.fn(() => ({ data: null, error: null })),
    ilike: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    head: vi.fn(() => ({ data: null, error: null, count: 0 })),
    count: vi.fn(() => ({ count: 0 })),
  };

  return {
    supabase: {
      from: vi.fn(() => mockChain),
      rpc: vi.fn(() => ({ data: null, error: null })),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
      })),
      removeChannel: vi.fn(),
      auth: {
        getUser: vi.fn(() => getUserResult),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        getSession: vi.fn(() => ({
          data: { session: null },
        })),
      },
    },
    __setGetUserResult: (r) => { getUserResult = r; },
    __setProfileResult: (r) => { profileResult = r; },
  };
});

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

describe('Auth Middleware — requireAuth', () => {
  it('returns 401 when no Authorization header', async () => {
    const res = await request.get('/api/admin/stats');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    const res = await request
      .get('/api/admin/stats')
      .set('Authorization', 'Basic abc123');
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    const supabaseMock = await import('../config/supabase.js');
    supabaseMock.__setGetUserResult({ data: { user: null }, error: { message: 'Invalid token' } });

    const res = await request
      .get('/api/admin/stats')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);

    // Reset for other tests
    supabaseMock.__setGetUserResult({ data: { user: { id: 'test-id', email: 'test@test.com' } }, error: null });
  });
});

describe('Auth Middleware — requireAdmin', () => {
  it('returns 403 when user is not admin', async () => {
    const supabaseMock = await import('../config/supabase.js');
    supabaseMock.__setProfileResult({ data: { role: 'customer' }, error: null });

    const res = await request
      .get('/api/admin/stats')
      .set('Authorization', 'Bearer valid-token')
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');

    // Reset
    supabaseMock.__setProfileResult({ data: { role: 'admin' }, error: null });
  });

  it('returns 403 when profile lookup returns null', async () => {
    const supabaseMock = await import('../config/supabase.js');
    supabaseMock.__setProfileResult({ data: null, error: null });

    const res = await request
      .get('/api/admin/stats')
      .set('Authorization', 'Bearer valid-token')
      .send({});
    expect(res.status).toBe(403);

    // Reset
    supabaseMock.__setProfileResult({ data: { role: 'admin' }, error: null });
  });
});
