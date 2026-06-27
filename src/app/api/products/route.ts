/**
 * GET  /api/products        — List products with filters
 * POST /api/products        — Create product (staff only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listProducts, createProduct, importProductFromResearchItem } from '@/lib/dal/products'
import { seedPriceFromResearchItem } from '@/lib/products/price-engine'
import { withRateLimit, STANDARD_RATE_LIMIT, AUTH_RATE_LIMIT } from '@/lib/middleware/rate-limiter'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('API:products')

// ── GET /api/products ─────────────────────────────────────────────────────────

async function listHandler(request: NextRequest): Promise<NextResponse> {
  const sp = request.nextUrl.searchParams

  const { products, total } = await listProducts({
    category:  sp.get('category')  ?? undefined,
    brand:     sp.get('brand')     ?? undefined,
    search:    sp.get('q')         ?? undefined,
    min_price: sp.has('min') ? Number(sp.get('min')) : undefined,
    max_price: sp.has('max') ? Number(sp.get('max')) : undefined,
    limit:     sp.has('limit') ? Math.min(Number(sp.get('limit')), 100) : 20,
    offset:    sp.has('offset') ? Number(sp.get('offset')) : 0,
    order_by:  (sp.get('order_by') as any) ?? 'created_at',
    order_dir: (sp.get('dir') as any) ?? 'desc',
    is_active: true,
  })

  return NextResponse.json({ products, total, page_size: products.length })
}

// ── POST /api/products ────────────────────────────────────────────────────────

async function createHandler(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify staff
  const { data: staff } = await (supabase as any)
    .from('staff_members')
    .select('id, is_active')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!staff) return NextResponse.json({ error: 'Forbidden — staff only' }, { status: 403 })

  const body = await request.json()

  // Handle auto-import from research_item
  if (body.research_item_id && body.import_from_research) {
    const { data: item } = await (supabase as any)
      .from('research_items')
      .select('*')
      .eq('id', body.research_item_id)
      .single()

    if (!item) return NextResponse.json({ error: 'Research item not found' }, { status: 404 })

    const product = await importProductFromResearchItem(item, user.id, body.category ?? 'General')

    // Seed initial price if available
    if (product && item.price_amount) {
      await seedPriceFromResearchItem(
        product.id,
        item.price_amount,
        item.created_at ?? new Date().toISOString()
      )
    }

    return NextResponse.json({ product, imported: true }, { status: 201 })
  }

  // Manual creation
  if (!body.title_ar || !body.category) {
    return NextResponse.json({ error: 'title_ar and category are required' }, { status: 400 })
  }

  const product = await createProduct({ ...body, created_by: user.id })
  log.info('Product created via API', { productId: product.id, staffId: user.id })

  return NextResponse.json({ product }, { status: 201 })
}

export const GET  = withRateLimit(STANDARD_RATE_LIMIT, listHandler)
export const POST = withRateLimit(AUTH_RATE_LIMIT, createHandler)
