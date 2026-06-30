/**
 * src/lib/intelligence/ai-concierge-agent.ts
 *
 * Single-call AI pipeline for the multimodal request concierge.
 * EXACTLY ONE callAI() call per invocation — handles both validation
 * AND data extraction in the same response (rejection-first system prompt).
 *
 * Constraint: images are passed as signed Supabase Storage URLs via
 * Gemini fileData parts — NEVER as base64.
 */

import { callAI } from '@/lib/ai/provider'
import { getStageSettings } from '@/lib/intelligence/ai-stage-config'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('intelligence/ai-concierge-agent')

// ─── System Prompt (Arabic, rejection-first) ──────────────────────────────────

const CONCIERGE_SYSTEM_PROMPT = `أنت مساعد ذكي لمنصة "فيندورا" لتوريد المنتجات. مهمتك تحليل مدخلات العميل (نص، أو نص مع صورة) واستخراج طلب شراء منظم.

== قاعدة الرفض الفورية (مهم جداً، تُنفَّذ أولاً) ==
لو فيه صورة مرفقة، أول حاجة تتحقق منها: هل الصورة دي متعلقة فعلاً بطلب شراء؟
(منتج، صورة شاشة لمنتج، فاتورة، عرض سعر، ورقة مكتوب فيها قائمة مشتريات، كاتالوج)

لو الصورة: سيلفي، شخص، حيوان، ميمز، مكان عشوائي، أو مالها علاقة بالشراء أبداً:
رجّع فوراً وبس هذا الشكل ولا تكمل أي استخراج:
{"valid": false, "reason": "INVALID_IMAGE", "message_ar": "الصورة دي مش متعلقة بطلب شراء، من فضلك ارفع صورة المنتج أو الفاتورة"}

== لو الصورة/النص صالح ==
استخرج البيانات بصيغة JSON فقط (بدون أي نص تمهيدي، بدون markdown fences):
{
  "valid": true,
  "confidence": 0-100,
  "productName": string,
  "category": string|null,
  "quantity": number|null,
  "budgetMin": number|null,
  "budgetMax": number|null,
  "brand": string|null,
  "condition": "new"|"used"|"any"|null,
  "color": string|null,
  "notes": string,
  "missingFields": string[],
  "isMultipleItems": boolean,
  "items": [{"productName": string, "quantity": number|null}] | null
}

قواعد الثقة: بيانات واضحة وكاملة → confidence > 85. نقص أو غموض → 40-85 مع تعبئة missingFields. كلام عشوائي غير مفهوم → confidence < 40.

قاعدة الليستات: لو الصورة فيها أكتر من منتج (فاتورة بعدة بنود، ورقة ليستة)، اجمعهم في items array واجعل isMultipleItems=true.

أرجع JSON فقط بدون أي شرح.`

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIExtractedData {
  confidence: number
  productName: string
  category: string | null
  quantity: number | null
  budgetMin: number | null
  budgetMax: number | null
  brand: string | null
  condition: 'new' | 'used' | 'any' | null
  color: string | null
  notes: string
  missingFields: string[]
  isMultipleItems: boolean
  items: Array<{ productName: string; quantity: number | null }> | null
  /** Present only for product_link source — the extracted product image URL */
  imageUrl?: string | null
  /** Present only for product_link source — the original submitted URL */
  sourceUrl?: string | null
}

export type ConciergeResult =
  | { rejected: true; reason: string; messageAr: string }
  | { rejected: false; data: AIExtractedData }

// ─── Main Parser ──────────────────────────────────────────────────────────────

/**
 * Parses a customer's text and/or image into a structured purchase request.
 * Makes EXACTLY ONE AI call — rejection check + extraction happen in the same call.
 *
 * @param text  - Natural language input (Arabic or English)
 * @param imageUrl - Signed Supabase Storage URL (600s expiry) — never base64
 * @param imageMimeType - MIME type of the uploaded image
 */
export async function parseAIRequest(params: {
  text?: string | null
  imageUrl?: string | null
  imageMimeType?: string | null
}): Promise<ConciergeResult> {
  const { text, imageUrl, imageMimeType } = params

  if (!text && !imageUrl) {
    return {
      rejected: true,
      reason: 'NO_INPUT',
      messageAr: 'يرجى إدخال نص أو رفع صورة لتحليل الطلب',
    }
  }

  // Build user prompt text
  const userPrompt = text?.trim() || 'يرجى تحليل الصورة المرفقة واستخراج طلب الشراء'

  // Build imageUrls array for Gemini fileData parts (URL-based, no base64)
  const imageUrls =
    imageUrl && imageMimeType
      ? [{ uri: imageUrl, mimeType: imageMimeType }]
      : undefined

  log.info(
    `[ai-concierge] Calling AI — hasText=${!!text}, hasImage=${!!imageUrl}`
  )

  // ── EXACTLY ONE AI CALL ───────────────────────────────────────────────────
  const result = await callAI({
    systemPrompt: CONCIERGE_SYSTEM_PROMPT,
    userPrompt,
    jsonMode: true,
    imageUrls,
    configOverride: {
      temperature: 0.1, // Low temperature for consistent JSON extraction
      maxTokens: 4096,
    },
  })
  // ─────────────────────────────────────────────────────────────────────────

  if (result.error || !result.data) {
    log.error('[ai-concierge] AI call failed:', result.error)
    return {
      rejected: true,
      reason: 'AI_ERROR',
      messageAr: 'حدث خطأ في المساعد الذكي، يرجى المحاولة مرة أخرى',
    }
  }

  const parsed = result.data as Record<string, unknown>

  // Rejection case — the model determined image is invalid
  if (parsed.valid === false) {
    return {
      rejected: true,
      reason: (parsed.reason as string) || 'INVALID_INPUT',
      messageAr:
        (parsed.message_ar as string) ||
        'المدخلات غير صالحة، يرجى المحاولة مرة أخرى',
    }
  }

  // Extraction case — build typed response
  const data: AIExtractedData = {
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
    productName: typeof parsed.productName === 'string' ? parsed.productName : '',
    category: typeof parsed.category === 'string' ? parsed.category : null,
    quantity: typeof parsed.quantity === 'number' ? parsed.quantity : null,
    budgetMin: typeof parsed.budgetMin === 'number' ? parsed.budgetMin : null,
    budgetMax: typeof parsed.budgetMax === 'number' ? parsed.budgetMax : null,
    brand: typeof parsed.brand === 'string' ? parsed.brand : null,
    condition:
      parsed.condition === 'new' || parsed.condition === 'used' || parsed.condition === 'any'
        ? parsed.condition
        : null,
    color: typeof parsed.color === 'string' ? parsed.color : null,
    notes: typeof parsed.notes === 'string' ? parsed.notes : '',
    missingFields: Array.isArray(parsed.missingFields) ? (parsed.missingFields as string[]) : [],
    isMultipleItems: parsed.isMultipleItems === true,
    items: Array.isArray(parsed.items)
      ? (parsed.items as Array<{ productName: string; quantity: number | null }>)
      : null,
  }

  return { rejected: false, data }
}

// ─── Product Link Gap Filler ──────────────────────────────────────────────────

/**
 * System prompt for filling in missing fields when structured extraction
 * (JSON-LD / Open Graph) was incomplete. Called ONLY when isComplete === false.
 */
const PRODUCT_LINK_GAP_PROMPT = `أنت محلل منتجات لمنصة "فيندورا". سيُعطى لك بيانات جزئية لمنتج مستخرجة من صفحة تسوق إلكتروني.
مهمتك: اكمل الحقول الناقصة بناءً على المعلومات المتاحة.

قواعد صارمة:
1. أرجع JSON فقط — بدون أي نص تمهيدي أو markdown أو شرح.
2. لا تخترع أسعاراً أو بيانات غير موجودة في المدخلات.
3. الحالة الافتراضية للمنتجات من المواقع التجارية: "new" (إلا لو الوصف يقول غير ذلك).
4. confidence: مدى ثقتك في الاستخراج (0-100).

أرجع هذا الشكل تحديداً:
{
  "productName": string,
  "category": string | null,
  "condition": "new" | "used" | "any",
  "confidence": number
}`

export interface ProductLinkGapResult {
  productName: string
  category: string | null
  condition: 'new' | 'used' | 'any'
  confidence: number
}

/**
 * Fills missing fields when structured data extraction was incomplete.
 * Called EXACTLY ONCE — only when extractProductFromUrl returns isComplete=false.
 *
 * Reads model/temperature/maxTokens/systemPromptOverride from `ai_agent_configs`
 * (stage_key = 'product_link_gap_fill') via 30s-TTL cache. Admin can change any
 * of these from the AI Settings UI without a code deploy.
 *
 * GRACEFUL DEGRADATION: if stage.enabled === false, returns partial data with
 * confidence=50 and skips the AI call entirely. Customer still lands on the
 * Review Screen to complete fields manually — never an error page.
 *
 * @param extracted - Partial data returned by product-link-extractor
 */
export async function parseProductLinkGaps(extracted: {
  productName: string | null
  description: string | null
  brand: string | null
  imageUrl: string | null
}): Promise<ProductLinkGapResult> {
  // ── Read DB-configured stage settings (30s TTL cache) ───────────────────────
  const stage = await getStageSettings('product_link_gap_fill')

  // ── Graceful degradation when stage disabled by Admin ────────────────────
  if (!stage.enabled) {
    log.info(
      '[ai-concierge] parseProductLinkGaps — stage disabled, skipping AI call (graceful degradation)'
    )
    return {
      productName: extracted.productName ?? 'منتج غير معروف',
      category: null,
      condition: 'new',
      // confidence=50 signals to the frontend that fields need manual review
      confidence: 50,
    }
  }

  // ── Build user prompt from structured extraction ────────────────────────
  const userPrompt = [
    extracted.productName ? `اسم المنتج: ${extracted.productName}` : 'اسم المنتج: غير معروف',
    extracted.brand       ? `الماركة: ${extracted.brand}` : '',
    extracted.description ? `الوصف: ${extracted.description.slice(0, 400)}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  // Use DB-configured system prompt if set; otherwise fall back to hardcoded default
  const systemPrompt = stage.systemPromptOverride ?? PRODUCT_LINK_GAP_PROMPT

  log.info(
    `[ai-concierge] parseProductLinkGaps — calling AI (model=${stage.model}, temp=${stage.temperature}, maxTokens=${stage.maxTokens})${
      stage.systemPromptOverride ? ' [custom prompt]' : ''
    }`
  )

  // ── EXACTLY ONE AI CALL ───────────────────────────────────────────────────
  const result = await callAI({
    systemPrompt,
    userPrompt,
    jsonMode: true,
    configOverride: {
      // All three values come from DB, overridable by Admin at runtime
      model:       stage.model,
      temperature: stage.temperature,
      maxTokens:   stage.maxTokens,
    },
  })
  // ─────────────────────────────────────────────────────────────────────────

  if (result.error || !result.data) {
    log.warn('[ai-concierge] parseProductLinkGaps AI call failed — using safe defaults')
    return {
      productName: extracted.productName ?? 'منتج غير معروف',
      category: null,
      condition: 'new',
      confidence: 40,
    }
  }

  const parsed = result.data as Record<string, unknown>

  return {
    productName:
      typeof parsed.productName === 'string' && parsed.productName.trim()
        ? parsed.productName.trim()
        : extracted.productName ?? 'منتج غير معروف',
    category:
      typeof parsed.category === 'string' ? parsed.category : null,
    condition:
      parsed.condition === 'used'
        ? 'used'
        : parsed.condition === 'any'
        ? 'any'
        : 'new',
    confidence:
      typeof parsed.confidence === 'number'
        ? Math.min(100, Math.max(0, parsed.confidence))
        : 50,
  }
}
