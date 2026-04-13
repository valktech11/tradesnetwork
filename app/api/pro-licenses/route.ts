import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const proId = new URL(req.url).searchParams.get('pro_id')
  if (!proId) return NextResponse.json({ error: 'pro_id required' }, { status: 400 })
  const { data } = await getSupabaseAdmin()
    .from('pro_licenses')
    .select('*')
    .eq('pro_id', proId)
    .order('is_primary', { ascending: false })
    .order('created_at')
  return NextResponse.json({ licenses: data || [] })
}

export async function POST(req: NextRequest) {
  const { pro_id, trade_name, license_number, license_expiry_date, is_primary } = await req.json()
  if (!pro_id || !trade_name || !license_number)
    return NextResponse.json({ error: 'pro_id, trade_name and license_number required' }, { status: 400 })

  const sb = getSupabaseAdmin()

  // If setting as primary, unset others first
  if (is_primary) {
    await sb.from('pro_licenses').update({ is_primary: false }).eq('pro_id', pro_id)
  }

  const { data, error } = await sb
    .from('pro_licenses')
    .upsert({
      pro_id,
      trade_name: trade_name.trim(),
      license_number: license_number.trim(),
      license_expiry_date: license_expiry_date || null,
      license_status: 'active',
      is_primary: is_primary || false,
    }, { onConflict: 'pro_id,license_number' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync primary license back to pros table for backwards compatibility
  if (is_primary) {
    await sb.from('pros').update({
      license_number: license_number.trim(),
      license_expiry_date: license_expiry_date || null,
    }).eq('id', pro_id)
  }

  return NextResponse.json({ license: data }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { pro_id, id } = await req.json()
  if (!pro_id || !id) return NextResponse.json({ error: 'pro_id and id required' }, { status: 400 })
  await getSupabaseAdmin().from('pro_licenses').delete().eq('id', id).eq('pro_id', pro_id)
  return NextResponse.json({ ok: true })
}
