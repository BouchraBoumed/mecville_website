import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './utils/errors.js';
import paymentsRouter from './routes/payments.js';
import webhooksRouter from './routes/webhooks.js';
import contactRouter from './routes/contact.js';
import adminRouter from './routes/admin.js';
import newsletterRouter from './routes/newsletter.js';

dotenv.config();

export function createApp() {
  const app = express();

  // Trust the first proxy hop — required when behind nginx/reverse proxy
  // so req.ip, req.protocol, and rate limiting work correctly in production.
  // In development (no proxy) this is harmless.
  app.set('trust proxy', 1);

  const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
  // Support a comma-separated list of origins (e.g. Vercel preview URLs).
  const allowedOrigins = CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com', 'https://www.paypal.com'],
        frameSrc: ["'self'", 'https://js.stripe.com', 'https://www.paypal.com'],
        imgSrc: ["'self'", 'data:', 'https://placehold.co', 'https://*.supabase.co'],
        connectSrc: ["'self'", 'https://api.stripe.com', 'https://api-m.paypal.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin (server-to-server, curl, webhooks).
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
  }));

  // Stripe webhook needs the raw body for signature verification
  app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

  // PayPal webhook needs the raw body string for signature verification.
  // We capture it via a verify hook so req.rawBody is available in the route.
  app.use('/api/webhooks/paypal', express.json({
    limit: '10kb',
    verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); },
  }));

  // All other routes use standard JSON parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: false }));

  app.use('/api/', apiLimiter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/webhooks', webhooksRouter);
  app.use('/api/contact', contactRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/newsletter', newsletterRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
