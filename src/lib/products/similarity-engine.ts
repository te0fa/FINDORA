/**
 * src/lib/products/similarity-engine.ts
 * Product Similarity Engine
 *
 * Compares product specifications using weighted scoring:
 *  - RAM            20%
 *  - Storage        15%
 *  - CPU            15%
 *  - Battery        15%
 *  - Display        10%
 *  - Camera         10%
 *  - GPU             5%
 *  - Brand tier     10%
 *
 * Returns similarity score 0-100 (100 = identical specs)
 */

import type { ProductSpecifications } from '@/lib/dal/products'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('SimilarityEngine')

// ─── Weights ──────────────────────────────────────────────────────────────────

const WEIGHTS = {
  ram_gb: 0.20,
  storage_gb: 0.15,
  cpu: 0.15,
  battery_mah: 0.15,
  display_inches: 0.10,
  camera_mp: 0.10,
  gpu: 0.05,
  brand_tier: 0.10,
} as const

// ─── Brand Tier Mapping ───────────────────────────────────────────────────────

const BRAND_TIERS: Record<string, number> = {
  // Tier 1: Premium flagship
  apple: 5, samsung_flagship: 5, sony: 5,
  // Tier 2: High-end
  samsung: 4, huawei: 4, oneplus: 4, google: 4, xiaomi_pro: 4,
  // Tier 3: Mid-range
  xiaomi: 3, oppo: 3, vivo: 3, motorola: 3, lg: 3, lenovo: 3,
  // Tier 4: Budget
  realme: 2, tecno: 2, infinix: 2, itel: 2,
  // Tier 5: Unknown/generic
  generic: 1,
}

export function getBrandTier(brand: string | null | undefined): number {
  if (!brand) return 1
  const normalized = brand.toLowerCase().replace(/\s+/g, '_')
  return BRAND_TIERS[normalized] ?? BRAND_TIERS[brand.toLowerCase()] ?? 2
}

// ─── Spec Normalization ───────────────────────────────────────────────────────

/**
 * Normalize spec strings to numeric values.
 * Examples: "8GB" → 8, "256 GB" → 256, "5000 mAh" → 5000
 */
export function normalizeNumeric(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const match = value.match(/[\d.]+/)
    if (match) return parseFloat(match[0])
  }
  return null
}

/**
 * Normalize storage strings.
 * "1TB" → 1024, "512GB" → 512
 */
export function normalizeStorage(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const str = String(value).toLowerCase()
  const match = str.match(/([\d.]+)\s*(tb|gb|mb)?/)
  if (!match) return null
  const num = parseFloat(match[1])
  const unit = match[2] ?? 'gb'
  if (unit === 'tb') return num * 1024
  if (unit === 'mb') return num / 1024
  return num
}

// ─── Individual Dimension Comparators ────────────────────────────────────────

/**
 * Compare two numeric specs using proximity ratio.
 * Returns 0-1 (1 = identical, 0 = completely different)
 */
function compareNumeric(a: number | null, b: number | null): number {
  if (a === null && b === null) return 1.0  // both unknown = equal
  if (a === null || b === null) return 0.5  // one unknown = partial match
  if (a === 0 && b === 0) return 1.0
  const max = Math.max(a, b)
  const min = Math.min(a, b)
  return min / max
}

/**
 * Compare GPU/CPU brand strings (partial match).
 */
function compareString(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 1.0
  if (!a || !b) return 0.5
  const na = a.toLowerCase()
  const nb = b.toLowerCase()
  if (na === nb) return 1.0
  // Check if same family (e.g., "Snapdragon 888" vs "Snapdragon 870")
  const aWords = na.split(/\s+/)
  const bWords = nb.split(/\s+/)
  const shared = aWords.filter(w => bWords.includes(w)).length
  if (shared === 0) return 0.2
  return Math.min(0.8, shared / Math.max(aWords.length, bWords.length))
}

// ─── Main Similarity Computation ─────────────────────────────────────────────

export interface SimilarityResult {
  score: number           // 0-100
  breakdown: {
    ram: number
    storage: number
    cpu: number
    battery: number
    display: number
    camera: number
    gpu: number
    brand_tier: number
  }
  compatible: boolean     // true if score >= 50
}

export function computeSimilarity(
  specsA: ProductSpecifications,
  specsB: ProductSpecifications,
  brandA?: string | null,
  brandB?: string | null
): SimilarityResult {
  const ramScore     = compareNumeric(normalizeNumeric(specsA.ram_gb), normalizeNumeric(specsB.ram_gb))
  const storageScore = compareNumeric(normalizeStorage(specsA.storage_gb), normalizeStorage(specsB.storage_gb))
  const cpuScore     = compareString(specsA.cpu_brand, specsB.cpu_brand)
  const batteryScore = compareNumeric(normalizeNumeric(specsA.battery_mah), normalizeNumeric(specsB.battery_mah))
  const displayScore = compareNumeric(normalizeNumeric(specsA.display_inches), normalizeNumeric(specsB.display_inches))
  const cameraScore  = compareNumeric(normalizeNumeric(specsA.camera_mp), normalizeNumeric(specsB.camera_mp))
  const gpuScore     = compareString(specsA.gpu, specsB.gpu)

  const tierA = getBrandTier(brandA)
  const tierB = getBrandTier(brandB)
  const brandTierScore = compareNumeric(tierA, tierB)

  const weighted =
    ramScore     * WEIGHTS.ram_gb +
    storageScore * WEIGHTS.storage_gb +
    cpuScore     * WEIGHTS.cpu +
    batteryScore * WEIGHTS.battery_mah +
    displayScore * WEIGHTS.display_inches +
    cameraScore  * WEIGHTS.camera_mp +
    gpuScore     * WEIGHTS.gpu +
    brandTierScore * WEIGHTS.brand_tier

  const score = Math.round(weighted * 100)

  return {
    score,
    breakdown: {
      ram: Math.round(ramScore * 100),
      storage: Math.round(storageScore * 100),
      cpu: Math.round(cpuScore * 100),
      battery: Math.round(batteryScore * 100),
      display: Math.round(displayScore * 100),
      camera: Math.round(cameraScore * 100),
      gpu: Math.round(gpuScore * 100),
      brand_tier: Math.round(brandTierScore * 100),
    },
    compatible: score >= 50,
  }
}

// ─── Spec Difference Summary ──────────────────────────────────────────────────

export interface SpecComparison {
  spec: string
  spec_ar: string
  value_a: string
  value_b: string
  winner: 'a' | 'b' | 'tie'
  difference: string
}

export function compareSpecsDetailed(
  specsA: ProductSpecifications,
  specsB: ProductSpecifications,
  locale: 'ar' | 'en' = 'ar'
): SpecComparison[] {
  const results: SpecComparison[] = []

  const comparePair = (
    key: keyof ProductSpecifications,
    labelEn: string,
    labelAr: string,
    unit: string,
    normalize: (v: unknown) => number | null = normalizeNumeric
  ) => {
    const va = normalize(specsA[key])
    const vb = normalize(specsB[key])
    if (va === null && vb === null) return

    const winner: SpecComparison['winner'] =
      va === vb ? 'tie' : (va ?? 0) > (vb ?? 0) ? 'a' : 'b'

    const diff = va !== null && vb !== null
      ? `${Math.abs(va - vb)} ${unit}`
      : '—'

    results.push({
      spec: labelEn,
      spec_ar: labelAr,
      value_a: va !== null ? `${va} ${unit}` : '—',
      value_b: vb !== null ? `${vb} ${unit}` : '—',
      winner,
      difference: diff,
    })
  }

  comparePair('ram_gb', 'RAM', 'ذاكرة RAM', 'GB')
  comparePair('storage_gb', 'Storage', 'التخزين', 'GB', normalizeStorage)
  comparePair('battery_mah', 'Battery', 'البطارية', 'mAh')
  comparePair('camera_mp', 'Camera', 'الكاميرا', 'MP')
  comparePair('display_inches', 'Display', 'الشاشة', 'inch')
  comparePair('display_hz', 'Refresh Rate', 'معدل التحديث', 'Hz')
  comparePair('weight_grams', 'Weight', 'الوزن', 'g')

  return results
}
