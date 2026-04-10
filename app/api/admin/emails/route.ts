import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendClaimEmail } from '@/lib/email'

async function verifyAdmin(req: NextRequest) {
  const proId = req.headers.get('x-pro-id')
  if (!proId) return false
  const { data } = await getSupabaseAdmin()
    .from('pros').select('is_admin').eq('id', proId).single()
  return data?.is_admin === true
}

export async function POST(req: NextRequest) {
  if (!await verifyAdmin(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { city, limit = 20 } = await req.json()

  let q = getSupabaseAdmin().from('pros')
    .select('id, full_name, email, city, state, license_number, trade_category:trade_categories(category_name)')
    .eq('is_claimed', false)
    .eq('profile_status', 'Active')
    .eq('email_sent', false)

  if (city) q = q.ilike('city', city)
  q = q.limit(limit)

  const { data: pros } = await q
  if (!pros?.length) return NextResponse.json({ sent: 0, message: 'No unclaimed pros found' })

  let sent = 0
  for (const pro of pros) {
    try {
      await sendClaimEmail(pro)
      await getSupabaseAdmin().from('pros').update({ email_sent: true }).eq('id', pro.id)
      sent++
    } catch (e) {
      console.error('Email failed for', pro.email, e)
    }
  }

  return NextResponse.json({ sent, total: pros.length })
}
