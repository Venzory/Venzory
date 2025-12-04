const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Instrumentation is now enabled by default in Next.js 15
  // Note: Keep .next in project root. OneDrive symlink issues are resolved by clearing cache.
  
  // Tree-shake lucide-react imports for faster builds and smaller bundles
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Enable React Compiler for automatic memoization (Next.js 16+)
  reactCompiler: true,
  // Enable Turbopack by default in Next.js 16, explicitly clearing this check
  turbopack: {},
  serverExternalPackages: ['pino', 'pino-pretty'],
  webpack: (config) => {
    config.ignoreWarnings = [
      { module: /node_modules\/@opentelemetry\/instrumentation/ },
      { module: /node_modules\/@prisma\/instrumentation/ }
    ];
    return config;
  },
  // Backward-compatible redirects for role-scoped UI shell migration
  async redirects() {
    return [
      // Clinic routes - redirect old paths to /app prefix
      { source: '/dashboard', destination: '/app/dashboard', permanent: true },
      { source: '/dashboard/:path*', destination: '/app/dashboard/:path*', permanent: true },
      { source: '/inventory', destination: '/app/inventory', permanent: true },
      { source: '/inventory/:path*', destination: '/app/inventory/:path*', permanent: true },
      { source: '/orders', destination: '/app/orders', permanent: true },
      { source: '/orders/:path*', destination: '/app/orders/:path*', permanent: true },
      { source: '/suppliers', destination: '/app/suppliers', permanent: true },
      { source: '/suppliers/:path*', destination: '/app/suppliers/:path*', permanent: true },
      { source: '/my-items', destination: '/app/my-items', permanent: true },
      { source: '/my-items/:path*', destination: '/app/my-items/:path*', permanent: true },
      { source: '/receiving', destination: '/app/receiving', permanent: true },
      { source: '/receiving/:path*', destination: '/app/receiving/:path*', permanent: true },
      { source: '/stock-count', destination: '/app/stock-count', permanent: true },
      { source: '/stock-count/:path*', destination: '/app/stock-count/:path*', permanent: true },
      { source: '/locations', destination: '/app/locations', permanent: true },
      { source: '/locations/:path*', destination: '/app/locations/:path*', permanent: true },
      { source: '/settings', destination: '/app/settings', permanent: true },
      { source: '/settings/:path*', destination: '/app/settings/:path*', permanent: true },
      { source: '/reorder-suggestions', destination: '/app/reorder-suggestions', permanent: true },
      { source: '/reorder-suggestions/:path*', destination: '/app/reorder-suggestions/:path*', permanent: true },
      { source: '/supplier-catalog', destination: '/app/supplier-catalog', permanent: true },
      { source: '/supplier-catalog/:path*', destination: '/app/supplier-catalog/:path*', permanent: true },
      { source: '/needs-attention', destination: '/app/needs-attention', permanent: true },
      { source: '/needs-attention/:path*', destination: '/app/needs-attention/:path*', permanent: true },
      { source: '/global-supplier-catalog', destination: '/app/global-supplier-catalog', permanent: true },
      { source: '/global-supplier-catalog/:path*', destination: '/app/global-supplier-catalog/:path*', permanent: true },
      { source: '/product-master', destination: '/app/product-master', permanent: true },
      { source: '/product-master/:path*', destination: '/app/product-master/:path*', permanent: true },
    ];
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
