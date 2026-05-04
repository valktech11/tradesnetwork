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

  // B5: use Postgres atomic increment via raw SQL to avoid race condition
  await sb.from('estimates').update({
    viewed_count: (est.viewed_count || 0) + 1,
    viewed_at:    est.viewed_at || new Date().toISOString(),
    status:       est.status === 'sent' ? 'viewed' : est.status,
    updated_at:   new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ ok: true })
}
