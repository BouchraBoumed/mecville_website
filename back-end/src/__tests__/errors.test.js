import { describe, it, expect } from 'vitest';
import { AppError, errorHandler, notFoundHandler } from '../utils/errors.js';

describe('AppError', () => {
  it('creates an error with message, statusCode, and code', () => {
    const err = new AppError('Not found', 404, 'NOT_FOUND');
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('defaults to 400 status and BAD_REQUEST code', () => {
    const err = new AppError('Something went wrong');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
  });

  it('is an instance of Error', () => {
    const err = new AppError('Test');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('notFoundHandler', () => {
  it('returns 404 with NOT_FOUND code', () => {
    const req = {};
    const res = {
      status: vi.fn(() => res),
      json: vi.fn(() => res),
    };
    notFoundHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
  });
});

describe('errorHandler', () => {
  function mockRes() {
    const res = {
      status: vi.fn(() => res),
      json: vi.fn(() => res),
    };
    return res;
  }

  it('returns the error statusCode for AppError', () => {
    const err = new AppError('Bad input', 400, 'VALIDATION_ERROR');
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_ERROR', message: 'Bad input' },
    });
  });

  it('returns 500 for generic errors and hides the message', () => {
    const err = new Error('Internal DB connection string leaked');
    const res = mockRes();
    errorHandler(err, { method: 'GET', url: '/api/test' }, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    // The actual error message should NOT be in the response
    expect(JSON.stringify(res.json.mock.calls[0])).not.toContain('leaked');
  });

  it('defaults to 500 when statusCode is not set', () => {
    const err = new Error('Something broke');
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('defaults to INTERNAL_ERROR code when code is not set', () => {
    const err = new Error('Something broke');
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });
});
