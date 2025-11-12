/**
 * CSRF Protection Utilities
 * 
 * Implements double-submit cookie pattern with HMAC-signed tokens
 * to prevent Cross-Site Request Forgery attacks.
 * 
 * Token format: {randomToken}.{hmacSignature} (base64url-encoded)
 * 
 * Uses Web Crypto API for Edge Runtime compatibility
 */

import { env } from '@/lib/env';

/**
 * Get CSRF secret from environment
 * Now validated at startup via env module
 */
function getCsrfSecret(): string {
  return env.CSRF_SECRET;
}

/**
 * Generate a cryptographically secure random token
 * Uses Web Crypto API for better security
 * 
 * @returns Base64url-encoded random token (32 bytes)
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  
  // Convert to base64url (URL-safe base64)
  return Buffer.from(array)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Sign a token using HMAC-SHA256
 * Uses Web Crypto API for Edge Runtime compatibility
 * 
 * @param token - The token to sign
 * @returns Base64url-encoded HMAC signature
 */
export async function signToken(token: string): Promise<string> {
  const secret = getCsrfSecret();
  
  // Import the secret as a CryptoKey
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Sign the token
  const tokenData = encoder.encode(token);
  const signature = await crypto.subtle.sign('HMAC', key, tokenData);
  
  // Convert to base64url
  return Buffer.from(signature)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Verify HMAC signature of a token
 * Uses timing-safe comparison to prevent timing attacks
 * 
 * @param token - The original token
 * @param signature - The signature to verify
 * @returns True if signature is valid
 */
export async function verifyToken(token: string, signature: string): Promise<boolean> {
  try {
    const expectedSignature = await signToken(token);
    
    // Ensure same length to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return false;
    }
    
    // Timing-safe comparison
    let mismatch = 0;
    for (let i = 0; i < signature.length; i++) {
      mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    
    return mismatch === 0;
  } catch (error) {
    console.error('[CSRF] Token verification error:', error);
    return false;
  }
}

/**
 * Create a signed CSRF token
 * 
 * @returns Signed token in format: {token}.{signature}
 */
export async function createSignedCsrfToken(): Promise<string> {
  const token = generateCsrfToken();
  const signature = await signToken(token);
  return `${token}.${signature}`;
}

/**
 * Parse and verify a signed CSRF token
 * 
 * @param signedToken - The signed token to verify
 * @returns The token if valid, null otherwise
 */
export async function parseAndVerifySignedToken(signedToken: string): Promise<string | null> {
  try {
    const parts = signedToken.split('.');
    
    if (parts.length !== 2) {
      return null;
    }
    
    const [token, signature] = parts;
    
    if (!token || !signature) {
      return null;
    }
    
    if (await verifyToken(token, signature)) {
      return token;
    }
    
    return null;
  } catch (error) {
    console.error('[CSRF] Token parsing error:', error);
    return null;
  }
}

/**
 * Extract CSRF token from cookie header
 * 
 * @param request - The incoming request
 * @returns The signed token from cookie, or null if not found
 */
export function getCsrfTokenFromCookie(request: Request): string | null {
  try {
    const cookieHeader = request.headers.get('cookie');
    
    if (!cookieHeader) {
      return null;
    }
    
    // Parse cookies
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        acc[key] = decodeURIComponent(value);
      }
      return acc;
    }, {} as Record<string, string>);
    
    return cookies['__Host-csrf'] || null;
  } catch (error) {
    console.error('[CSRF] Error extracting token from cookie:', error);
    return null;
  }
}

/**
 * Extract CSRF token from request header
 * 
 * @param request - The incoming request
 * @returns The token from X-CSRF-Token header, or null if not found
 */
export function getCsrfTokenFromHeader(request: Request): string | null {
  return request.headers.get('x-csrf-token') || null;
}

/**
 * Verify CSRF token using double-submit cookie pattern
 * Compares token from cookie with token from header
 * 
 * @param request - The incoming request
 * @returns True if CSRF token is valid
 */
export async function verifyCsrf(request: Request): Promise<boolean> {
  try {
    // Get signed token from cookie
    const cookieToken = getCsrfTokenFromCookie(request);
    
    if (!cookieToken) {
      console.warn('[CSRF] No CSRF token in cookie');
      return false;
    }
    
    // Verify cookie token signature
    const verifiedCookieToken = await parseAndVerifySignedToken(cookieToken);
    
    if (!verifiedCookieToken) {
      console.warn('[CSRF] Invalid CSRF token signature in cookie');
      return false;
    }
    
    // Get token from header
    const headerToken = getCsrfTokenFromHeader(request);
    
    if (!headerToken) {
      console.warn('[CSRF] No CSRF token in header');
      return false;
    }
    
    // Compare tokens using timing-safe comparison
    if (headerToken.length !== verifiedCookieToken.length) {
      console.warn('[CSRF] Token length mismatch');
      return false;
    }
    
    // Timing-safe comparison
    let mismatch = 0;
    for (let i = 0; i < headerToken.length; i++) {
      mismatch |= headerToken.charCodeAt(i) ^ verifiedCookieToken.charCodeAt(i);
    }
    
    if (mismatch !== 0) {
      console.warn('[CSRF] Token mismatch between cookie and header');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[CSRF] Verification error:', error);
    return false;
  }
}

/**
 * Extract the raw token from a signed token (for client use)
 * 
 * @param signedToken - The signed token
 * @returns The raw token without signature
 */
export function extractRawToken(signedToken: string): string | null {
  try {
    const parts = signedToken.split('.');
    return parts[0] || null;
  } catch (error) {
    return null;
  }
}

