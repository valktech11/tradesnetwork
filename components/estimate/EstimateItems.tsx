'use client'

import { Dispatch, SetStateAction } from 'react'
import { Plus, Pencil, Copy, Trash2, GripVertical } from 'lucide-react'
import { Estimate, EstimateItem } from '@/app/dashboard/estimates/[id]/page'

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

function recalcTotals(items: EstimateItem[], taxRate: number, discount: number) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0)
  const discounted = subtotal - discount
  const tax_amount = Math.max(0, discounted) * (taxRate / 100)
  const total = Math.max(0, discounted) + tax_amount
  return { subtotal, tax_amount, total }
}

export default function EstimateItems({
  estimate,
  setEstimate,
  darkMode,
}: {
  estimate: Estimate
  setEstimate: Dispatch<SetStateAction<Estimate | null>>
  darkMode: boolean
}) {
  const dk = darkMode
  const inputCls = `w-full border rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#0F766E] ${
    dk
      ? 'bg-[#0F172A] border-[#334155] text-white'
      : 'bg-white border-[#E8E2D9] text-gray-900'
  }`
  const muted = dk ? 'text-slate-400' : 'text-[#9CA3AF]'
  const rowBorder = dk ? 'border-[#334155]' : 'border-[#E8E2D9]'
  const rowHover = dk ? 'hover:bg-[#0F172A]' : 'hover:bg-[#F9FAFB]'

  const updateItem = (id: string, field: 'qty' | 'unit_price' | 'name' | 'description', value: string | number) => {
    const updated = estimate.items.map(i =>
      i.id === id ? { ...i, [field]: value, amount: field === 'qty' ? (value as number) * i.unit_price : field === 'unit_price' ? i.qty * (value as number) : i.amount } : i
    )
    const { subtotal, tax_amount, total } = recalcTotals(updated, estimate.tax_rate, estimate.discount)
    setEstimate(prev => prev ? { ...prev, items: updated, subtotal, tax_amount, total } : prev)
  }

  const addItem = () => {
    const newItem: EstimateItem = {
      id: generateId(),
      name: 'New Item',
      description: '',
      qty: 1,
      unit_price: 0,
      amount: 0,
    }
    const updated = [...estimate.items, newItem]
    const { subtotal, tax_amount, total } = recalcTotals(updated, estimate.tax_rate, estimate.discount)
    setEstimate(prev => prev ? { ...prev, items: updated, subtotal, tax_amount, total } : prev)
  }

  const duplicateItem = (item: EstimateItem) => {
    const dup = { ...item, id: generateId() }
    const updated = [...estimate.items, dup]
    const { subtotal, tax_amount, total } = recalcTotals(updated, estimate.tax_rate, estimate.discount)
    setEstimate(prev => prev ? { ...prev, items: updated, subtotal, tax_amount, total } : prev)
  }

  const deleteItem = (id: string) => {
    const updated = estimate.items.filter(i => i.id !== id)
    const { subtotal, tax_amount, total } = recalcTotals(updated, estimate.tax_rate, estimate.discount)
    setEstimate(prev => prev ? { ...prev, items: updated, subtotal, tax_amount, total } : prev)
  }

  return (
    <div>
      {/* Column headers */}
      <div className={`grid grid-cols-[24px_32px_1fr_80px_100px_90px_80px] gap-2 px-2 pb-2 text-xs font-semibold tracking-wide uppercase ${muted}`}>
        <span />
        <span>#</span>
        <span>Item / Description</span>
        <span className="text-right">QTY</span>
        <span className="text-right">Unit Price</span>
        <span className="text-right">Amount</span>
        <span />
      </div>

      {/* Item rows */}
      <div className="space-y-2">
        {estimate.items.map((item, idx) => (
          <div
            key={item.id}
            className={`grid grid-cols-[24px_32px_1fr_80px_100px_90px_80px] gap-2 items-center border rounded-xl px-3 py-3 transition-colors ${rowBorder} ${rowHover}`}
          >
            {/* Drag handle */}
            <span className={`cursor-grab ${muted}`}>
              <GripVertical size={14} />
            </span>

            {/* Row number */}
            <span className={`text-sm font-medium ${muted}`}>{idx + 1}</span>

            {/* Name + description */}
            <div className="space-y-1 min-w-0">
              <input
                value={item.name}
                onChange={e => updateItem(item.id, 'name', e.target.value)}
                className={`w-full bg-transparent text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F766E] rounded px-1 ${dk ? 'text-white' : 'text-gray-900'}`}
              />
              <input
                value={item.description}
                onChange={e => updateItem(item.id, 'description', e.target.value)}
                placeholder="Description (optional)"
                className={`w-full bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-[#0F766E] rounded px-1 ${muted} placeholder:opacity-50`}
              />
            </div>

            {/* QTY */}
            <input
              type="number"
              min={1}
              value={item.qty}
              onChange={e => updateItem(item.id, 'qty', Number(e.target.value))}
              className={inputCls}
            />

            {/* Unit price */}
            <div className="relative">
              <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-sm ${muted}`}>$</span>
              <input
                type="number"
                min={0}
                value={item.unit_price}
                onChange={e => updateItem(item.id, 'unit_price', Number(e.target.value))}
                className={`${inputCls} pl-5`}
              />
            </div>

            {/* Amount (readonly) */}
            <span className={`text-sm font-semibold text-right pr-1 ${dk ? 'text-white' : 'text-gray-900'}`}>
              ${(item.qty * item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>

            {/* Row actions */}
            <div className={`flex items-center gap-1 ${muted}`}>
              <button
                onClick={() => duplicateItem(item)}
                className="p-1 rounded hover:text-[#0F766E] transition-colors"
                title="Duplicate"
              >
                <Copy size={13} />
              </button>
              <button
                onClick={() => deleteItem(item.id)}
                className="p-1 rounded hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add item + Add from template */}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={addItem}
          className="flex items-center gap-2 text-sm font-medium text-[#0F766E] border border-[#0F766E] px-4 py-2 rounded-lg hover:bg-teal-50 transition-colors"
        >
          <Plus size={15} />
          Add Item
        </button>
        <button
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
            dk ? 'border-[#334155] text-slate-400 hover:border-[#0F766E] hover:text-[#0F766E]' : 'border-[#E8E2D9] text-[#6B7280] hover:border-[#0F766E] hover:text-[#0F766E]'
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
          Add from Template
        </button>
      </div>

      {/* Save templates nudge */}
      <div className={`mt-5 flex items-center justify-between rounded-xl border px-4 py-3 ${dk ? 'border-[#334155] bg-[#0F172A]' : 'border-[#E8E2D9] bg-[#F9FAFB]'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dk ? 'bg-[#1E293B]' : 'bg-white border border-[#E8E2D9]'}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
          </div>
          <div>
            <p className={`text-sm font-medium ${dk ? 'text-white' : 'text-gray-900'}`}>Save time with templates</p>
            <p className={`text-xs ${muted}`}>Create reusable templates for your common jobs</p>
          </div>
        </div>
        <button className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${dk ? 'border-[#334155] text-slate-400 hover:border-[#0F766E] hover:text-[#0F766E]' : 'border-[#E8E2D9] text-[#6B7280] hover:border-[#0F766E] hover:text-[#0F766E]'}`}>
          Manage Templates
        </button>
      </div>
    </div>
  )
}
