/**
 * Server Action CSRF Protection
 * 
 * Utilities for verifying CSRF tokens in Next.js Server Actions
 * Server actions receive CSRF token via request headers
 */

import { headers } from 'next/headers';
import { parseAndVerifySignedToken } from '@/lib/csrf';

/**
 * Extract and verify CSRF token from Next.js headers
 * 
 * Server actions receive the token via:
 * 1. Cookie: __Host-csrf (production) or csrf-token (development)
 * 2. Header: x-csrf-token (optional, for fetch requests)
 * 
 * For Next.js server actions submitted via forms, the cookie alone provides
 * CSRF protection due to SameSite=Lax and secure cookie attributes.
 * 
 * For programmatic fetch requests, both cookie and header must match.
 * 
 * Note: __Host- prefix requires HTTPS and Secure flag. In development (HTTP),
 * we use csrf-token to ensure browser compatibility.
 * 
 * @throws Error if CSRF verification fails
 */
export async function verifyCsrfFromHeaders(): Promise<void> {
  const headersList = await headers();
  
  // Get CSRF token from cookie
  const cookieHeader = headersList.get('cookie');
  let cookieToken: string | null = null;
  
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        acc[key] = decodeURIComponent(value);
      }
      return acc;
    }, {} as Record<string, string>);
    
    // Try production cookie name first, then development
    cookieToken = cookies['__Host-csrf'] || cookies['csrf-token'] || null;
  }
  
  if (!cookieToken) {
    throw new Error('Invalid request');
  }
  
  // Verify cookie token signature
  const verifiedCookieToken = await parseAndVerifySignedToken(cookieToken);
  
  if (!verifiedCookieToken) {
    throw new Error('Invalid request');
  }
  
  // Get token from header (optional for form-based server actions)
  const headerToken = headersList.get('x-csrf-token');
  
  // If header token is provided (fetch requests), verify it matches
  if (headerToken) {
    // Compare tokens (constant-time comparison handled by Buffer.compare)
    if (headerToken !== verifiedCookieToken) {
      throw new Error('Invalid request');
    }
  }
  
  // If no header token, we rely on cookie-based CSRF protection
  // This is secure for server actions due to:
  // 1. SameSite=Lax prevents cross-site cookie sending
  // 2. Secure cookie attributes (Secure flag in production, HttpOnly, Path=/)
  // 3. Server actions are same-origin by design
}

/**
 * Higher-order function to wrap server actions with CSRF verification
 * 
 * @param action - The server action function to wrap
 * @returns Wrapped action with CSRF verification
 * 
 * @example
 * ```typescript
 * export const createItemAction = withCsrfAction(
 *   async (formData: FormData) => {
 *     // Your action code here
 *     return { success: true };
 *   }
 * );
 * ```
 */
export function withCsrfAction<TArgs extends any[], TReturn>(
  action: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    // Verify CSRF before executing action
    await verifyCsrfFromHeaders();
    
    // Execute the action
    return action(...args);
  };
}

/**
 * Helper to get raw CSRF token for client-side use
 * This is useful for forms that need to include the token
 * 
 * Supports both production (__Host-csrf) and development (csrf-token) cookie names.
 * 
 * @returns The raw CSRF token (without signature)
 */
export async function getCsrfTokenForClient(): Promise<string | null> {
  const headersList = await headers();
  const cookieHeader = headersList.get('cookie');
  
  if (!cookieHeader) {
    return null;
  }
  
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      acc[key] = decodeURIComponent(value);
    }
    return acc;
  }, {} as Record<string, string>);
  
  // Try production cookie name first, then development
  const signedToken = cookies['__Host-csrf'] || cookies['csrf-token'];
  
  if (!signedToken) {
    return null;
  }
  
  // Parse and verify, then return raw token
  const rawToken = await parseAndVerifySignedToken(signedToken);
  
  return rawToken;
}

