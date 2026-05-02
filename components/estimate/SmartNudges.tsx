'use client'

import { Zap, Lightbulb } from 'lucide-react'

export default function SmartNudges({ darkMode }: { darkMode: boolean }) {
  const dk = darkMode

  return (
    <div className={`flex items-center justify-between rounded-xl border px-5 py-3.5 ${
      dk
        ? 'bg-[#1E293B] border-amber-800/40'
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          dk ? 'bg-amber-900/40' : 'bg-amber-100'
        }`}>
          <Zap size={16} className="text-amber-500" />
        </div>
        <div>
          <p className={`text-sm font-semibold ${dk ? 'text-amber-300' : 'text-amber-800'}`}>
            Estimates sent within 10 minutes close 2× faster
          </p>
          <p className={`text-xs ${dk ? 'text-amber-500/80' : 'text-amber-700'}`}>
            Send this estimate now to improve your chances.
          </p>
        </div>
      </div>

      <button className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border shrink-0 transition-colors ${
        dk
          ? 'border-amber-700 text-amber-400 hover:bg-amber-900/30'
          : 'border-amber-300 bg-white text-amber-700 hover:bg-amber-50'
      }`}>
        <Lightbulb size={12} />
        See Tips
      </button>
    </div>
  )
}
