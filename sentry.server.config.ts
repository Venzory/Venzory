import * as Sentry from '@sentry/nextjs';
import { env } from '@/lib/env';
import logger from '@/lib/logger';

const SENTRY_DSN = env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    environment: env.NODE_ENV,
  });

  logger.info({
    module: 'sentry',
    runtime: 'server',
    environment: env.NODE_ENV,
  }, 'Server-side error tracking initialized');
} else {
  logger.warn({
    module: 'sentry',
    runtime: 'server',
  }, 'No SENTRY_DSN found - error tracking disabled');
}

