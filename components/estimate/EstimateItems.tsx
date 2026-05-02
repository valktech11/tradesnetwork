'use client'

import { Dispatch, SetStateAction, useState } from 'react'
import { Plus, Pencil, Copy, Trash2, GripVertical, BookOpen, Check, X } from 'lucide-react'
import { Estimate, EstimateItem } from '@/app/dashboard/estimates/[id]/page'

function generateId() { return Math.random().toString(36).slice(2, 10) }

function recalcTotals(items: EstimateItem[], taxRate: number, discount: number) {
  const subtotal   = items.reduce((s, i) => s + i.qty * i.unit_price, 0)
  const discounted = Math.max(0, subtotal - discount)
  const tax_amount = discounted * (taxRate / 100)
  return { subtotal, tax_amount, total: discounted + tax_amount }
}

type Template = { id: string; name: string; items: EstimateItem[] }

// ── Inline edit state for a single row ─────────────────────────────────────
type RowEdit = {
  id:          string
  name:        string
  description: string
  qty:         number
  unit_price:  number
}

export default function EstimateItems({
  estimate, setEstimate, darkMode, onOpenTemplatePicker, onSaveTemplate,
}: {
  estimate:            Estimate
  setEstimate:         Dispatch<SetStateAction<Estimate | null>>
  darkMode:            boolean
  onOpenTemplatePicker?: () => void
  onSaveTemplate?:     () => void
}) {
  const dk = darkMode
  const [editRow, setEditRow] = useState<RowEdit | null>(null)

  const muted    = dk ? 'text-slate-400'   : 'text-[#9CA3AF]'
  const textMain = dk ? 'text-white'       : 'text-gray-900'
  const textBody = dk ? 'text-slate-300'   : 'text-[#374151]'
  const divider  = dk ? 'border-[#334155]' : 'border-[#E8E2D9]'
  const rowBg    = dk ? 'bg-[#1E293B]'     : 'bg-white'
  const rowHover = dk ? 'hover:bg-[#243447]' : 'hover:bg-[#FAFAF8]'
  const inputCls = `w-full rounded-lg px-2.5 py-1.5 text-sm ${dk ? 'bg-[#0F172A] text-white' : 'bg-[#F5F4F0] text-gray-900'} focus:ring-1 focus:ring-[#0F766E]`

  const fmt = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const commitEdit = () => {
    if (!editRow) return
    const updated = estimate.items.map(i =>
      i.id === editRow.id
        ? { ...i, name: editRow.name, description: editRow.description, qty: editRow.qty, unit_price: editRow.unit_price, amount: editRow.qty * editRow.unit_price }
        : i
    )
    const t = recalcTotals(updated, estimate.tax_rate, estimate.discount)
    setEstimate(prev => prev ? { ...prev, items: updated, ...t } : prev)
    setEditRow(null)
  }

  const cancelEdit = () => setEditRow(null)

  const startEdit = (item: EstimateItem) =>
    setEditRow({ id: item.id, name: item.name, description: item.description, qty: item.qty, unit_price: item.unit_price })

  const addItem = () => {
    const newItem: EstimateItem = { id: generateId(), name: 'New Item', description: '', qty: 1, unit_price: 0, amount: 0 }
    const items = [...estimate.items, newItem]
    const t = recalcTotals(items, estimate.tax_rate, estimate.discount)
    setEstimate(prev => prev ? { ...prev, items, ...t } : prev)
    setEditRow({ id: newItem.id, name: newItem.name, description: newItem.description, qty: newItem.qty, unit_price: newItem.unit_price })
  }

  const duplicateItem = (item: EstimateItem) => {
    const dup   = { ...item, id: generateId() }
    const items = [...estimate.items, dup]
    const t     = recalcTotals(items, estimate.tax_rate, estimate.discount)
    setEstimate(prev => prev ? { ...prev, items, ...t } : prev)
  }

  const deleteItem = (id: string) => {
    if (editRow?.id === id) setEditRow(null)
    const items = estimate.items.filter(i => i.id !== id)
    const t     = recalcTotals(items, estimate.tax_rate, estimate.discount)
    setEstimate(prev => prev ? { ...prev, items, ...t } : prev)
  }

  return (
    <div>
      {/* ── Column header row ── */}
      <div className={`grid grid-cols-[20px_32px_1fr_90px_110px_110px_88px] items-center px-4 pb-2 text-[11px] font-semibold tracking-widest uppercase ${muted}`}>
        <span /><span>#</span>
        <span>Item</span>
        <span className="text-center">QTY</span>
        <span className="text-right">Unit Price</span>
        <span className="text-right">Amount</span>
        <span />
      </div>

      {/* ── Item rows ── */}
      <div className={`rounded-xl border overflow-hidden ${divider}`}>
        {estimate.items.map((item, idx) => {
          const isEditing = editRow?.id === item.id

          return (
            <div key={item.id}
              className={`border-b last:border-b-0 ${divider} ${isEditing ? (dk ? 'bg-[#243447]' : 'bg-[#F0FDF9]') : `${rowBg} ${rowHover}`} transition-colors`}>

              {isEditing ? (
                /* ── Edit mode ── */
                <div className="px-4 py-3 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-[10px] font-semibold uppercase tracking-wider ${muted} mb-1 block`}>Item Name</label>
                      <input
                        autoFocus
                        value={editRow!.name}
                        onChange={e => setEditRow(r => r ? { ...r, name: e.target.value } : r)}
                        className={inputCls}
                        placeholder="Item name"
                        onKeyDown={e => e.key === 'Enter' && commitEdit()}
                      />
                    </div>
                    <div>
                      <label className={`text-[10px] font-semibold uppercase tracking-wider ${muted} mb-1 block`}>Description</label>
                      <input
                        value={editRow!.description}
                        onChange={e => setEditRow(r => r ? { ...r, description: e.target.value } : r)}
                        className={inputCls}
                        placeholder="Optional description"
                        onKeyDown={e => e.key === 'Enter' && commitEdit()}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-[10px] font-semibold uppercase tracking-wider ${muted} mb-1 block`}>Quantity</label>
                      <input
                        type="number" min={0}
                        value={editRow!.qty}
                        onChange={e => setEditRow(r => r ? { ...r, qty: Number(e.target.value) } : r)}
                        className={inputCls}
                        onKeyDown={e => e.key === 'Enter' && commitEdit()}
                      />
                    </div>
                    <div>
                      <label className={`text-[10px] font-semibold uppercase tracking-wider ${muted} mb-1 block`}>Unit Price ($)</label>
                      <input
                        type="number" min={0}
                        value={editRow!.unit_price}
                        onChange={e => setEditRow(r => r ? { ...r, unit_price: Number(e.target.value) } : r)}
                        className={inputCls}
                        onKeyDown={e => e.key === 'Enter' && commitEdit()}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-sm ${muted}`}>
                      Subtotal: <span className={`font-semibold ${textMain}`}>{fmt(editRow!.qty * editRow!.unit_price)}</span>
                    </span>
                    <div className="flex gap-2">
                      <button onClick={cancelEdit}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          dk ? 'border-[#334155] text-slate-400 hover:border-red-500 hover:text-red-400'
                             : 'border-[#E8E2D9] text-gray-500 hover:border-red-300 hover:text-red-500'}`}>
                        <X size={13} /> Cancel
                      </button>
                      <button onClick={commitEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-[#0F766E] text-white hover:bg-[#0D6A62] transition-colors">
                        <Check size={13} /> Done
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Display mode ── */
                <div className="grid grid-cols-[20px_32px_1fr_90px_110px_110px_88px] items-center px-4 py-3.5 gap-x-3">
                  {/* Drag handle */}
                  <span className={`cursor-grab ${muted} opacity-40 hover:opacity-100`}>
                    <GripVertical size={13} />
                  </span>

                  {/* Row number */}
                  <span className={`text-sm font-medium ${muted}`}>{idx + 1}</span>

                  {/* Item + description */}
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold leading-snug ${textMain}`}>{item.name || <span className={muted}>Unnamed item</span>}</p>
                    {item.description && <p className={`text-xs mt-0.5 ${muted}`}>{item.description}</p>}
                  </div>

                  {/* QTY */}
                  <div className="text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium border ${
                      dk ? 'bg-[#0F172A] border-[#334155] text-white' : 'bg-white border-[#E8E2D9] text-gray-900'
                    }`}>{item.qty}</span>
                    <p className={`text-[10px] mt-0.5 ${muted}`}>job</p>
                  </div>

                  {/* Unit price */}
                  <span className={`text-sm text-right ${textBody}`}>{fmt(item.unit_price)}</span>

                  {/* Amount */}
                  <span className={`text-sm font-semibold text-right ${textMain}`}>{fmt(item.qty * item.unit_price)}</span>

                  {/* Actions — always visible */}
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => startEdit(item)}
                      title="Edit"
                      className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors ${
                        dk ? 'border-[#334155] text-slate-400 hover:border-[#0F766E] hover:text-[#0F766E]'
                           : 'border-[#E8E2D9] text-gray-400 hover:border-[#0F766E] hover:text-[#0F766E]'}`}>
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => duplicateItem(item)}
                      title="Duplicate"
                      className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors ${
                        dk ? 'border-[#334155] text-slate-400 hover:border-[#0F766E] hover:text-[#0F766E]'
                           : 'border-[#E8E2D9] text-gray-400 hover:border-[#0F766E] hover:text-[#0F766E]'}`}>
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      title="Delete"
                      className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors ${
                        dk ? 'border-[#334155] text-slate-400 hover:border-red-500 hover:text-red-400'
                           : 'border-[#E8E2D9] text-gray-400 hover:border-red-400 hover:text-red-500'}`}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* ── Add Item — full width dashed button inside the table ── */}
        <button
          onClick={addItem}
          className={`w-full flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
            dk ? 'text-slate-400 hover:text-[#0F766E] hover:bg-[#243447]'
               : 'text-[#6B7280] hover:text-[#0F766E] hover:bg-[#F0FDF9]'
          }`}
          style={{ borderTop: `1.5px dashed ${dk ? '#334155' : '#D1FAE5'}` }}>
          <Plus size={15} className="text-[#0F766E]" />
          Add Item
        </button>
      </div>

      {/* ── Save time with templates nudge card ── */}
      <div className={`mt-4 flex items-center justify-between rounded-xl border px-5 py-4 ${
        dk ? 'border-[#334155] bg-[#1E293B]' : 'border-[#E8E2D9] bg-white'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            dk ? 'bg-[#0F172A]' : 'bg-[#F0F9FF]'}`}>
            <BookOpen size={18} className="text-[#0F766E]" />
          </div>
          <div>
            <p className={`text-sm font-semibold ${textMain}`}>Save time with templates</p>
            <p className={`text-xs mt-0.5 ${muted}`}>Create reusable templates for your common jobs and send estimates in seconds.</p>
          </div>
        </div>
        <button
          onClick={onSaveTemplate}
          className={`shrink-0 text-sm font-medium px-4 py-2 rounded-lg border transition-colors ml-4 ${
            dk ? 'border-[#334155] text-slate-300 hover:border-[#0F766E] hover:text-[#0F766E]'
               : 'border-[#E8E2D9] text-[#374151] hover:border-[#0F766E] hover:text-[#0F766E]'}`}>
          Manage Templates
        </button>
      </div>
    </div>
  )
}
