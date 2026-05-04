import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = getSupabaseAdmin()

  // B1+B2 FIX: guard status AND check expiry server-side
  const { data: est } = await sb
    .from('estimates').select('status, valid_until').eq('id', id).single()

  if (!est) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['sent', 'viewed'].includes(est.status))
    return NextResponse.json({ error: 'Estimate cannot be approved in its current state' }, { status: 400 })
  if (new Date(est.valid_until) < new Date())
    return NextResponse.json({ error: 'Estimate has expired' }, { status: 400 })

  await sb.from('estimates').update({
    status:      'approved',
    approved_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ ok: true })
}
