'use client'

import { Send, Eye, CheckCircle2, CreditCard } from 'lucide-react'

type TimelineEvent = {
  event: string
  label: string
  timestamp: string | null
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  sent:     <Send size={14} />,
  viewed:   <Eye size={14} />,
  approved: <CheckCircle2 size={14} />,
  paid:     <CreditCard size={14} />,
}

export default function ApprovalTimeline({
  timeline,
  darkMode,
}: {
  timeline: TimelineEvent[]
  darkMode: boolean
}) {
  const dk = darkMode
  const card = dk ? 'bg-[#1E293B] text-white border-[#334155]' : 'bg-white text-gray-900 border-[#E8E2D9]'
  const muted = dk ? 'text-slate-400' : 'text-[#9CA3AF]'

  return (
    <div className={`rounded-xl border p-5 ${card}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Approval Status</h3>
        <button className="text-xs text-[#0F766E] hover:underline">View timeline</button>
      </div>

      <ul className="space-y-0">
        {timeline.map((t, i) => {
          const done = t.timestamp !== null
          const isLast = i === timeline.length - 1

          return (
            <li key={t.event} className="flex gap-3">
              {/* Icon + connector line */}
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  done
                    ? 'bg-teal-600 text-white'
                    : dk ? 'bg-[#0F172A] text-slate-500 border border-[#334155]' : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}>
                  {EVENT_ICONS[t.event] ?? <CheckCircle2 size={14} />}
                </div>
                {!isLast && (
                  <div className={`w-px flex-1 my-1 ${done ? 'bg-teal-600' : dk ? 'bg-[#334155]' : 'bg-gray-200'}`} style={{ minHeight: 16 }} />
                )}
              </div>

              {/* Label + timestamp */}
              <div className="pb-4 min-w-0">
                <p className={`text-sm font-medium leading-tight ${done ? (dk ? 'text-white' : 'text-gray-900') : muted}`}>
                  {t.label}
                </p>
                {t.timestamp && (
                  <p className={`text-xs mt-0.5 ${muted}`}>
                    {new Date(t.timestamp).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}{' '}
                    at{' '}
                    {new Date(t.timestamp).toLocaleTimeString('en-US', {
                      hour: 'numeric', minute: '2-digit', hour12: true,
                    })}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Client actions footer */}
      <div className={`pt-3 mt-1 border-t flex flex-wrap gap-x-4 gap-y-1 text-xs ${dk ? 'border-[#334155]' : 'border-[#E8E2D9]'}`}>
        <button className="text-[#0F766E] hover:underline">Send Reminder</button>
        <button className="text-[#0F766E] hover:underline">Call Client</button>
      </div>
    </div>
  )
}
