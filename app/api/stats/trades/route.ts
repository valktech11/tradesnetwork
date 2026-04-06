import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from('trade_stats')
    .select('*')
    .order('pro_count', { ascending: false })

  if (error) {
    console.error('GET /api/stats/trades error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const total = (data || []).reduce((sum, t) => sum + (t.pro_count || 0), 0)

  return NextResponse.json({ trades: data || [], total })
}
