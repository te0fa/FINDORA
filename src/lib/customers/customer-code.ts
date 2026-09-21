import crypto from 'crypto';

/**
 * Crockford Base32 character set (32 characters, 5 bits per character).
 * Excludes ambiguous characters (I, L, O, U) for high readability and easy copying.
 */
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 10;
const CODE_PREFIX = 'CUST-';

/**
 * Maximum number of attempts to generate a unique customer code before giving up.
 */
export const MAX_CUSTOMER_CODE_RETRIES = 3;

/**
 * Generates a collision-resistant, human-readable customer code.
 *
 * Uses Node's cryptographic random generator (crypto.randomInt) to guarantee uniform
 * distribution with zero modulo bias across the 32-character Crockford alphabet.
 * 10 characters * 5 bits = 50 bits of entropy (~1.125 x 10^15 possible codes).
 *
 * @returns e.g. "CUST-7K9M2P4X8W"
 */
export function generateCustomerCode(): string {
  let chars = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = crypto.randomInt(0, CODE_ALPHABET.length);
    chars += CODE_ALPHABET[idx];
  }
  return `${CODE_PREFIX}${chars}`;
}

/**
 * Determines whether a database error corresponds specifically to a
 * customer_code UNIQUE constraint violation (SQLSTATE 23505).
 *
 * Accurately isolates customer_code conflicts while avoiding misclassification
 * of phone_number_normalized, auth_user_id, or other unique constraint violations.
 */
export function isCustomerCodeConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; message?: string; details?: string };

  if (err.code !== '23505') {
    return false;
  }

  const message = String(err.message || '');
  const details = String(err.details || '');

  // Must reference customers_customer_code_key constraint or customer_code column
  return (
    message.includes('customers_customer_code_key') ||
    message.includes('customer_code') ||
    details.includes('customer_code')
  );
}

/**
 * Validates whether a given string is a plausible customer code.
 * Backward-compatible with historical formats (e.g. CUST-1234, CUST-E2E-LEGACY)
 * and modern cryptographic codes (CUST-XXXXXXXXXX).
 */
export function isValidCustomerCode(code: unknown): boolean {
  if (typeof code !== 'string') return false;
  return /^CUST-[A-Z0-9_-]{4,20}$/i.test(code.trim());
}
