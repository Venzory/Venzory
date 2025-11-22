const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Instrumentation is now enabled by default in Next.js 15
  // Note: Keep .next in project root. OneDrive symlink issues are resolved by clearing cache.
  
  // Tree-shake lucide-react imports for faster builds and smaller bundles
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  serverExternalPackages: ['pino', 'pino-pretty'],
  webpack: (config) => {
    config.ignoreWarnings = [
      { module: /node_modules\/@opentelemetry\/instrumentation/ },
      { module: /node_modules\/@prisma\/instrumentation/ }
    ];
    return config;
  },
}

// Only enable Sentry in production to improve dev speed
if (process.env.NODE_ENV === 'production') {
  // Sentry configuration options
  const sentryWebpackPluginOptions = {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,

    // Only print logs for uploading source maps in CI or when explicitly enabled
    silent: !process.env.CI && !process.env.SENTRY_VERBOSE,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Automatically annotate React components to show their full name in breadcrumbs and session replay
    reactComponentAnnotation: {
      enabled: true,
    },

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the Sentry DSN is available at build time.
    tunnelRoute: '/monitoring',

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  };

  // Make sure adding Sentry options is the last code to run before exporting
  module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
} else {
  module.exports = nextConfig;
}
