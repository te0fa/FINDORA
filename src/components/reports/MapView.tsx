'use client'

import React from 'react'

export default function MapView({
  snapshots,
  isRTL
}: {
  snapshots: any[]
  isRTL: boolean
}) {
  // Filter snapshots that are unlocked and have location info or coordinates
  const locations = snapshots.filter(s => 
    !s.reveal_locked && 
    (s.latitude || s.longitude || s.revealedMerchantLocation)
  )

  if (locations.length === 0) {
    return null
  }

  // Use the first location as the default centered map view
  const defaultLoc = locations[0]
  const lat = defaultLoc.latitude
  const lng = defaultLoc.longitude
  const address = defaultLoc.revealedMerchantLocation || defaultLoc.revealedSourceText

  // Generate embed URL
  const embedUrl = lat && lng 
    ? `https://maps.google.com/maps?q=${lat},${lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`

  const mapsSearchUrl = lat && lng
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  return (
    <div className="card glass-card p-6 md:p-8 rounded-3xl border border-white/10 bg-[hsl(220,20%,12%)] shadow-2xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
            <span className="text-2xl">📍</span>
            {isRTL ? 'خريطة مواقع المتاجر المكتشفة' : 'Sourced Stores Location Map'}
          </h2>
          <p className="text-sm text-[hsl(220,10%,60%)] mt-1">
            {isRTL 
              ? 'مواقع المتاجر والشركاء المتاحة لعروضك النشطة.'
              : 'Physical coordinates and locations of verified source stores.'}
          </p>
        </div>
        <a 
          href={mapsSearchUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn-accent py-2 px-4 text-xs font-black w-auto rounded-lg text-center"
        >
          {isRTL ? 'فتح في خرائط Google' : 'Open in Google Maps'}
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map iframe */}
        <div className="lg:col-span-2 relative h-96 w-full rounded-2xl overflow-hidden border border-white/10 bg-black/40">
          <iframe
            title="Store Location Map"
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="rounded-2xl opacity-80 invert-[0.9] hue-rotate-[180deg]"
          />
        </div>

        {/* Location cards list */}
        <div className="space-y-3 overflow-y-auto max-h-96 pr-2">
          <h3 className="text-xs uppercase font-black text-accent tracking-[0.2em] mb-4">
            {isRTL ? 'قائمة الفروع والعناوين' : 'Branches & Locations'}
          </h3>
          {locations.map((loc, idx) => {
            const isCoords = loc.latitude && loc.longitude
            const searchUrl = isCoords
              ? `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.revealedMerchantLocation || loc.revealedSourceText)}`

            return (
              <a 
                key={loc.id} 
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-accent/30 transition duration-300 group"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="font-bold text-white text-sm group-hover:text-accent transition-colors">
                    {loc.option_label || `Option ${idx + 1}`}
                  </div>
                  <span className="text-[10px] text-accent font-black uppercase tracking-wider">
                    {loc.final_score ? `${loc.final_score.toFixed(1)} Match` : ''}
                  </span>
                </div>
                <div className="text-xs text-[hsl(220,10%,60%)] mt-2 line-clamp-2 leading-relaxed">
                  <strong>{isRTL ? 'المتجر:' : 'Seller:'}</strong> {loc.revealedSourceText}
                </div>
                <div className="text-xs text-[hsl(220,10%,60%)] mt-1 line-clamp-2 leading-relaxed">
                  <strong>{isRTL ? 'الموقع:' : 'Address:'}</strong> {loc.revealedMerchantLocation || (isRTL ? 'غير متوفر' : 'Not specified')}
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
