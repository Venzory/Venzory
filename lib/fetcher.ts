/**
 * Unified Fetch Wrapper with Error Handling
 * 
 * Provides a typed fetch wrapper that:
 * - Automatically includes CSRF tokens (via fetchWithCsrf)
 * - Throws ClientApiError on error responses
 * - Returns typed data on success
 * - Provides convenience methods for common HTTP methods
 */

import { fetchWithCsrf } from '@/lib/fetch-with-csrf';
import { ClientApiError, asClientError } from '@/lib/client-error';

/**
 * Fetcher options (extends standard RequestInit)
 */
export interface FetcherOptions extends Omit<RequestInit, 'body'> {
  body?: any; // Allow any type, will be JSON.stringify'd if object
}

/**
 * Unified fetch wrapper with automatic error handling
 * 
 * Calls fetchWithCsrf internally (preserves CSRF token logic).
 * On error responses (!response.ok), parses the error and throws ClientApiError.
 * On success, returns the parsed JSON response.
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options (body will be JSON.stringify'd if object)
 * @returns Promise resolving to typed response data
 * @throws ClientApiError on error responses
 * 
 * @example
 * ```typescript
 * // Simple GET
 * const items = await fetcher<Item[]>('/api/items');
 * 
 * // POST with body
 * const newItem = await fetcher<Item>('/api/items', {
 *   method: 'POST',
 *   body: { name: 'New Item' }
 * });
 * 
 * // Error handling
 * try {
 *   const data = await fetcher('/api/items');
 * } catch (error) {
 *   if (error instanceof ClientApiError) {
 *     // Access request ID for debugging
 *     const requestId = error.requestId;
 *   }
 * }
 * ```
 */
export async function fetcher<T = any>(
  url: string,
  options?: FetcherOptions
): Promise<T> {
  // Prepare options
  const fetchOptions: RequestInit = {
    ...options,
  };

  // Auto-stringify body if it's an object
  if (options?.body && typeof options.body === 'object') {
    fetchOptions.body = JSON.stringify(options.body);
    
    // Set Content-Type if not already set
    if (!fetchOptions.headers) {
      fetchOptions.headers = {};
    }
    const headers = new Headers(fetchOptions.headers);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    fetchOptions.headers = headers;
  } else if (options?.body) {
    fetchOptions.body = options.body;
  }

  // Make request with CSRF protection
  const response = await fetchWithCsrf(url, fetchOptions);

  // Handle error responses
  if (!response.ok) {
    const error = await asClientError(response);
    throw error;
  }

  // Parse and return success response
  return response.json() as Promise<T>;
}

/**
 * Convenience method for GET requests
 * 
 * @example
 * ```typescript
 * const items = await fetcher.get<Item[]>('/api/items');
 * ```
 */
fetcher.get = async function <T = any>(
  url: string,
  options?: Omit<FetcherOptions, 'method' | 'body'>
): Promise<T> {
  return fetcher<T>(url, { ...options, method: 'GET' });
};

/**
 * Convenience method for POST requests
 * 
 * @example
 * ```typescript
 * const newItem = await fetcher.post<Item>('/api/items', {
 *   body: { name: 'New Item' }
 * });
 * ```
 */
fetcher.post = async function <T = any>(
  url: string,
  options?: Omit<FetcherOptions, 'method'>
): Promise<T> {
  return fetcher<T>(url, { ...options, method: 'POST' });
};

/**
 * Convenience method for PATCH requests
 * 
 * @example
 * ```typescript
 * const updated = await fetcher.patch<Item>('/api/items/123', {
 *   body: { name: 'Updated Name' }
 * });
 * ```
 */
fetcher.patch = async function <T = any>(
  url: string,
  options?: Omit<FetcherOptions, 'method'>
): Promise<T> {
  return fetcher<T>(url, { ...options, method: 'PATCH' });
};

/**
 * Convenience method for PUT requests
 * 
 * @example
 * ```typescript
 * const updated = await fetcher.put<Item>('/api/items/123', {
 *   body: { name: 'Updated Name', quantity: 10 }
 * });
 * ```
 */
fetcher.put = async function <T = any>(
  url: string,
  options?: Omit<FetcherOptions, 'method'>
): Promise<T> {
  return fetcher<T>(url, { ...options, method: 'PUT' });
};

/**
 * Convenience method for DELETE requests
 * 
 * @example
 * ```typescript
 * await fetcher.delete('/api/items/123');
 * ```
 */
fetcher.delete = async function <T = any>(
  url: string,
  options?: Omit<FetcherOptions, 'method' | 'body'>
): Promise<T> {
  return fetcher<T>(url, { ...options, method: 'DELETE' });
};

