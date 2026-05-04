import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = getSupabaseAdmin()

  const { data: est } = await sb
    .from('estimates')
    .select('viewed_count, viewed_at, status')
    .eq('id', id)
    .single()

  if (!est) return NextResponse.json({ ok: true })

  // B4 FIX: skip view tracking for drafts
  if (est.status === 'draft') return NextResponse.json({ ok: true })

  // B5 FIX: use atomic increment via RPC to avoid race condition
  // Falls back to read-increment-write if RPC not available
  await sb.rpc('increment_estimate_views', { estimate_id: id }).catch(async () => {
    // Fallback: non-atomic but acceptable for low-concurrency
    await sb.from('estimates').update({
      viewed_count: (est.viewed_count || 0) + 1,
      viewed_at:    est.viewed_at || new Date().toISOString(),
      status:       est.status === 'sent' ? 'viewed' : est.status,
    }).eq('id', id)
  })

  // Also update status and viewed_at if first view
  if (!est.viewed_at) {
    await sb.from('estimates').update({
      viewed_at: new Date().toISOString(),
      status:    est.status === 'sent' ? 'viewed' : est.status,
    }).eq('id', id)
  }

  return NextResponse.json({ ok: true })
}
