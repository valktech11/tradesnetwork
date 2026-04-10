'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function MaintenanceBanner() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => setConfig(d.config || {}))
  }, [])

  // Don't show on admin page
  if (pathname?.startsWith('/admin')) return null
  if (config.maintenance_mode !== 'true') return null

  const type = config.maintenance_type || 'info'
  const colors: Record<string, string> = {
    info:     'bg-blue-600 text-white',
    warning:  'bg-amber-500 text-white',
    critical: 'bg-red-600 text-white',
  }

  return (
    <div className={`w-full py-2.5 px-4 text-center text-sm font-medium ${colors[type] || colors.info}`}>
      🔧 {config.maintenance_message || 'The site is currently under maintenance. We will be back shortly.'}
    </div>
  )
}
