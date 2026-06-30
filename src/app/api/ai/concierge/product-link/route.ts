/**
 * src/app/api/ai/concierge/product-link/route.ts
 * POST /api/ai/concierge/product-link
 *
 * Accepts: application/json body { url: string }
 *
 * Pipeline (in order, cost-ordered cheapest first):
 *   1. Parse body + validate url field present
 *   2. Server-side feature flag re-check (never trust frontend state)
 *   3. guardProductUrl()           — zero-cost domain allowlist check
 *   4. extractProductFromUrl()     — HTML fetch + JSON-LD / OG parse (no AI)
 *   5a. If isComplete === true:    build response directly, confidence=100, ZERO AI calls
 *   5b. If isComplete === false:   parseProductLinkGaps() — EXACTLY ONE AI call (model from DB)
 *   6. Return structured response identical to /api/ai/concierge shape
 *
 * Logging: every exit point fires void logLinkAttempt() — fire-and-forget,
 * never blocks or delays the response. A logging failure is silent.
 *
 * URL sanitization: raw_url stored with query strings stripped (proto+domain+path only)
 * to prevent leaking session tokens that some e-commerce sites append.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isFeatureEnabled } from '@/lib/feature-flags/feature-service'
import { guardProductUrl } from '@/lib/intelligence/link-guard'
import { extractProductFromUrl } from '@/lib/intelligence/product-link-extractor'
import { parseProductLinkGaps } from '@/lib/intelligence/ai-concierge-agent'
import type { AIExtractedData } from '@/lib/intelligence/ai-concierge-agent'
import { logLinkAttempt } from '@/lib/dal/link-attempts'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('api/ai/concierge/product-link')

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strips query string and hash from a URL, storing only proto+domain+path.
 * Prevents storing session tokens (e.g. ?ref=xyz&tag=abc) that e-commerce
 * sites commonly append. Falls back to rawUrl unchanged if parsing fails.
 */
function sanitizeUrl(rawUrl: string): { sanitized: string; domain: string | null } {
  try {
    const u = new URL(rawUrl)
    return {
      sanitized: `${u.protocol}//${u.hostname}${u.pathname}`,
      domain: u.hostname.toLowerCase(),
    }
  } catch {
    return { sanitized: rawUrl, domain: null }
  }
}

/**
 * Extracts the best-effort client IP from Next.js request headers.
 * Prefers x-forwarded-for (set by load balancers/CDNs) over x-real-ip.
 */
function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip        = getClientIp(request)
  const userAgent = request.headers.get('user-agent') ?? null

  try {
    // ── 1. Parse JSON body ─────────────────────────────────────────────────────
    let body: { url?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'INVALID_JSON', messageAr: 'طلب غير صالح' },
        { status: 400 }
      )
    }

    const url = typeof body.url === 'string' ? body.url.trim() : null

    if (!url) {
      return NextResponse.json(
        { error: 'MISSING_URL', messageAr: 'يرجى إدخال رابط المنتج' },
        { status: 400 }
      )
    }

    // Pre-compute sanitized URL and domain for logging (best-effort, even if URL is malformed)
    const { sanitized: sanitizedUrl, domain } = sanitizeUrl(url)

    // ── 2. Server-side feature flag re-validation ──────────────────────────────
    // NEVER trust frontend state — re-check on every request
    const featureEnabled = await isFeatureEnabled('product_link_input')
    if (!featureEnabled) {
      log.warn('[product-link] product_link_input flag disabled — rejecting request')
      // Fire-and-forget: logging must never block the response
      void logLinkAttempt({ rawUrl: sanitizedUrl, domain, outcome: 'rejected_disabled', ipAddress: ip, userAgent })
      return NextResponse.json(
        { error: 'FEATURE_DISABLED' },
        { status: 403 }
      )
    }

    // ── 3. Zero-cost URL guard (domain allowlist + URL validity) ──────────────
    // No network call, no AI — pure in-memory check against allowed_link_domains cache
    const guard = await guardProductUrl(url)
    if (!guard.valid) {
      log.info(`[product-link] URL rejected by guardProductUrl: ${guard.reason} — ${url}`)
      const outcome = guard.reason === 'DOMAIN_NOT_ALLOWED' ? 'rejected_domain' : 'rejected_malformed'
      void logLinkAttempt({ rawUrl: sanitizedUrl, domain, outcome, ipAddress: ip, userAgent })
      return NextResponse.json(
        {
          rejected: true,
          reason: guard.reason,
          messageAr: guard.reasonAr,
        },
        { status: 400 }
      )
    }

    // ── 4. Structured data extraction (HTML fetch + JSON-LD / Open Graph) ─────
    // Zero AI calls in this step
    log.info(`[product-link] Extracting product data from: ${url}`)
    const extraction = await extractProductFromUrl(url)

    if (!extraction.success) {
      log.warn(`[product-link] Extraction failed: ${extraction.reason}`)
      void logLinkAttempt({ rawUrl: sanitizedUrl, domain, outcome: 'fetch_failed', ipAddress: ip, userAgent })
      return NextResponse.json(
        {
          rejected: true,
          reason: extraction.reason,
          messageAr: extraction.reasonAr,
        },
        { status: 502 }
      )
    }

    const { data: extracted, isComplete } = extraction

    log.info(
      `[product-link] Extraction complete — isComplete=${isComplete}, name=${!!extracted.productName}, price=${!!extracted.price}`
    )

    // ── 5a. Complete extraction path — ZERO AI CALLS ──────────────────────────
    if (isComplete) {
      log.info('[product-link] isComplete=true — skipping AI entirely, confidence=100')

      const responseData: AIExtractedData = {
        confidence: 100, // Structured data is inherently reliable — assigned in code, not by AI
        productName: extracted.productName!, // non-null because isComplete=true
        category: null, // Not available from OG/JSON-LD alone without AI — user can fill in Review
        quantity: null,
        budgetMin: extracted.price,
        budgetMax: extracted.price,
        brand: extracted.brand,
        condition: 'new', // Default for marketplace listings
        color: null,
        notes: extracted.description ?? '',
        missingFields: [],
        isMultipleItems: false,
        items: null,
        // Product-link specific fields
        imageUrl: extracted.imageUrl,
        sourceUrl: extracted.sourceUrl,
      }

      void logLinkAttempt({ rawUrl: sanitizedUrl, domain, outcome: 'accepted', ipAddress: ip, userAgent })
      return NextResponse.json({ rejected: false, data: responseData })
    }

    // ── 5b. Incomplete extraction path — EXACTLY ONE AI CALL ──────────────────
    // Model/temperature/maxTokens/systemPromptOverride come from DB (ai_agent_configs)
    // via 30s-TTL cache. Admin can change them from the AI Settings UI without redeploy.
    log.info('[product-link] isComplete=false — invoking parseProductLinkGaps (1 AI call, model from DB)')

    const gapResult = await parseProductLinkGaps({
      productName: extracted.productName,
      description: extracted.description,
      brand: extracted.brand,
      imageUrl: extracted.imageUrl,
    })

    // Merge: price/image/sourceUrl always come from structured extraction, never from AI
    const mergedData: AIExtractedData = {
      confidence: gapResult.confidence,
      productName: gapResult.productName,
      category: gapResult.category,
      quantity: null,
      // Price from structured extraction only — AI is not allowed to invent prices
      budgetMin: extracted.price,
      budgetMax: extracted.price,
      brand: extracted.brand, // keep structured brand; AI may refine productName but not brand
      condition: gapResult.condition,
      color: null,
      notes: extracted.description ?? '',
      missingFields: [
        // Flag fields that AI couldn't confidently determine
        ...(gapResult.confidence < 60 ? ['productName'] : []),
        ...(extracted.price == null ? ['budgetMin', 'budgetMax'] : []),
        ...(gapResult.category == null ? ['category'] : []),
      ],
      isMultipleItems: false,
      items: null,
      // Always from structured extraction — never AI-invented
      imageUrl: extracted.imageUrl,
      sourceUrl: extracted.sourceUrl,
    }

    log.info(
      `[product-link] AI gap fill done — confidence=${gapResult.confidence}, category=${gapResult.category}`
    )

    void logLinkAttempt({ rawUrl: sanitizedUrl, domain, outcome: 'accepted', ipAddress: ip, userAgent })
    return NextResponse.json({ rejected: false, data: mergedData })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('[product-link] Unexpected error:', message)
    return NextResponse.json(
      {
        error: 'SERVER_ERROR',
        messageAr: 'خطأ في الخادم، يرجى المحاولة مرة أخرى',
      },
      { status: 500 }
    )
  }
}
