import { NextResponse } from 'next/server'
import { createProduct, createDeal } from '@/lib/dal/marketplace'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const vendor_id = formData.get('vendor_id') as string
    const product_name_ar = formData.get('product_name_ar') as string
    const product_name_en = formData.get('product_name_en') as string
    const base_price_egp = formData.get('base_price_egp') as string

    if (!vendor_id || !product_name_ar || !product_name_en || !base_price_egp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Create the Product
    const product = await createProduct({
      vendor_id,
      product_name_ar,
      product_name_en,
      category: 'Electronics', // Defaulting for now
      base_price_egp: Number(base_price_egp),
      is_active: true
    }) as { id: string }


    // 2. Create the Deal (System will auto-add commission inside DAL)
    await createDeal({
      product_id: product.id,
      deal_title_ar: `عرض مميز: ${product_name_ar}`,
      deal_title_en: `Special Deal: ${product_name_en}`,
      status: 'published',
      is_featured: true
    })

    return NextResponse.redirect(new URL('/en/staff/marketplace', request.url), 303)

  } catch (error: any) {
    // log.error('Error creating deal:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
