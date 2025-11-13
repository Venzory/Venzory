// Temporarily disabled Sentry edge config due to "self is not defined" error
// This is a known compatibility issue between Sentry and Next.js 15 edge runtime
// TODO: Re-enable when Sentry releases a fix

// import * as Sentry from '@sentry/nextjs';
// import { env } from '@/lib/env';

// const SENTRY_DSN = env.SENTRY_DSN;

// if (SENTRY_DSN) {
//   Sentry.init({
//     dsn: SENTRY_DSN,

//     // Adjust this value in production, or use tracesSampler for greater control
//     tracesSampleRate: 1.0,

//     // Setting this option to true will print useful information to the console while you're setting up Sentry.
//     debug: false,

//     environment: env.NODE_ENV,
//   });

//   logger.info({
//     module: 'sentry',
//     runtime: 'edge',
//     environment: env.NODE_ENV,
//   }, 'Edge runtime error tracking initialized');
// } else {
//   logger.warn({
//     module: 'sentry',
//     runtime: 'edge',
//   }, 'No SENTRY_DSN found - error tracking disabled');
// }

// Note: Edge runtime temporarily disabled for testing
// Uncomment the above code block when ready to enable Sentry in Edge runtime

// Export an empty object to make this a valid module
export {};

