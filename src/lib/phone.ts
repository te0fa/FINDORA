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
