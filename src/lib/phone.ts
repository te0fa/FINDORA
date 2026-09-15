/**
 * Normalizes a phone number for the Findora platform.
 * 
 * Rules:
 * 1. Trims all spaces and removes non-numeric characters (except leading '+').
 * 2. If it starts with '00', replaces it with '+'.
 * 3. If it is an Egyptian local mobile (e.g., 010, 011, 012, 015), assumes +20.
 * 4. If it starts with '201' (11 digits total), assumes it's an Egyptian number missing the '+' and adds it.
 * 5. Otherwise, if it has a '+', keeps it.
 * 6. Returns null if the phone number is invalid or empty.
 */
export function normalizePhone(rawPhone: string | null | undefined): { raw: string, normalized: string } | null {
  if (!rawPhone) return null;

  const raw = rawPhone.trim();
  let normalized = raw.replace(/[^\d+]/g, '');

  // Replace starting '00' with '+'
  if (normalized.startsWith('00')) {
    normalized = '+' + normalized.substring(2);
  }

  // Handle Egyptian numbers starting with '01' (11 digits: 01X XXXX XXXX)
  if (normalized.length === 11 && normalized.startsWith('01')) {
    normalized = '+20' + normalized.substring(1);
  }

  // Handle Egyptian numbers starting with '201' (12 digits: 201X XXXX XXXX)
  if (normalized.length === 12 && normalized.startsWith('201')) {
    normalized = '+' + normalized;
  }

  // If there's no '+' but it has numbers, assume it needs a '+' (basic fallback)
  // But we mostly care about standardizing to E.164-like format.
  if (!normalized.startsWith('+') && normalized.length >= 10) {
    normalized = '+' + normalized;
  }

  if (normalized.length < 10) {
    // Too short to be valid
    return null;
  }

  return {
    raw,
    normalized,
  };
}

/**
 * Egyptian mobile regex matching all accepted formats:
 * - 01[0125]XXXXXXXX (11 digits with leading 0)
 * - +201[0125]XXXXXXXX (E.164 with +20)
 * - 00201[0125]XXXXXXXX (with international 0020)
 * - 201[0125]XXXXXXXX (12 digits with 20 prefix)
 * - 1[0125]XXXXXXXX (10 digits bare national number)
 *
 * Valid mobile operators:
 * - 010: Vodafone
 * - 011: Etisalat
 * - 012: Orange
 * - 015: WE (Telecom Egypt)
 *
 * Note: Fixes previous regex character-class bug ([0-2|5] which matched literal '|').
 */
export const EGYPTIAN_MOBILE_REGEX = /^(\+20|0020|20|0)?(1[0125]\d{8})$/;

/**
 * Validates and converts any supported Egyptian mobile phone format into
 * the canonical platform identity format: +201XXXXXXXXX (13 characters).
 *
 * Strips whitespace and common punctuation (dashes, parentheses).
 * Returns null if invalid or not a valid Egyptian mobile number.
 */
export function canonicalizeEgyptianMobile(rawPhone: string | null | undefined): string | null {
  if (!rawPhone || typeof rawPhone !== 'string') return null;

  const cleaned = rawPhone.replace(/[\s\-()]/g, '');
  const match = cleaned.match(EGYPTIAN_MOBILE_REGEX);
  if (!match) return null;

  const nationalNumber = match[2]; // 1[0125]\d{8} (10 digits)
  return `+20${nationalNumber}`;
}
