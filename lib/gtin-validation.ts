/**
 * GTIN (Global Trade Item Number) Validation Utilities
 * Supports GTIN-8, GTIN-12 (UPC), GTIN-13 (EAN), and GTIN-14
 */

/**
 * Valid GTIN lengths
 */
const VALID_GTIN_LENGTHS = [8, 12, 13, 14] as const;
type GtinLength = (typeof VALID_GTIN_LENGTHS)[number];

/**
 * GTIN validation result
 */
export interface GtinValidationResult {
  valid: boolean;
  error?: string;
  normalizedGtin?: string;
  gtinType?: 'GTIN-8' | 'GTIN-12' | 'GTIN-13' | 'GTIN-14';
}

/**
 * Calculate the check digit for a GTIN using the standard Modulo 10 algorithm
 * 
 * The check digit is calculated by:
 * 1. Starting from the rightmost digit (excluding check digit position)
 * 2. Alternating multipliers of 3 and 1
 * 3. Summing all products
 * 4. Check digit = (10 - (sum mod 10)) mod 10
 */
export function calculateGtinCheckDigit(gtinWithoutCheckDigit: string): number {
  // Reverse the string to process from right to left
  const digits = gtinWithoutCheckDigit.split('').reverse();
  
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const digit = parseInt(digits[i], 10);
    // Alternating multipliers: 3, 1, 3, 1, ... starting from the right
    const multiplier = i % 2 === 0 ? 3 : 1;
    sum += digit * multiplier;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit;
}

/**
 * Validate a GTIN string
 */
export function validateGtin(gtin: string | null | undefined): GtinValidationResult {
  // Handle null/undefined/empty
  if (!gtin || gtin.trim() === '') {
    return { valid: false, error: 'GTIN is required' };
  }

  // Remove any spaces, dashes, or other separators
  const cleaned = gtin.replace(/[\s\-\.]/g, '');

  // Check if it's numeric only
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: 'GTIN must contain only digits' };
  }

  // Check length
  const length = cleaned.length;
  if (!VALID_GTIN_LENGTHS.includes(length as GtinLength)) {
    return { 
      valid: false, 
      error: `GTIN must be 8, 12, 13, or 14 digits. Got ${length} digits.` 
    };
  }

  // Validate check digit
  const gtinWithoutCheckDigit = cleaned.slice(0, -1);
  const providedCheckDigit = parseInt(cleaned.slice(-1), 10);
  const calculatedCheckDigit = calculateGtinCheckDigit(gtinWithoutCheckDigit);

  if (providedCheckDigit !== calculatedCheckDigit) {
    return { 
      valid: false, 
      error: `Invalid check digit. Expected ${calculatedCheckDigit}, got ${providedCheckDigit}.` 
    };
  }

  // Determine GTIN type
  const gtinType = getGtinType(length as GtinLength);

  return {
    valid: true,
    normalizedGtin: cleaned,
    gtinType,
  };
}

/**
 * Get the GTIN type based on length
 */
function getGtinType(length: GtinLength): 'GTIN-8' | 'GTIN-12' | 'GTIN-13' | 'GTIN-14' {
  switch (length) {
    case 8:
      return 'GTIN-8';
    case 12:
      return 'GTIN-12';
    case 13:
      return 'GTIN-13';
    case 14:
      return 'GTIN-14';
  }
}

/**
 * Normalize a GTIN to 14 digits (GTIN-14 format)
 * Pads with leading zeros
 */
export function normalizeToGtin14(gtin: string): string | null {
  const result = validateGtin(gtin);
  if (!result.valid || !result.normalizedGtin) {
    return null;
  }
  return result.normalizedGtin.padStart(14, '0');
}

/**
 * Check if a GTIN looks like it could be valid (basic format check)
 * Useful for real-time validation before submitting
 */
export function isGtinLikeFormat(input: string): boolean {
  const cleaned = input.replace(/[\s\-\.]/g, '');
  return /^\d{8,14}$/.test(cleaned);
}

/**
 * Format a GTIN for display with optional grouping
 * GTIN-13: X XXXXXX XXXXX X (1-6-5-1)
 * GTIN-14: X XX XXXXX XXXXX X (1-2-5-5-1)
 */
export function formatGtinForDisplay(gtin: string): string {
  const result = validateGtin(gtin);
  if (!result.valid || !result.normalizedGtin) {
    return gtin; // Return as-is if invalid
  }

  const cleaned = result.normalizedGtin;
  
  switch (cleaned.length) {
    case 13:
      // EAN-13: X XXXXXX XXXXX X
      return `${cleaned.slice(0, 1)} ${cleaned.slice(1, 7)} ${cleaned.slice(7, 12)} ${cleaned.slice(12)}`;
    case 14:
      // GTIN-14: X XX XXXXX XXXXX X
      return `${cleaned.slice(0, 1)} ${cleaned.slice(1, 3)} ${cleaned.slice(3, 8)} ${cleaned.slice(8, 13)} ${cleaned.slice(13)}`;
    default:
      return cleaned;
  }
}

/**
 * Check if two GTINs are equivalent (after normalization to GTIN-14)
 */
export function areGtinsEquivalent(gtin1: string, gtin2: string): boolean {
  const normalized1 = normalizeToGtin14(gtin1);
  const normalized2 = normalizeToGtin14(gtin2);
  
  if (!normalized1 || !normalized2) {
    return false;
  }
  
  return normalized1 === normalized2;
}

/**
 * Generate a valid check digit for a partial GTIN
 * Input should be GTIN without the check digit
 */
export function generateCheckDigit(partialGtin: string): number | null {
  const cleaned = partialGtin.replace(/[\s\-\.]/g, '');
  
  if (!/^\d+$/.test(cleaned)) {
    return null;
  }
  
  const expectedLength = cleaned.length + 1;
  if (!VALID_GTIN_LENGTHS.includes(expectedLength as GtinLength)) {
    return null;
  }
  
  return calculateGtinCheckDigit(cleaned);
}

