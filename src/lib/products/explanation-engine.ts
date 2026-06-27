/**
 * src/lib/products/explanation-engine.ts
 * Explainable Recommendation Engine
 *
 * Generates human-readable, structured explanations for why
 * Product B is recommended as an alternative to Product A.
 *
 * Output format:
 *   - Pros (what's better about the alternative)
 *   - Cons (what's worse about the alternative)
 *   - Savings: amount + percentage
 *   - Verdict: 1-line summary
 *   - Confidence: 'high' | 'medium' | 'low'
 */

import type { Product } from '@/lib/dal/products'
import { compareSpecsDetailed, getBrandTier } from './similarity-engine'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('ExplanationEngine')

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductExplanation {
  product_id: string          // the alternative
  original_id: string         // the original product
  pros: ExplanationPoint[]
  cons: ExplanationPoint[]
  savings: {
    amount: number | null
    percentage: number | null
    more_expensive_by: number | null
  }
  verdict_ar: string
  verdict_en: string
  confidence: 'high' | 'medium' | 'low'
  similarity_score: number
}

export interface ExplanationPoint {
  key: string
  label_ar: string
  label_en: string
  delta?: string              // e.g., "+2GB RAM", "-1000 mAh"
  magnitude: 'significant' | 'minor'
}

// ─── Price Explanation ────────────────────────────────────────────────────────

function explainPrice(
  original: Product,
  alternative: Product
): ProductExplanation['savings'] {
  const op = original.current_price ?? 0
  const ap = alternative.current_price ?? 0

  if (op === 0 || ap === 0) {
    return { amount: null, percentage: null, more_expensive_by: null }
  }

  if (ap < op) {
    return {
      amount: parseFloat((op - ap).toFixed(2)),
      percentage: parseFloat(((op - ap) / op * 100).toFixed(2)),
      more_expensive_by: null,
    }
  }

  return {
    amount: null,
    percentage: null,
    more_expensive_by: parseFloat((ap - op).toFixed(2)),
  }
}

// ─── Spec Pros/Cons ───────────────────────────────────────────────────────────

function explainSpecs(
  original: Product,
  alternative: Product
): { pros: ExplanationPoint[]; cons: ExplanationPoint[] } {
  const pros: ExplanationPoint[] = []
  const cons: ExplanationPoint[] = []

  const comparisons = compareSpecsDetailed(
    original.specifications ?? {},
    alternative.specifications ?? {}
  )

  for (const comp of comparisons) {
    if (comp.winner === 'tie') continue

    const isAlternativeBetter = comp.winner === 'b'  // 'a' = original, 'b' = alternative
    const delta = isAlternativeBetter
      ? `+${comp.difference}`
      : `-${comp.difference}`

    // Determine magnitude (significant vs minor)
    let magnitude: 'significant' | 'minor' = 'minor'

    if (comp.spec === 'RAM' || comp.spec === 'Storage' || comp.spec === 'Battery') {
      // Parse values to determine if difference is significant
      const [va, vb] = [comp.value_a, comp.value_b].map(v => parseFloat(v ?? '0') || 0)
      if (Math.abs(va - vb) / Math.max(va, vb, 1) > 0.3) magnitude = 'significant'
    }

    const point: ExplanationPoint = {
      key: comp.spec.toLowerCase().replace(/\s+/g, '_'),
      label_ar: isAlternativeBetter
        ? `${comp.spec_ar} أفضل (${comp.value_b} مقابل ${comp.value_a})`
        : `${comp.spec_ar} أقل (${comp.value_b} مقابل ${comp.value_a})`,
      label_en: isAlternativeBetter
        ? `Better ${comp.spec} (${comp.value_b} vs ${comp.value_a})`
        : `Lower ${comp.spec} (${comp.value_b} vs ${comp.value_a})`,
      delta,
      magnitude,
    }

    if (isAlternativeBetter) pros.push(point)
    else cons.push(point)
  }

  // Brand tier comparison
  const origTier = getBrandTier(original.brand)
  const altTier  = getBrandTier(alternative.brand)

  if (altTier > origTier + 1) {
    pros.push({
      key: 'brand_tier',
      label_ar: `ماركة أفضل: ${alternative.brand ?? 'غير معروف'}`,
      label_en: `Better brand: ${alternative.brand ?? 'Unknown'}`,
      magnitude: 'significant',
    })
  } else if (altTier < origTier - 1) {
    cons.push({
      key: 'brand_tier',
      label_ar: `ماركة أقل شهرة: ${alternative.brand ?? 'غير معروف'}`,
      label_en: `Lesser known brand: ${alternative.brand ?? 'Unknown'}`,
      magnitude: 'minor',
    })
  }

  return { pros, cons }
}

// ─── Verdict Generation ───────────────────────────────────────────────────────

function generateVerdict(
  pros: ExplanationPoint[],
  cons: ExplanationPoint[],
  savings: ProductExplanation['savings'],
  similarityScore: number,
  alternative: Product
): { ar: string; en: string; confidence: ProductExplanation['confidence'] } {
  const name = alternative.title_ar ?? alternative.title_en ?? 'هذا المنتج'
  const nameEn = alternative.title_en ?? alternative.title_ar ?? 'This product'

  const significantPros = pros.filter(p => p.magnitude === 'significant').length
  const hasSavings = savings.percentage !== null && savings.percentage >= 5
  const isMuchCheaper = savings.percentage !== null && savings.percentage >= 15

  let ar = ''
  let en = ''
  let confidence: ProductExplanation['confidence'] = 'medium'

  if (isMuchCheaper && significantPros >= 2) {
    ar = `${name} خيار ممتاز — أرخص بـ ${savings.percentage!.toFixed(0)}% مع مواصفات أفضل في ${significantPros} نقاط.`
    en = `${nameEn} is an excellent choice — ${savings.percentage!.toFixed(0)}% cheaper with better specs in ${significantPros} areas.`
    confidence = 'high'
  } else if (isMuchCheaper) {
    ar = `${name} أرخص بشكل ملحوظ (${savings.percentage!.toFixed(0)}%) مع مواصفات مشابهة.`
    en = `${nameEn} is significantly cheaper (${savings.percentage!.toFixed(0)}%) with similar specs.`
    confidence = 'high'
  } else if (hasSavings && significantPros >= 1) {
    ar = `${name} يوفر توازناً جيداً بين السعر والمواصفات.`
    en = `${nameEn} offers a good balance of price and specs.`
    confidence = 'medium'
  } else if (significantPros >= 2) {
    ar = `${name} يمتلك مواصفات أفضل بسعر مشابه.`
    en = `${nameEn} has better specs at a similar price.`
    confidence = 'medium'
  } else if (savings.more_expensive_by && cons.length > pros.length) {
    ar = `${name} أغلى قليلاً مع مواصفات مشابهة — قد لا يستحق الفارق.`
    en = `${nameEn} is slightly more expensive with similar specs — may not be worth the difference.`
    confidence = 'low'
  } else {
    ar = `${name} بديل مناسب في نفس الفئة.`
    en = `${nameEn} is a suitable alternative in the same category.`
    confidence = similarityScore >= 70 ? 'medium' : 'low'
  }

  return { ar, en, confidence }
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function generateExplanation(
  original: Product,
  alternative: Product,
  similarityScore: number
): ProductExplanation {
  log.info('Generating explanation', {
    originalId: original.id,
    alternativeId: alternative.id,
    similarityScore,
  })

  const savings = explainPrice(original, alternative)
  const { pros, cons } = explainSpecs(original, alternative)

  // Add price as a pro/con point
  if (savings.amount && savings.percentage && savings.percentage >= 3) {
    pros.unshift({
      key: 'price',
      label_ar: `أرخص بـ ${savings.percentage.toFixed(0)}% (${savings.amount.toLocaleString('ar-EG')} ج.م)`,
      label_en: `${savings.percentage.toFixed(0)}% cheaper (EGP ${savings.amount.toLocaleString()})`,
      magnitude: savings.percentage >= 10 ? 'significant' : 'minor',
    })
  } else if (savings.more_expensive_by) {
    const pct = original.current_price
      ? parseFloat(((savings.more_expensive_by / original.current_price) * 100).toFixed(1))
      : 0
    cons.unshift({
      key: 'price',
      label_ar: `أغلى بـ ${pct}% (${savings.more_expensive_by.toLocaleString('ar-EG')} ج.م)`,
      label_en: `${pct}% more expensive (EGP ${savings.more_expensive_by.toLocaleString()})`,
      magnitude: pct >= 10 ? 'significant' : 'minor',
    })
  }

  const { ar, en, confidence } = generateVerdict(pros, cons, savings, similarityScore, alternative)

  return {
    product_id: alternative.id,
    original_id: original.id,
    pros: pros.slice(0, 5),
    cons: cons.slice(0, 4),
    savings,
    verdict_ar: ar,
    verdict_en: en,
    confidence,
    similarity_score: similarityScore,
  }
}

/**
 * Batch explain all alternatives at once.
 * Used by the /api/alternatives endpoint.
 */
export function explainAlternatives(
  original: Product,
  alternatives: Array<{ product: Product; total_score: number }>
): ProductExplanation[] {
  return alternatives.map(({ product, total_score }) =>
    generateExplanation(original, product, total_score)
  )
}
