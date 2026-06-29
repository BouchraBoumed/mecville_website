/**
 * Optional Sentry error tracking integration.
 *
 * If SENTRY_DSN is set in .env, errors are sent to Sentry.
 * If not set, this module is a no-op — all functions are safe to call.
 *
 * To enable:
 *   1. npm install @sentry/node
 *   2. Set SENTRY_DSN in back-end/.env
 *   3. The init() call below activates automatically
 */

let Sentry = null;
let sentryInitDone = false;

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  // Use dynamic import() — this file runs in an ESM context (package.json has "type": "module")
  // so require() is not available. The import is async but captureError guards with sentryInitDone.
  import('@sentry/node')
    .then((mod) => {
      Sentry = mod.default || mod;
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      });
      sentryInitDone = true;
      console.log('Sentry error tracking initialized');
    })
    .catch(() => {
      console.warn('SENTRY_DSN is set but @sentry/node is not installed. Run: npm install @sentry/node');
    });
}

/**
 * Capture an error and send to Sentry (if configured).
 * @param {Error} error
 * @param {Object} [context] - Additional context metadata
 */
export function captureError(error, context = {}) {
  if (Sentry && sentryInitDone) {
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
      Sentry.captureException(error);
    });
  }
  // Always also log to console
  console.error(error);
}

export function isSentryEnabled() {
  return Sentry !== null && sentryInitDone;
}
