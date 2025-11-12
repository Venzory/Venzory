/**
 * Domain validation rules
 * Business rule validators that ensure domain constraints
 */

import { ValidationError } from '../errors';

/**
 * Validate GTIN (Global Trade Item Number)
 * Supports GTIN-8, GTIN-12, GTIN-13, and GTIN-14 formats
 */
export function validateGtin(gtin: string): boolean {
  if (!gtin) return false;
  
  // Remove any whitespace or dashes
  const cleaned = gtin.replace(/[\s-]/g, '');
  
  // Check length (8, 12, 13, or 14 digits)
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(cleaned)) {
    return false;
  }
  
  // Validate check digit using GS1 algorithm
  const digits = cleaned.split('').map(Number);
  const checkDigit = digits.pop()!;
  
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    // Multiply alternating digits by 3 and 1 (from right to left)
    const multiplier = (digits.length - i) % 2 === 0 ? 1 : 3;
    sum += digits[i] * multiplier;
  }
  
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  return calculatedCheckDigit === checkDigit;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate quantity is positive
 */
export function validatePositiveQuantity(quantity: number): void {
  if (!Number.isInteger(quantity)) {
    throw new ValidationError('Quantity must be a whole number');
  }
  if (quantity <= 0) {
    throw new ValidationError('Quantity must be greater than zero');
  }
}

/**
 * Validate quantity after adjustment won't be negative
 */
export function validateNonNegativeResult(current: number, adjustment: number): void {
  const result = current + adjustment;
  if (result < 0) {
    throw new ValidationError(
      `Adjustment would result in negative quantity (${current} + ${adjustment} = ${result})`
    );
  }
}

/**
 * Validate price is non-negative
 */
export function validatePrice(price: number): void {
  if (price < 0) {
    throw new ValidationError('Price cannot be negative');
  }
}

/**
 * Validate string length
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  min: number = 1,
  max?: number
): void {
  if (value.length < min) {
    throw new ValidationError(`${fieldName} must be at least ${min} characters`);
  }
  if (max && value.length > max) {
    throw new ValidationError(`${fieldName} must not exceed ${max} characters`);
  }
}

/**
 * Validate SKU format (alphanumeric with optional hyphens and underscores)
 */
export function validateSku(sku: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(sku);
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate date is not in the past
 */
export function validateFutureDate(date: Date, fieldName: string = 'Date'): void {
  const now = new Date();
  if (date < now) {
    throw new ValidationError(`${fieldName} cannot be in the past`);
  }
}

/**
 * Validate expiry date is reasonable (not too far in past or future)
 */
export function validateExpiryDate(expiryDate: Date): void {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const tenYearsAhead = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate());
  
  if (expiryDate < oneYearAgo) {
    throw new ValidationError('Expiry date is too far in the past');
  }
  
  if (expiryDate > tenYearsAhead) {
    throw new ValidationError('Expiry date is too far in the future');
  }
}

/**
 * Validate order can be sent (has items, supplier, etc.)
 */
export function validateOrderCanBeSent(order: {
  status: string;
  items: any[];
  supplierId: string | null;
}): void {
  if (order.status !== 'DRAFT') {
    throw new ValidationError('Only draft orders can be sent');
  }
  
  if (!order.supplierId) {
    throw new ValidationError('Order must have a supplier');
  }
  
  if (order.items.length === 0) {
    throw new ValidationError('Order must have at least one item');
  }
  
  const invalidItems = order.items.filter((item: any) => item.quantity <= 0);
  if (invalidItems.length > 0) {
    throw new ValidationError('All order items must have positive quantities');
  }
}

/**
 * Validate receipt can be confirmed
 */
export function validateReceiptCanBeConfirmed(receipt: {
  status: string;
  lines: any[];
}): void {
  if (receipt.status !== 'DRAFT') {
    throw new ValidationError('Only draft receipts can be confirmed');
  }
  
  if (receipt.lines.length === 0) {
    throw new ValidationError('Receipt must have at least one line');
  }
  
  const invalidLines = receipt.lines.filter((line: any) => line.quantity <= 0);
  if (invalidLines.length > 0) {
    throw new ValidationError('All receipt lines must have positive quantities');
  }
}

/**
 * Validate transfer locations are different
 */
export function validateTransferLocations(fromLocationId: string, toLocationId: string): void {
  if (fromLocationId === toLocationId) {
    throw new ValidationError('Cannot transfer to the same location');
  }
}

/**
 * Validate GTIN format and throw error if invalid
 */
export function validateGtinOrThrow(gtin: string, fieldName: string = 'GTIN'): void {
  if (!validateGtin(gtin)) {
    throw new ValidationError(
      `${fieldName} format is invalid. Must be a valid GTIN-8, GTIN-12, GTIN-13, or GTIN-14 with correct check digit.`
    );
  }
}

/**
 * Validate that two entities belong to the same practice
 * Used for cross-entity validation to prevent cross-practice data leakage
 */
export function validateSamePractice(
  entityA: { practiceId: string; name: string },
  entityB: { practiceId: string; name: string },
  errorMessage?: string
): void {
  if (entityA.practiceId !== entityB.practiceId) {
    throw new ValidationError(
      errorMessage || 
      `${entityA.name} and ${entityB.name} must belong to the same practice`
    );
  }
}

