import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// ── POST /api/invoices/mark-paid ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { invoice_id, amount, payment_method, notes } = await req.json()
  if (!invoice_id) return NextResponse.json({ error: 'invoice_id required' }, { status: 400 })

  const sb     = getSupabaseAdmin()
  const paidAt = new Date().toISOString()

  const { data: inv, error: invErr } = await sb
    .from('invoices').select('*').eq('id', invoice_id).single()
  if (invErr || !inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  // A1 FIX: subtract from current balance_due, not recalculate from total
  // This handles multiple partial payments correctly
  const amountPaid  = Math.round((amount ?? inv.balance_due) * 100) / 100
  const balanceDue  = Math.max(0, Math.round((inv.balance_due - amountPaid) * 100) / 100)
  const totalPaid   = Math.round((inv.amount_paid + amountPaid) * 100) / 100
  const newStatus   = balanceDue <= 0 ? 'paid' : 'partial_payment'

  await sb.from('invoices').update({
    status:       newStatus,
    paid_at:      newStatus === 'paid' ? paidAt : null,
    amount_paid:  totalPaid,   // accumulate, not overwrite
    balance_due:  balanceDue,
    notes: notes ? `${inv.notes || ''}\nPayment note: ${notes}`.trim() : inv.notes,
  }).eq('id', invoice_id)

  if (newStatus === 'paid' && inv.lead_id) {
    await sb.from('leads').update({
      lead_status:   'Paid',
      quoted_amount: Math.round(inv.total * 100) / 100,
    }).eq('id', inv.lead_id)
  }

  if (newStatus === 'paid' && inv.estimate_id) {
    await sb.from('estimates').update({
      status:  'paid',
      paid_at: paidAt,
    }).eq('id', inv.estimate_id)
  }

  return NextResponse.json({ ok: true, status: newStatus, balance_due: balanceDue })
}
