/**
 * src/lib/intelligence/product-link-extractor.ts
 *
 * Extracts structured product data from a URL by parsing ONLY:
 *   1. JSON-LD (<script type="application/ld+json"> with @type: "Product")
 *   2. Open Graph meta tags (og:title, og:image, og:description) — fallback
 *
 * ZERO AI calls. Pure HTML parsing via cheerio.
 * Never scrapes arbitrary DOM structure — only stable, standards-based data sources.
 *
 * Completeness rule:
 *   isComplete = true  → productName AND price are both non-null
 *   isComplete = false → at least one of the two is missing → triggers AI gap fill
 */

import { load } from 'cheerio'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('intelligence/product-link-extractor')

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedProductData {
  productName: string | null
  price: number | null
  priceCurrency: string | null
  brand: string | null
  imageUrl: string | null
  description: string | null
  sourceUrl: string
}

export type ExtractResult =
  | { success: true; data: ExtractedProductData; isComplete: boolean }
  | { success: false; reason: string; reasonAr: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8_000

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely parses a price string/number to a float.
 * Handles strings like "1,299.00", "1299", "EGP 1299", "1.299,00".
 */
function parsePrice(raw: unknown): number | null {
  if (raw == null) return null

  if (typeof raw === 'number') return isNaN(raw) ? null : raw

  if (typeof raw === 'string') {
    // Remove currency symbols, spaces, and thousands separators (both . and ,)
    // Strategy: keep digits and the last decimal separator
    let cleaned = raw.replace(/[^\d.,]/g, '')
    // If both , and . present, remove the one used as thousands separator
    const lastComma = cleaned.lastIndexOf(',')
    const lastDot   = cleaned.lastIndexOf('.')
    if (lastComma > lastDot) {
      // Comma is last → likely decimal separator (e.g. European "1.299,00")
      cleaned = cleaned.replace(/\./g, '').replace(',', '.')
    } else {
      // Dot is last → remove commas as thousands separators
      cleaned = cleaned.replace(/,/g, '')
    }
    const n = parseFloat(cleaned)
    return isNaN(n) ? null : n
  }

  return null
}

/**
 * Extracts the first matching JSON-LD block with @type "Product".
 * Handles both singular string and array @type values.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractJsonLd(html: string): Record<string, any> | null {
  const $ = load(html)
  const blocks: string[] = []

  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).html()
    if (text) blocks.push(text)
  })

  for (const block of blocks) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed: any = JSON.parse(block)

      // Could be a single object or a @graph array
      const candidates = Array.isArray(parsed)
        ? parsed
        : parsed['@graph']
        ? (Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed['@graph']])
        : [parsed]

      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== 'object') continue
        const type = candidate['@type']
        const isProduct =
          type === 'Product' ||
          (Array.isArray(type) && type.includes('Product'))
        if (isProduct) return candidate
      }
    } catch {
      // Malformed JSON-LD — skip this block
    }
  }

  return null
}

// ─── Main Extractor ───────────────────────────────────────────────────────────

/**
 * Fetches the URL server-side and extracts product data from structured metadata.
 * Makes ZERO AI calls — pure HTML parsing.
 *
 * Priority: JSON-LD fields first, Open Graph as fallback for missing values.
 */
export async function extractProductFromUrl(url: string): Promise<ExtractResult> {
  // ── Fetch with timeout ─────────────────────────────────────────────────────
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let html: string
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
    })

    if (!response.ok) {
      log.warn(
        `[product-link-extractor] HTTP ${response.status} for ${url}`
      )
      return {
        success: false,
        reason: 'FETCH_FAILED',
        reasonAr: 'تعذر الوصول للصفحة، تأكد من الرابط وحاول مرة أخرى',
      }
    }

    html = await response.text()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const isTimeout = msg.includes('abort') || msg.includes('timeout')
    log.warn(`[product-link-extractor] Fetch failed for ${url}: ${msg}`)
    return {
      success: false,
      reason: isTimeout ? 'FETCH_TIMEOUT' : 'FETCH_FAILED',
      reasonAr: isTimeout
        ? 'استغرق تحميل الصفحة وقتاً طويلاً، يرجى المحاولة مرة أخرى'
        : 'تعذر الوصول للصفحة، تأكد من الرابط وحاول مرة أخرى',
    }
  } finally {
    clearTimeout(timeoutId)
  }

  // ── Parse HTML ─────────────────────────────────────────────────────────────
  const $ = load(html)

  // ── 1. JSON-LD extraction (highest priority) ───────────────────────────────
  const jsonLd = extractJsonLd(html)

  let productName: string | null = null
  let price: number | null = null
  let priceCurrency: string | null = null
  let brand: string | null = null
  let imageUrl: string | null = null
  let description: string | null = null

  if (jsonLd) {
    log.info('[product-link-extractor] JSON-LD Product block found')

    // Product name
    if (typeof jsonLd.name === 'string' && jsonLd.name.trim()) {
      productName = jsonLd.name.trim()
    }

    // Image
    if (typeof jsonLd.image === 'string') {
      imageUrl = jsonLd.image
    } else if (Array.isArray(jsonLd.image) && typeof jsonLd.image[0] === 'string') {
      imageUrl = jsonLd.image[0]
    } else if (jsonLd.image && typeof jsonLd.image.url === 'string') {
      imageUrl = jsonLd.image.url
    }

    // Description
    if (typeof jsonLd.description === 'string') {
      description = jsonLd.description.trim().slice(0, 500) || null
    }

    // Brand
    if (typeof jsonLd.brand === 'string') {
      brand = jsonLd.brand
    } else if (jsonLd.brand && typeof jsonLd.brand.name === 'string') {
      brand = jsonLd.brand.name
    }

    // Offers — handle single offer object or array
    const offers = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers
    if (offers && typeof offers === 'object') {
      price = parsePrice(offers.price)
      if (typeof offers.priceCurrency === 'string') {
        priceCurrency = offers.priceCurrency.toUpperCase()
      }
    }
  }

  // ── 2. Open Graph fallback (only fills fields still null) ──────────────────
  function ogContent(property: string): string | null {
    const val = $(`meta[property="${property}"]`).attr('content')
    return val?.trim() || null
  }

  if (!productName) {
    productName =
      ogContent('og:title') ||
      $('title').text().trim().split(' - ')[0] || // common pattern: "Product Name - Amazon"
      null
  }

  if (!imageUrl) {
    imageUrl = ogContent('og:image')
  }

  if (!description) {
    description = ogContent('og:description')?.slice(0, 500) || null
  }

  log.info(
    `[product-link-extractor] Extraction result — name=${!!productName}, price=${!!price}, imageUrl=${!!imageUrl}`
  )

  // ── Build normalized result ────────────────────────────────────────────────
  const data: ExtractedProductData = {
    productName,
    price,
    priceCurrency,
    brand,
    imageUrl,
    description,
    sourceUrl: url,
  }

  // Completeness: both productName AND price must be non-null
  const isComplete = productName !== null && price !== null

  return { success: true, data, isComplete }
}
