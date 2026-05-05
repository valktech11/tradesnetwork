'use client'

import { useState } from 'react'
import { Lead } from '@/types'

interface ActionAlertProps {
  leads: Lead[]
  onRespond: (leadId: string) => void
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export default function ActionAlert({ leads, onRespond }: ActionAlertProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build alerts — ONE per lead maximum. Overdue takes priority over follow-up.
  const alertMap = new Map<string, {
    id: string
    lead_id: string
    type: 'overdue' | 'followup'
    contact_name: string
    days: number
  }>()

  leads
    .filter(l => !['Completed', 'Paid', 'Lost', 'Archived'].includes(l.lead_status))
    .forEach(l => {
      const days = daysSince(l.created_at)
      if (days >= 3) {
        // Overdue — takes priority, overwrites any followup for same lead
        alertMap.set(l.id, {
          id: `overdue-${l.id}`,
          lead_id: l.id,
          type: 'overdue',
          contact_name: l.contact_name,
          days,
        })
      } else if (l.follow_up_date && !alertMap.has(l.id)) {
        const fDate = new Date(l.follow_up_date)
        fDate.setHours(0, 0, 0, 0)
        if (fDate <= today) {
          alertMap.set(l.id, {
            id: `followup-${l.id}`,
            lead_id: l.id,
            type: 'followup',
            contact_name: l.contact_name,
            days: 0,
          })
        }
      }
    })

  const alerts = Array.from(alertMap.values())
  const visible = alerts.filter(a => !dismissed.has(a.id))

  if (visible.length === 0) return null

  return (
    <div className="mb-5 rounded-2xl overflow-hidden" style={{ border: "1px solid #FECACA", background: "#FFF5F5" }}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid #FECACA" }}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#EF4444" }}>
          <span className="text-white text-xs font-bold">{visible.length}</span>
        </div>
        <p className="text-sm font-semibold flex-1" style={{ color: "#991B1B" }}>
          {visible.length === 1
            ? '1 lead needs your attention'
            : `${visible.length} leads need your attention`}
        </p>
      </div>

      {/* Individual alerts */}
      {visible.map((alert, i) => (
        <div
          key={alert.id}
          className={`flex items-center gap-3 px-4 py-3`} style={i > 0 ? { borderTop: '1px solid #FEE2E2' } : {}}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
            background: alert.type === 'overdue'
              ? alert.days > 7 ? '#DC2626' : '#F97316'
              : '#60A5FA',
            animation: alert.type === 'overdue' && alert.days > 7 ? 'pulse 2s infinite' : 'none'
          }} />

          <p className="text-sm flex-1" style={{ color: "#7F1D1D" }}>
            {alert.type === 'overdue' ? (
              <>
                <span className="font-semibold">{alert.contact_name}</span>
                {' '}— no contact in{' '}
                <span className="font-semibold text-red-600">{alert.days} days</span>
              </>
            ) : (
              <>
                Follow-up with <span className="font-semibold">{alert.contact_name}</span> due today
              </>
            )}
          </p>

          <button
            onClick={() => onRespond(alert.lead_id)}
            className="text-sm font-semibold text-teal-700 hover:text-teal-900 whitespace-nowrap transition-colors border border-teal-200 bg-white rounded-lg px-3 py-1"
          >
            Open →
          </button>

          <button
            onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
            className="transition-colors text-xl leading-none" style={{ color: "#FCA5A5" }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
