'use client'

import { Send, Eye, CheckCircle2, FileText, CreditCard } from 'lucide-react'
import { theme } from '@/lib/theme'

type Step = { event: string; label: string; timestamp: string | null }

const STEP_ICONS: Record<string, React.ReactNode> = {
  sent:     <Send size={14} />,
  viewed:   <Eye size={14} />,
  approved: <CheckCircle2 size={14} />,
  invoiced: <FileText size={14} />,
  paid:     <CreditCard size={14} />,
}

function fmtTs(ts: string) {
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function EstimateProgressBar({ timeline, darkMode }: {
  timeline: Step[]
  darkMode: boolean
}) {
  const t = theme(darkMode)

  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 14, padding: '16px 24px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
        {timeline.map((step, i) => {
          const done    = step.timestamp !== null
          const isLast  = i === timeline.length - 1
          const active  = done && (i === timeline.length - 1 || !timeline[i + 1]?.timestamp)

          return (
            <div key={step.event} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {/* Connector line — left side */}
              {i > 0 && (
                <div style={{
                  position: 'absolute', top: 15, right: '50%', left: '-50%',
                  height: 2,
                  background: timeline[i - 1].timestamp ? '#0F766E' : (darkMode ? '#334155' : '#E5E7EB'),
                  zIndex: 0,
                }} />
              )}

              {/* Circle */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1, position: 'relative', flexShrink: 0,
                background: done ? '#0F766E' : (darkMode ? '#1E293B' : '#F3F4F6'),
                border: done ? 'none' : `2px solid ${darkMode ? '#334155' : '#E5E7EB'}`,
                color: done ? '#fff' : (darkMode ? '#475569' : '#9CA3AF'),
                boxShadow: active ? '0 0 0 4px rgba(15,118,110,0.15)' : 'none',
              }}>
                {STEP_ICONS[step.event] ?? <CheckCircle2 size={14} />}
              </div>

              {/* Label + timestamp */}
              <div style={{ textAlign: 'center', marginTop: 8, paddingLeft: 4, paddingRight: 4 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  color: done ? t.textPri : t.textSubtle,
                }}>
                  {step.label.replace(' to client', '').replace(' by client', '').replace(' created', '')}
                </div>
                <div style={{ fontSize: 11, marginTop: 3, color: step.timestamp ? t.textMuted : t.textSubtle }}>
                  {step.timestamp ? fmtTs(step.timestamp) : 'Not yet'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
