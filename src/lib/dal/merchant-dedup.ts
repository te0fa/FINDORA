import { createAdminClient } from './customers'
import { createVendor, Vendor } from './vendors'

/**
 * Normalizes phone numbers (removes all non-digit characters)
 */
export function normalizePhone(phone: string | null): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/\D/g, '')
  // If it starts with local Egyptian prefix, clean to standard length
  if (cleaned.startsWith('20') && cleaned.length > 2) {
    return cleaned.slice(2)
  }
  return cleaned
}

/**
 * Normalizes Arabic text for deduplication:
 * - Unifies Alefs (أ, إ, آ, ٱ -> ا)
 * - Unifies Taa Marbuta and Haa (ة -> ه)
 * - Unifies Yaas (ى -> ي)
 * - Strips common prefixes like "ال" (al-) and "محل" (shop)
 * - Strips non-alphanumeric, extra whitespace, and converts to lowercase
 */
export function normalizeArabicName(name: string): string {
  if (!name) return ''
  let cleaned = name.trim().toLowerCase()

  // Unify characters
  cleaned = cleaned.replace(/[أإآٱ]/g, 'ا')
  cleaned = cleaned.replace(/ة/g, 'ه')
  cleaned = cleaned.replace(/ى/g, 'ي')

  // Remove common prefixes/prefixes with spaces
  cleaned = cleaned.replace(/^(الـ|ال|محل\s+|معرض\s+|شركة\s+)/g, '')

  // Strip non-alphanumeric/spaces
  cleaned = cleaned.replace(/[^\w\s\u0600-\u06FF]/gi, '')
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  return cleaned
}

/**
 * Computes Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  )

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + 1   // substitution
        )
      }
    }
  }
  return matrix[a.length][b.length]
}

/**
 * Checks similarity percentage based on Levenshtein distance
 */
export function areNamesSimilar(nameA: string, nameB: string, threshold = 0.85): boolean {
  const normA = normalizeArabicName(nameA)
  const normB = normalizeArabicName(nameB)

  if (normA === normB) return true

  const maxLength = Math.max(normA.length, normB.length)
  if (maxLength === 0) return true

  const distance = levenshteinDistance(normA, normB)
  const similarity = 1 - distance / maxLength
  return similarity >= threshold
}

/**
 * Resolves a vendor by name or phone, checking for potential duplicates.
 * Re-uses existing vendor profile or creates a new one.
 */
export async function findOrCreateVendorNormalized(
  displayName: string,
  phone: string | null,
  governorate?: string | null,
  area?: string | null
): Promise<Vendor> {
  const client = await createAdminClient() as any
  const normalizedPhoneInput = normalizePhone(phone)

  // 1. Check exact phone number match (if phone is provided)
  if (normalizedPhoneInput) {
    const { data: phoneMatch } = await client
      .from('vendors')
      .select('*')
      .ilike('whatsapp_number', `%${normalizedPhoneInput}%`)
      .limit(1)
      .maybeSingle()

    if (phoneMatch) {
      return phoneMatch
    }
  }

  // 2. Fetch all active vendors to compare display name similarity
  const { data: allVendors } = await client
    .from('vendors')
    .select('*')
    .eq('system_status', 'Active')

  if (allVendors && allVendors.length > 0) {
    for (const vendor of allVendors) {
      if (areNamesSimilar(vendor.display_name, displayName)) {
        return vendor
      }
    }
  }

  // 3. No match found, create a new vendor profile
  return await createVendor({
    display_name: displayName,
    whatsapp_number: phone || undefined,
    governorate: governorate || undefined,
    area: area || undefined,
    specialization_ids: []
  })
}
