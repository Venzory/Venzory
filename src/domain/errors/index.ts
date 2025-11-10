/**
 * Domain-level errors
 * These errors represent business logic violations and domain constraints
 */

export class DomainError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'DOMAIN_ERROR',
    statusCode: number = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id?: string) {
    const message = id 
      ? `${entity} with ID '${id}' not found`
      : `${entity} not found`;
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 422, details);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class BusinessRuleViolationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'BUSINESS_RULE_VIOLATION', 422, details);
    this.name = 'BusinessRuleViolationError';
  }
}

/**
 * Helper to determine if an error is a DomainError
 */
export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/**
 * Convert any error to a DomainError
 */
export function toDomainError(error: unknown): DomainError {
  if (isDomainError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new DomainError(error.message, 'INTERNAL_ERROR', 500);
  }

  return new DomainError('An unexpected error occurred', 'INTERNAL_ERROR', 500);
}

