/**
 * Fetch wrapper with automatic CSRF token injection
 * 
 * Automatically includes CSRF token from cookie in request headers
 * for mutating operations (POST, PUT, PATCH, DELETE)
 */

import logger from '@/lib/logger';

/**
 * HTTP methods that require CSRF token
 */
const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Extract CSRF token from document cookies
 * 
 * Supports both production (__Host-csrf) and development (csrf-token) cookie names.
 * The __Host- prefix requires HTTPS and Secure flag, so we use a simpler name in development.
 * 
 * @returns Raw CSRF token (without signature) or null if not found
 */
function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') {
    // Server-side, no cookies available
    return null;
  }
  
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      acc[key] = decodeURIComponent(value);
    }
    return acc;
  }, {} as Record<string, string>);
  
  // Try production cookie name first, then development
  const signedToken = cookies['__Host-csrf'] || cookies['csrf-token'];
  
  if (!signedToken) {
    // If we're in a context where we can't read cookies directly (e.g. HttpOnly),
    // we might need to rely on the browser to send the cookie automatically.
    // However, the server expects the token in the header too (Double Submit Cookie).
    // If the cookie is HttpOnly, we can't read it from JS.
    // But the pattern used here implies we should be able to read it.
    return null;
  }
  
  // Extract raw token (before the signature)
  const parts = signedToken.split('.');
  return parts[0] || null;
}

/**
 * Fetch wrapper that automatically includes CSRF token
 * 
 * For POST/PUT/PATCH/DELETE requests, automatically adds the X-CSRF-Token header
 * Token is extracted from the __Host-csrf cookie set by middleware
 * 
 * @param input - Request URL or Request object
 * @param init - Request options
 * @returns Fetch promise
 * 
 * @example
 * ```typescript
 * // Simple POST
 * const response = await fetchWithCsrf('/api/items', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'Item 1' }),
 *   headers: { 'Content-Type': 'application/json' }
 * });
 * 
 * // GET requests work normally (no CSRF token needed)
 * const data = await fetchWithCsrf('/api/items').then(r => r.json());
 * ```
 */
export async function fetchWithCsrf(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Determine the method (default to GET)
  const method = init?.method?.toUpperCase() || 'GET';
  
  // For mutating methods, add CSRF token
  if (MUTATING_METHODS.includes(method)) {
    const csrfToken = getCsrfTokenFromCookie();
    
    if (!csrfToken) {
      logger.warn({
        module: 'fetch-with-csrf',
        operation: 'fetchWithCsrf',
        method,
        url: input.toString(),
      }, 'No CSRF token found in cookies');
      // Still proceed with the request - server will reject it
    }
    
    // Add CSRF token to headers
    const headers = new Headers(init?.headers);
    
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
    
    // Merge headers back into init
    return fetch(input, {
      ...init,
      headers,
    });
  }
  
  // For safe methods (GET, HEAD), just pass through
  return fetch(input, init);
}

