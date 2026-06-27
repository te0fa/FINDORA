import { NextResponse } from 'next/server'
import { createVendor } from '@/lib/dal/marketplace'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const business_name_en = formData.get('business_name_en') as string
    const business_name_ar = formData.get('business_name_ar') as string
    const contact_phone = formData.get('contact_phone') as string

    if (!business_name_en || !business_name_ar || !contact_phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await createVendor({
      business_name_en,
      business_name_ar,
      contact_phone,
      status: 'active'
    })

    // Redirect back to the marketplace page (using the referer or hardcoded for now)
    return NextResponse.redirect(new URL('/en/staff/marketplace', request.url), 303)

  } catch (error: any) {
    // log.error('Error creating vendor:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
