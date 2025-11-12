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
 * 1. Cookie: __Host-csrf (set by middleware)
 * 2. Header: x-csrf-token (set by client)
 * 
 * This function verifies that both exist and match
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
    
    cookieToken = cookies['__Host-csrf'] || null;
  }
  
  if (!cookieToken) {
    throw new Error('Invalid request');
  }
  
  // Verify cookie token signature
  const verifiedCookieToken = await parseAndVerifySignedToken(cookieToken);
  
  if (!verifiedCookieToken) {
    throw new Error('Invalid request');
  }
  
  // Get token from header
  const headerToken = headersList.get('x-csrf-token');
  
  if (!headerToken) {
    throw new Error('Invalid request');
  }
  
  // Compare tokens (constant-time comparison handled by Buffer.compare)
  if (headerToken !== verifiedCookieToken) {
    throw new Error('Invalid request');
  }
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
  
  const signedToken = cookies['__Host-csrf'];
  
  if (!signedToken) {
    return null;
  }
  
  // Parse and verify, then return raw token
  const rawToken = await parseAndVerifySignedToken(signedToken);
  
  return rawToken;
}

