'use client'

import { Dispatch, SetStateAction } from 'react'
import { CreditCard, Link2, BadgeCheck } from 'lucide-react'
import { Estimate } from '@/app/dashboard/estimates/[id]/page'

export default function PaymentPanel({
  estimate,
  setEstimate,
  darkMode,
}: {
  estimate: Estimate
  setEstimate: Dispatch<SetStateAction<Estimate | null>>
  darkMode: boolean
}) {
  const dk = darkMode
  const card = dk ? 'bg-[#1E293B] text-white border-[#334155]' : 'bg-white text-gray-900 border-[#E8E2D9]'
  const muted = dk ? 'text-slate-400' : 'text-[#6B7280]'
  const divider = dk ? 'border-[#334155]' : 'border-[#E8E2D9]'

  const depositAmount = estimate.total * (estimate.deposit_percent / 100)
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

  const toggleDeposit = () => {
    setEstimate(prev => prev ? { ...prev, require_deposit: !prev.require_deposit } : prev)
  }

  return (
    <div className={`rounded-xl border p-5 space-y-4 ${card}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Get Paid Faster</h3>
        <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
          Recommended
        </span>
      </div>

      {/* Deposit row */}
      <div className={`flex justify-between items-center text-sm pb-3 border-b ${divider}`}>
        <span className={muted}>Deposit ({estimate.deposit_percent}%)</span>
        <span className="font-semibold">{fmt(depositAmount)}</span>
      </div>

      {/* Require deposit toggle */}
      <div className="flex items-center justify-between text-sm">
        <span className={muted}>Require deposit before job starts</span>
        {/* Animated toggle */}
        <button
          onClick={toggleDeposit}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:ring-offset-1 ${
            estimate.require_deposit ? 'bg-[#0F766E]' : dk ? 'bg-slate-600' : 'bg-gray-200'
          }`}
          role="switch"
          aria-checked={estimate.require_deposit}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
              estimate.require_deposit ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Request Deposit CTA */}
      <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0F766E] to-[#0D9488] text-white py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
        <CreditCard size={15} />
        Request Deposit
      </button>

      {/* Send with Payment Link */}
      <button className={`w-full flex items-center justify-center gap-2 border py-2.5 rounded-lg text-sm font-medium transition-colors ${
        dk
          ? 'border-[#334155] text-slate-300 hover:border-[#0F766E] hover:text-[#0F766E]'
          : 'border-[#E8E2D9] text-[#6B7280] hover:border-[#0F766E] hover:text-[#0F766E]'
      }`}>
        <Link2 size={15} />
        Send with Payment Link
      </button>
    </div>
  )
}
