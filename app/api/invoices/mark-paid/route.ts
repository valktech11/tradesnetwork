import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// ── POST /api/invoices/mark-paid ─────────────────────────────────────────
// Marks invoice paid, closes lead to Paid stage
export async function POST(req: NextRequest) {
  const { invoice_id, amount, payment_method, notes } = await req.json()
  if (!invoice_id) return NextResponse.json({ error: 'invoice_id required' }, { status: 400 })

  const sb      = getSupabaseAdmin()
  const paidAt  = new Date().toISOString()

  // 1. Get invoice
  const { data: inv, error: invErr } = await sb
    .from('invoices').select('*').eq('id', invoice_id).single()
  if (invErr || !inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const amountPaid  = amount ?? inv.balance_due
  const balanceDue  = Math.max(0, inv.total - inv.deposit_paid - amountPaid)
  const newStatus   = balanceDue <= 0 ? 'paid' : 'partial_payment'

  // 2. Update invoice
  await sb.from('invoices').update({
    status:       newStatus,
    paid_at:      newStatus === 'paid' ? paidAt : null,
    amount_paid:  amountPaid,
    balance_due:  balanceDue,
    notes:        notes ? `${inv.notes || ''}\nPayment note: ${notes}`.trim() : inv.notes,
  }).eq('id', invoice_id)

  // 3. If fully paid, move lead to Paid stage
  if (newStatus === 'paid' && inv.lead_id) {
    await sb.from('leads').update({
      lead_status:    'Paid',
      quoted_amount:  inv.total,
    }).eq('id', inv.lead_id)
  }

  // 4. If from estimate, mark estimate paid
  if (newStatus === 'paid' && inv.estimate_id) {
    await sb.from('estimates').update({
      status:  'paid',
      paid_at: paidAt,
    }).eq('id', inv.estimate_id)
  }

  return NextResponse.json({ ok: true, status: newStatus, balance_due: balanceDue })
}
