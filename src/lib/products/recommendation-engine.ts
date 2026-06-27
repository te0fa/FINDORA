/**
 * src/lib/products/recommendation-engine.ts
 * Alternative Product Recommendation Engine V1
 *
 * Pure algorithmic — no AI required.
 *
 * Scoring:
 *  40% — Category match (exact > subcategory)
 *  30% — Price similarity (proximity within budget range)
 *  20% — Spec similarity (delegated to similarity-engine)
 *  10% — Popularity score
 *
 * Returns: Top 10 alternatives with score + reasons
 */

import { createAdminClient } from '@/lib/dal/customers'
import type { Product } from '@/lib/dal/products'
import { computeSimilarity } from './similarity-engine'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('RecommendationEngine')

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AlternativeProduct {
  product: Product
  total_score: number         // 0-100
  category_score: number      // 0-40
  price_score: number         // 0-30
  spec_score: number          // 0-20
  popularity_score: number    // 0-10
  reasons: AlternativeReason[]
  savings_amount: number | null
  savings_pct: number | null
}

export interface AlternativeReason {
  type: 'cheaper' | 'similar_specs' | 'same_brand' | 'better_battery' |
        'better_camera' | 'more_ram' | 'more_storage' | 'same_category' |
        'popular' | 'best_price_now'
  label_ar: string
  label_en: string
  value?: string
}

// ─── Scoring Functions ────────────────────────────────────────────────────────

function scoreCategoryMatch(target: Product, candidate: Product): number {
  if (target.category === candidate.category) {
    if (target.subcategory && candidate.subcategory === target.subcategory) return 40  // exact
    return 35  // same category, different subcategory
  }
  // Partial match (e.g., "Electronics - Mobiles" vs "Electronics - Tablets")
  const targetParent = target.category.split(' - ')[0]
  const candidateParent = candidate.category.split(' - ')[0]
  if (targetParent === candidateParent) return 15
  return 0
}

function scorePriceSimilarity(
  targetPrice: number,
  candidatePrice: number
): { score: number; savings: number | null; savingsPct: number | null } {
  if (candidatePrice <= 0) return { score: 0, savings: null, savingsPct: null }

  const ratio = Math.min(targetPrice, candidatePrice) / Math.max(targetPrice, candidatePrice)
  const score = Math.round(ratio * 30)  // max 30 points

  // Calculate savings if alternative is cheaper
  const savings = targetPrice > candidatePrice
    ? parseFloat((targetPrice - candidatePrice).toFixed(2))
    : null
  const savingsPct = savings && targetPrice > 0
    ? parseFloat(((savings / targetPrice) * 100).toFixed(2))
    : null

  return { score, savings, savingsPct }
}

function scorePopularity(popularityScore: number, maxPopularity: number): number {
  if (maxPopularity === 0) return 5
  return Math.round((popularityScore / maxPopularity) * 10)
}

// ─── Reason Generation ────────────────────────────────────────────────────────

function generateReasons(
  target: Product,
  candidate: Product,
  savingsAmount: number | null,
  savingsPct: number | null,
  specBreakdown: ReturnType<typeof computeSimilarity>['breakdown']
): AlternativeReason[] {
  const reasons: AlternativeReason[] = []

  if (savingsAmount && savingsPct && savingsPct >= 5) {
    reasons.push({
      type: 'cheaper',
      label_ar: `أرخص بـ ${savingsPct.toFixed(0)}% (توفير ${savingsAmount.toLocaleString('ar-EG')} ج.م)`,
      label_en: `${savingsPct.toFixed(0)}% cheaper (save EGP ${savingsAmount.toLocaleString()})`,
      value: savingsPct.toFixed(1),
    })
  }

  if (target.brand === candidate.brand) {
    reasons.push({
      type: 'same_brand',
      label_ar: `نفس الماركة: ${candidate.brand}`,
      label_en: `Same brand: ${candidate.brand}`,
    })
  }

  const tSpecs = target.specifications
  const cSpecs = candidate.specifications

  const tRam = Number(tSpecs.ram_gb ?? 0)
  const cRam = Number(cSpecs.ram_gb ?? 0)
  if (cRam > tRam && tRam > 0) {
    reasons.push({
      type: 'more_ram',
      label_ar: `ذاكرة أكبر: ${cRam}GB مقابل ${tRam}GB`,
      label_en: `More RAM: ${cRam}GB vs ${tRam}GB`,
    })
  }

  const tBattery = Number(tSpecs.battery_mah ?? 0)
  const cBattery = Number(cSpecs.battery_mah ?? 0)
  if (cBattery > tBattery * 1.1 && tBattery > 0) {
    reasons.push({
      type: 'better_battery',
      label_ar: `بطارية أكبر: ${cBattery.toLocaleString()} mAh`,
      label_en: `Better battery: ${cBattery.toLocaleString()} mAh`,
    })
  }

  const tCamera = Number(tSpecs.camera_mp ?? 0)
  const cCamera = Number(cSpecs.camera_mp ?? 0)
  if (cCamera > tCamera * 1.1 && tCamera > 0) {
    reasons.push({
      type: 'better_camera',
      label_ar: `كاميرا أفضل: ${cCamera}MP`,
      label_en: `Better camera: ${cCamera}MP`,
    })
  }

  if (specBreakdown.storage >= 80) {
    const cStorage = Number(cSpecs.storage_gb ?? 0)
    if (cStorage > 0) {
      reasons.push({
        type: 'more_storage',
        label_ar: `تخزين مشابه: ${cStorage}GB`,
        label_en: `Similar storage: ${cStorage}GB`,
      })
    }
  }

  if (reasons.length === 0) {
    reasons.push({
      type: 'same_category',
      label_ar: `نفس الفئة: ${candidate.category}`,
      label_en: `Same category: ${candidate.category}`,
    })
  }

  return reasons.slice(0, 5)  // max 5 reasons per alternative
}

// ─── Main Recommendation Function ─────────────────────────────────────────────

export async function findAlternatives(
  productId: string,
  options: { limit?: number; maxPriceMultiplier?: number } = {}
): Promise<AlternativeProduct[]> {
  const { limit = 10, maxPriceMultiplier = 1.5 } = options
  const admin = await createAdminClient()

  // 1. Fetch target product
  const { data: target, error: targetError } = await (admin as any)
    .from('products')
    .select('*')
    .eq('id', productId)
    .single() as { data: Product | null; error: any }

  if (targetError || !target) {
    log.error('Target product not found', { productId })
    return []
  }

  // 2. Fetch candidate products (same parent category, active, not itself)
  const parentCategory = target.category.split(' - ')[0]
  let priceFilter: number | null = target.current_price
    ? target.current_price * maxPriceMultiplier
    : null

  let query = (admin as any)
    .from('products')
    .select('*')
    .neq('id', productId)
    .eq('is_active', true)
    .ilike('category', `${parentCategory}%`)

  if (priceFilter) query = query.lte('current_price', priceFilter)

  const { data: candidates, error: candidatesError } = await query
    .limit(100) as { data: Product[] | null; error: any }

  if (candidatesError || !candidates?.length) {
    log.warn('No candidates found', { productId, category: target.category })
    return []
  }

  // 3. Max popularity for normalization
  const maxPopularity = Math.max(...candidates.map(c => c.popularity_score), 1)

  // 4. Score each candidate
  const scored: AlternativeProduct[] = candidates.map(candidate => {
    const categoryScore = scoreCategoryMatch(target, candidate)

    const targetPrice = target.current_price ?? 0
    const candidatePrice = candidate.current_price ?? 0
    const { score: priceScore, savings, savingsPct } =
      targetPrice > 0 && candidatePrice > 0
        ? scorePriceSimilarity(targetPrice, candidatePrice)
        : { score: 15, savings: null, savingsPct: null }

    const similarity = computeSimilarity(
      target.specifications ?? {},
      candidate.specifications ?? {},
      target.brand,
      candidate.brand
    )
    const specScore = Math.round((similarity.score / 100) * 20)

    const popScore = scorePopularity(candidate.popularity_score, maxPopularity)
    const totalScore = categoryScore + priceScore + specScore + popScore

    const reasons = generateReasons(
      target, candidate, savings, savingsPct, similarity.breakdown
    )

    return {
      product: candidate,
      total_score: totalScore,
      category_score: categoryScore,
      price_score: priceScore,
      spec_score: specScore,
      popularity_score: popScore,
      reasons,
      savings_amount: savings,
      savings_pct: savingsPct,
    }
  })

  // 5. Sort by total score DESC, return top N
  const results = scored
    .filter(s => s.total_score >= 20)          // minimum relevance threshold
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, limit)

  log.info('Alternatives computed', {
    productId,
    candidatesEvaluated: candidates.length,
    returned: results.length,
  })

  return results
}
