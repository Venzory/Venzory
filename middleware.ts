import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { checkRouteAccess } from '@/lib/route-guards';
import { generateCSP } from '@/lib/csp';

const protectedMatchers = ['/dashboard', '/inventory', '/suppliers', '/orders', '/locations', '/settings', '/receiving', '/stock-count', '/products', '/catalog', '/my-catalog'];
const authRoutes = ['/login', '/register'];

/**
 * Generates a cryptographically secure nonce for CSP
 * Using Web Crypto API for better security
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}

/**
 * Applies security headers to a NextResponse
 * 
 * Headers applied:
 * - X-Frame-Options: Prevents clickjacking attacks
 * - X-Content-Type-Options: Prevents MIME sniffing
 * - Referrer-Policy: Controls referrer information
 * - Strict-Transport-Security: Forces HTTPS (production only)
 * - Permissions-Policy: Disables sensitive browser features
 * - Content-Security-Policy: Comprehensive XSS protection with nonce
 */
function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  // X-Frame-Options: DENY - Prevent clickjacking by disallowing iframe embedding
  response.headers.set('X-Frame-Options', 'DENY');

  // X-Content-Type-Options: nosniff - Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Referrer-Policy - Control how much referrer information is shared
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Strict-Transport-Security - Force HTTPS (production only)
  if (isProduction) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  // Permissions-Policy - Disable sensitive browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // Content-Security-Policy - Comprehensive XSS protection
  try {
    const csp = generateCSP({ nonce, isDevelopment });
    response.headers.set('Content-Security-Policy', csp);
  } catch (error) {
    // CRITICAL: Fail fast if CSP cannot be generated
    console.error('[SECURITY ERROR] CSP generation failed:', error);
    throw new Error(
      `Failed to generate Content-Security-Policy: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
      'This is a critical security error. Build should fail.'
    );
  }

  // Note: We do NOT expose the nonce in a custom header (x-nonce) as:
  // 1. The app doesn't use it (Next.js handles inline scripts via bundling)
  // 2. Exposing nonces unnecessarily could be a security risk
  // 3. CSP nonce is already included in the Content-Security-Policy header

  return response;
}

export default auth((request) => {
  const { pathname } = request.nextUrl;

  const isProtected = protectedMatchers.some((path) => pathname.startsWith(path));
  const isAuthRoute = authRoutes.some((path) => pathname === path);

  // Generate nonce for this request
  const nonce = generateNonce();

  // If user is authenticated and trying to access auth routes, redirect to dashboard
  if (request.auth && isAuthRoute) {
    const response = NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin));
    return applySecurityHeaders(response, nonce);
  }

  // If user is not authenticated and trying to access protected routes, redirect to login
  if (!request.auth && isProtected) {
    const signInUrl = new URL('/login', request.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.href);
    const response = NextResponse.redirect(signInUrl);
    return applySecurityHeaders(response, nonce);
  }

  // For authenticated users on protected routes, check role-based access
  if (request.auth && isProtected) {
    const { allowed } = checkRouteAccess({
      pathname,
      session: request.auth,
    });

    if (!allowed) {
      // Redirect to access denied page
      const accessDeniedUrl = new URL('/access-denied', request.nextUrl.origin);
      accessDeniedUrl.searchParams.set('from', pathname);
      const response = NextResponse.redirect(accessDeniedUrl);
      return applySecurityHeaders(response, nonce);
    }
  }

  // Apply security headers to normal responses
  const response = NextResponse.next();
  return applySecurityHeaders(response, nonce);
});

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/_next` or `/_vercel` (Next.js internals)
    // - … the ones containing a dot (e.g. `favicon.ico`)
    // API routes ARE included for security headers
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
};
