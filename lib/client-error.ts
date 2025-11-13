/**
 * Client-side API Error Handling
 * 
 * Provides utilities for parsing and handling API error responses
 * with user-friendly messages and request tracking.
 */

/**
 * API Error Response Structure
 * Matches the server-side error format from lib/error-handler.ts
 */
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Client-side API Error
 * Represents an error from an API call with full context
 */
export class ClientApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly requestId: string | null;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    requestId: string | null = null,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ClientApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.requestId = requestId;
    this.details = details;

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Parse an API error response and create a ClientApiError
 * 
 * @param response - The fetch Response object (must have !response.ok)
 * @returns Promise resolving to ClientApiError with parsed details
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/items');
 * if (!response.ok) {
 *   const error = await asClientError(response);
 *   throw error;
 * }
 * ```
 */
export async function asClientError(response: Response): Promise<ClientApiError> {
  const requestId = response.headers.get('X-Request-Id');
  const statusCode = response.status;

  try {
    // Try to parse error response JSON
    const data: ApiErrorResponse = await response.json();

    if (data.error) {
      return new ClientApiError(
        data.error.message,
        data.error.code,
        statusCode,
        requestId,
        data.error.details
      );
    }
  } catch (parseError) {
    // Response body is not valid JSON or doesn't match expected format
  }

  // Fallback for non-standard error responses
  return new ClientApiError(
    response.statusText || 'Request failed',
    'UNKNOWN_ERROR',
    statusCode,
    requestId
  );
}

/**
 * Map error code to user-friendly message
 * Includes request ID suffix for support tracking
 */
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Please sign in to continue',
  FORBIDDEN: "You don't have permission to perform this action",
  VALIDATION_ERROR: 'Please check your input',
  BUSINESS_RULE_VIOLATION: 'This action violates business rules',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again in a moment',
  INTERNAL_ERROR: 'Something went wrong. Please try again',
  UNKNOWN_ERROR: 'An unexpected error occurred',
};

/**
 * Codes that should use the server-provided message directly
 * These are specific enough to be user-friendly
 */
const USE_SERVER_MESSAGE_CODES = [
  'NOT_FOUND',
  'CONFLICT',
  'VALIDATION_ERROR', // Validation errors often have specific field info
  'BUSINESS_RULE_VIOLATION',
];

/**
 * Format request ID as short suffix
 * Takes first 6 characters for brevity
 * 
 * @example "#abc123"
 */
function formatRequestId(requestId: string | null): string {
  if (!requestId) return '';
  const shortId = requestId.slice(0, 6);
  return ` (#${shortId})`;
}

/**
 * Convert ClientApiError to user-friendly message
 * 
 * Maps error codes to friendly messages and appends request ID
 * for support tracking.
 * 
 * @param error - The ClientApiError to convert
 * @returns User-friendly error message with request ID
 * 
 * @example
 * ```typescript
 * try {
 *   const data = await fetcher.post('/api/items', { body: item });
 * } catch (error) {
 *   if (error instanceof ClientApiError) {
 *     toast.error(toUserMessage(error)); // "Please sign in to continue (#abc123)"
 *   }
 * }
 * ```
 */
export function toUserMessage(error: ClientApiError): string {
  let message: string;

  // Use server message for specific codes
  if (USE_SERVER_MESSAGE_CODES.includes(error.code)) {
    message = error.message;
  } else {
    // Use mapped friendly message or fallback
    message = ERROR_MESSAGES[error.code] || ERROR_MESSAGES.INTERNAL_ERROR;
  }

  // Append request ID for support
  const requestIdSuffix = formatRequestId(error.requestId);
  return message + requestIdSuffix;
}

/**
 * Type guard to check if error is a ClientApiError
 */
export function isClientApiError(error: unknown): error is ClientApiError {
  return error instanceof ClientApiError;
}

