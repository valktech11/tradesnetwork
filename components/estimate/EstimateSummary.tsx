'use client'

import { CalendarDays } from 'lucide-react'
import { Estimate } from '@/app/dashboard/estimates/[id]/page'

export default function EstimateSummary({
  estimate,
  darkMode,
}: {
  estimate: Estimate
  darkMode: boolean
}) {
  const dk = darkMode
  const card = dk ? 'bg-[#1E293B] text-white border-[#334155]' : 'bg-white text-gray-900 border-[#E8E2D9]'
  const muted = dk ? 'text-slate-400' : 'text-[#6B7280]'
  const divider = dk ? 'border-[#334155]' : 'border-[#E8E2D9]'

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

  return (
    <div className={`rounded-xl border p-5 ${card}`}>
      <h3 className="font-semibold mb-4">Estimate Summary</h3>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className={muted}>Subtotal</span>
          <span className="font-medium">{fmt(estimate.subtotal)}</span>
        </div>

        {estimate.discount > 0 && (
          <div className="flex justify-between">
            <span className={muted}>Discount</span>
            <span className="font-medium text-green-600">− {fmt(estimate.discount)}</span>
          </div>
        )}

        <div className="flex justify-between items-start">
          <div>
            <span className={muted}>Tax ({estimate.tax_rate}%)</span>
            {estimate.tax_rate > 0 && (
              <p className="text-[10px] mt-0.5 text-amber-500">Base state rate — adjust for your county</p>
            )}
          </div>
          <span className="font-medium">{fmt(estimate.tax_amount)}</span>
        </div>
      </div>

      <div className={`border-t mt-4 pt-4 flex justify-between items-center ${divider}`}>
        <span className="font-semibold">Total You'll Earn</span>
        <span className="text-2xl font-bold text-[#0F766E]">{fmt(estimate.total)}</span>
      </div>

      {/* Validity notice */}
      <div className={`mt-4 flex items-start gap-2.5 rounded-lg p-3 ${dk ? 'bg-[#0F172A]' : 'bg-teal-50'}`}>
        <CalendarDays size={15} className="text-[#0F766E] mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed">
          <span className={muted}>This estimate is valid until </span>
          <span className="font-semibold text-[#0F766E]">
            {new Date(estimate.valid_until).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </p>
      </div>
    </div>
  )
}
