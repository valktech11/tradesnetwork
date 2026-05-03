'use client'

import { Send, Eye, CheckCircle2, CreditCard, Phone } from 'lucide-react'

type TimelineEvent = {
  event: string
  label: string
  timestamp: string | null
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  sent:     <Send size={13} />,
  viewed:   <Eye size={13} />,
  approved: <CheckCircle2 size={13} />,
  paid:     <CreditCard size={13} />,
}

export default function ApprovalTimeline({
  timeline, darkMode, estimateId, contactPhone, contactEmail, onAction,
}: {
  timeline: TimelineEvent[]
  darkMode: boolean
  estimateId?: string
  contactPhone?: string
  contactEmail?: string
  onAction?: (msg: string) => void
}) {
  const dk = darkMode
  const card   = dk ? 'bg-[#1E293B] text-white border-[#334155]' : 'bg-white text-gray-900 border-[#E8E2D9]'
  const muted  = dk ? 'text-slate-400' : 'text-[#6B7280]'
  const border = dk ? 'border-[#334155]' : 'border-[#E8E2D9]'

  const sendReminder = async () => {
    if (!contactEmail) { onAction?.('No email on file for this lead'); return }
    try {
      const r = await fetch('/api/estimates/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateId, contactEmail }),
      })
      if (r.ok) onAction?.('Reminder sent ✓')
      else onAction?.('Failed to send reminder')
    } catch { onAction?.('Network error') }
  }

  const callClient = () => {
    if (!contactPhone) { onAction?.('No phone on file for this lead'); return }
    window.location.href = `tel:${contactPhone.replace(/\D/g, '')}`
  }

  return (
    <div className={`rounded-xl border p-5 ${card}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Approval Status</h3>
      </div>

      <ul className="space-y-0">
        {timeline.map((t, i) => {
          const done   = t.timestamp !== null
          const isLast = i === timeline.length - 1
          return (
            <li key={t.event} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                  done ? 'bg-teal-600 text-white'
                       : dk ? 'bg-[#0F172A] text-slate-500 border border-[#334155]'
                             : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}>
                  {EVENT_ICONS[t.event] ?? <CheckCircle2 size={13} />}
                </div>
                {!isLast && (
                  <div className={`w-px flex-1 my-1 ${done ? 'bg-teal-500' : dk ? 'bg-[#334155]' : 'bg-gray-200'}`} style={{ minHeight: 18 }} />
                )}
              </div>
              <div className="pb-4 min-w-0">
                <p className={`text-sm font-medium leading-tight ${done ? (dk ? 'text-white' : 'text-gray-900') : muted}`}>
                  {t.label}
                </p>
                {t.timestamp ? (
                  <p className={`text-xs mt-0.5 ${muted}`}>
                    {new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' at '}
                    {new Date(t.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </p>
                ) : (
                  <p className={`text-xs mt-0.5 ${muted} italic`}>Pending</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Send Reminder + Call Client — real actions */}
      <div className={`pt-3 mt-1 border-t flex items-center gap-3 flex-wrap ${border}`}>
        <button onClick={sendReminder}
          className="flex items-center gap-1.5 text-xs font-medium text-[#0F766E] hover:underline transition-colors">
          <Send size={11} /> Send Reminder
        </button>
        <span className={`text-xs ${muted}`}>·</span>
        <button onClick={callClient}
          className="flex items-center gap-1.5 text-xs font-medium text-[#0F766E] hover:underline transition-colors">
          <Phone size={11} /> Call Client
        </button>
        {!contactEmail && (
          <span className={`text-xs ${muted} ml-auto`}>Add email to lead to enable reminders</span>
        )}
      </div>
    </div>
  )
}
