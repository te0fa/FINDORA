'use client'

import React, { useState, useEffect } from 'react'
import TaskDiscovery from './TaskDiscovery'
import ActiveMissionPanel from './ActiveMissionPanel'

export default function MissionControl({ locale }: { locale: string }) {
  const isAr = locale === 'ar'
  const [activeClaim, setActiveClaim] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchState = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/contributors/tasks')
      const data = await res.json()
      if (data.activeClaim) {
        setActiveClaim(data.activeClaim)
      } else {
        setActiveClaim(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchState()
  }, [])

  if (loading) return <div className="animate-pulse h-32 bg-white/5 rounded-2xl w-full"></div>

  return (
    <div className="mt-8">
      {activeClaim ? (
        <ActiveMissionPanel 
          locale={locale} 
          claim={activeClaim} 
          onSuccess={() => fetchState()} 
        />
      ) : (
        <TaskDiscovery 
          locale={locale} 
          onClaimSuccess={() => fetchState()} 
        />
      )}
    </div>
  )
}
