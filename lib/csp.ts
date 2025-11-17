/**
 * Content Security Policy (CSP) utility module
 * 
 * This module provides strict CSP configuration with nonce support
 * to prevent XSS attacks and other injection vulnerabilities.
 */

import logger from '@/lib/logger';

export interface CSPConfig {
  nonce: string;
  isDevelopment?: boolean;
}

/**
 * CSP directive key type
 */
type CspDirectiveKey = 
  | 'default-src'
  | 'script-src'
  | 'style-src'
  | 'img-src'
  | 'font-src'
  | 'connect-src'
  | 'frame-ancestors'
  | 'base-uri'
  | 'form-action'
  | 'upgrade-insecure-requests';

/**
 * CSP directive definitions
 * 
 * STRICT BASELINE POLICY:
 * - default-src 'self': Only allow resources from same origin
 * - script-src: Use nonce for inline scripts + strict-dynamic
 * - style-src: Use nonce for inline styles
 * - img-src: Allow self, data URIs, and blob URIs
 * - font-src: Allow self and data URIs
 * - connect-src: Only allow same-origin connections
 * - frame-ancestors 'none': Prevent embedding (defense in depth with X-Frame-Options)
 * - base-uri 'self': Prevent base tag hijacking
 * - form-action 'self': Only allow form submissions to same origin
 * - upgrade-insecure-requests: Upgrade HTTP to HTTPS
 */
const CSP_DIRECTIVES: Record<CspDirectiveKey, readonly string[]> = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    // Nonce placeholder - will be replaced dynamically
    "'nonce-{NONCE}'",
    // Hash for theme script (prevents FOUC) - see app/layout.tsx
    "'sha256-0lScLMzgnTF/4aEL0Kl3JzVxaxwkLikwLeFx2kRmx3U='",
    // 'strict-dynamic' allows scripts loaded by trusted scripts (CSP Level 3)
    "'strict-dynamic'",
    // Fallback for older browsers (ignored by modern browsers when strict-dynamic is present)
    // This is a standard pattern and does NOT weaken security in modern browsers
    "'unsafe-inline'",
  ],
  'style-src': [
    "'self'",
    "'nonce-{NONCE}'",
    // JUSTIFICATION for 'unsafe-inline':
    // Required for React inline styles (e.g., style={{ width: `${progress}%` }})
    // Used in 7+ components for dynamic styling (progress bars, dynamic positioning, etc.)
    // TODO: Refactor to use CSS variables or data attributes to remove this
    // Example files: app/(dashboard)/dashboard/_components/onboarding-reminder-card.tsx
    "'unsafe-inline'",
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
  ],
  'font-src': [
    "'self'",
    'data:',
  ],
  'connect-src': [
    "'self'",
    // FUTURE: Uncomment when Sentry is fully configured
    // 'https://*.ingest.sentry.io',
  ],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': [],
};

/**
 * Generates the Content-Security-Policy header value
 * 
 * @param config - Configuration object with nonce and environment
 * @returns CSP header string
 * @throws Error if nonce is not provided (fail-fast validation)
 */
export function generateCSP(config: CSPConfig): string {
  const { nonce, isDevelopment = false } = config;

  // Fail-fast: Ensure CSP can always be generated
  if (!nonce || typeof nonce !== 'string' || nonce.length === 0) {
    throw new Error(
      'CSP generation failed: nonce is required and must be a non-empty string. ' +
      'This is a critical security error and the build should fail.'
    );
  }

  // Build directives with development-specific settings
  const directives: Record<CspDirectiveKey, string[]> = {} as Record<CspDirectiveKey, string[]>;
  
  // Copy all directives from the base configuration
  for (const key of Object.keys(CSP_DIRECTIVES) as CspDirectiveKey[]) {
    directives[key] = [...CSP_DIRECTIVES[key]];
  }
  
  // In development, add 'unsafe-eval' for Next.js HMR and React Refresh
  if (isDevelopment) {
    directives['script-src'].push("'unsafe-eval'");
  }

  // Build CSP directives
  const directiveStrings = Object.entries(directives).map(([key, values]) => {
    if (values.length === 0) {
      // Directives without values (e.g., upgrade-insecure-requests)
      return key;
    }

    // Replace nonce placeholder with actual nonce
    const processedValues = values.map(value => 
      value.replace('{NONCE}', nonce)
    );

    return `${key} ${processedValues.join(' ')}`;
  });

  // Join all directives with semicolons
  const cspString = directiveStrings.join('; ');

  // Validate CSP was generated successfully
  if (!cspString || cspString.length === 0) {
    throw new Error(
      'CSP generation failed: resulting CSP string is empty. ' +
      'This is a critical security error and the build should fail.'
    );
  }

  // Log CSP in development for debugging
  if (isDevelopment) {
    logger.debug({
      module: 'csp',
      operation: 'generateCSP',
      csp: cspString,
    }, 'Generated Content-Security-Policy');
  }

  return cspString;
}

/**
 * Validates that a CSP string contains all required directives
 * Useful for testing
 */
export function validateCSP(csp: string): { valid: boolean; missing: string[] } {
  const requiredDirectives = [
    'default-src',
    'script-src',
    'style-src',
    'img-src',
    'font-src',
    'connect-src',
    'frame-ancestors',
    'base-uri',
    'form-action',
  ];

  const missing = requiredDirectives.filter(directive => !csp.includes(directive));

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Extracts nonce from a CSP string (useful for testing)
 */
export function extractNonceFromCSP(csp: string): string | null {
  const match = csp.match(/'nonce-([^']+)'/);
  return match ? match[1] : null;
}

