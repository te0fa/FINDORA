'use client'

import React, { useState } from 'react'
import VendorPicker, { VendorPickerValue } from '@/components/VendorPicker'

interface VendorFieldClientProps {
  locale: string
  initialVendor?: { id: string; display_name: string } | null
}

export default function VendorFieldClient({ locale, initialVendor }: VendorFieldClientProps) {
  const [vendor, setVendor] = useState<VendorPickerValue | null>(initialVendor || null)
  const isRTL = locale === 'ar'

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {isRTL ? 'المورد المرتبط بالمنتج' : 'Associated Vendor'}
      </label>
      <VendorPicker
        locale={locale}
        value={vendor}
        onChange={setVendor}
        allowCreate={true}
      />
      <input type="hidden" name="vendor_id" value={vendor?.id || ''} />
      <input type="hidden" name="vendor_name_snapshot" value={vendor?.display_name || ''} />
    </div>
  )
}
