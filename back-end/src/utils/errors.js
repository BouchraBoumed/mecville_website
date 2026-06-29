import { captureError } from './sentry.js';

export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  if (statusCode === 500) {
    // Send to Sentry (if configured) with request context
    captureError(err, {
      method: req.method,
      url: req.url,
      statusCode,
      code,
      userId: req.user?.id,
    });
  }

  res.status(statusCode).json({
    error: { code, message },
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Resource not found' },
  });
}
