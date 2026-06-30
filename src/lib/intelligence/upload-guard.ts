/**
 * src/lib/intelligence/upload-guard.ts
 * Zero-cost pre-AI protection layer for image uploads.
 * Runs BEFORE any Storage upload or AI API call.
 *
 * Order of checks (wire in this exact order in the API route):
 *   1. guardImageUpload()    — size + MIME type check (no buffer needed)
 *   2. guardImageDimensions() — sharp metadata check (buffer required)
 */

import type sharp from 'sharp'
import { getFeatureConfig } from '@/lib/feature-flags/feature-service'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GuardResult {
  valid: true
}
export interface GuardFailure {
  valid: false
  reason: string
  reasonAr: string
}
export type GuardResponse = GuardResult | GuardFailure

// ─── Guard 1: Size + MIME Type ────────────────────────────────────────────────

/**
 * Validates file size and MIME type against values stored in the
 * `image_upload` feature flag config.
 * No buffer reading, no AI call — pure in-memory check.
 */
export async function guardImageUpload(file: {
  size: number
  type: string
}): Promise<GuardResponse> {
  const config = await getFeatureConfig('image_upload')

  const maxSizeMb = typeof config.max_size_mb === 'number' ? config.max_size_mb : 8
  const allowedTypes = Array.isArray(config.allowed_types)
    ? (config.allowed_types as string[])
    : ['image/jpeg', 'image/png', 'image/webp']

  const maxSizeBytes = maxSizeMb * 1024 * 1024

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      reason: 'FILE_TOO_LARGE',
      reasonAr: `الملف أكبر من الحد المسموح (${maxSizeMb} ميجابايت)`,
    }
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      reason: 'UNSUPPORTED_TYPE',
      reasonAr: `نوع الملف غير مدعوم. الأنواع المسموح بها: ${allowedTypes.join(', ')}`,
    }
  }

  return { valid: true }
}

// ─── Guard 2: Image Dimensions (via sharp) ────────────────────────────────────

const MIN_DIMENSION_PX = 100

/**
 * Validates image dimensions to reject corrupted, empty, or
 * suspiciously tiny files before any AI call.
 * Uses `sharp` to read metadata from the buffer (no disk I/O).
 */
export async function guardImageDimensions(buffer: Buffer): Promise<GuardResponse> {
  // Dynamic import keeps sharp out of the client bundle
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharpLib = (await import('sharp')).default as typeof sharp

  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>
  try {
    metadata = await sharpLib(buffer).metadata()
  } catch {
    return {
      valid: false,
      reason: 'UNREADABLE_IMAGE',
      reasonAr: 'الصورة تالفة أو لا يمكن قراءتها، يرجى رفع ملف سليم',
    }
  }

  const { width, height } = metadata

  if (!width || !height) {
    return {
      valid: false,
      reason: 'MISSING_DIMENSIONS',
      reasonAr: 'الصورة صغيرة جداً أو تالفة، يرجى رفع صورة واضحة',
    }
  }

  if (width < MIN_DIMENSION_PX || height < MIN_DIMENSION_PX) {
    return {
      valid: false,
      reason: 'IMAGE_TOO_SMALL',
      reasonAr: `الصورة صغيرة جداً أو تالفة (الحد الأدنى ${MIN_DIMENSION_PX}×${MIN_DIMENSION_PX} بيكسل)`,
    }
  }

  return { valid: true }
}
