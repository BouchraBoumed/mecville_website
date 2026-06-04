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

dotenv.config();

export function createApp() {
  const app = express();
  const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

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
    origin: CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
  }));

  app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: false }));

  app.use('/api/', apiLimiter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/webhooks', webhooksRouter);
  app.use('/api/contact', contactRouter);
  app.use('/api/admin', adminRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
