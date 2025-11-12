export async function register() {
  // Import env module to ensure validation happens early
  const { env } = await import('./lib/env');

  if (env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

