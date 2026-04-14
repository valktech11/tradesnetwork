import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || 'placeholder')
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb    = getSupabaseAdmin()
  const today = new Date()
  const in30  = new Date(today); in30.setDate(today.getDate() + 30)
  const in7   = new Date(today); in7.setDate(today.getDate() + 7)
  const todayStr = today.toISOString().split('T')[0]
  const in30Str  = in30.toISOString().split('T')[0]

  const [{ data: expiring }, { data: expired }, { data: active }] = await Promise.all([
    sb.from('pros').select('id,full_name,email,license_number,license_expiry_date')
      .eq('is_claimed', true).not('license_expiry_date','is',null)
      .lte('license_expiry_date', in30Str).gte('license_expiry_date', todayStr),
    sb.from('pros').select('id,full_name,email,license_number,license_expiry_date')
      .eq('is_claimed', true).not('license_expiry_date','is',null)
      .lt('license_expiry_date', todayStr),
    sb.from('pros').select('id').not('license_expiry_date','is',null)
      .gt('license_expiry_date', in30Str),
  ])

  let emailsSent = 0

  for (const pro of (expiring || [])) {
    const daysLeft = Math.ceil((new Date(pro.license_expiry_date).getTime() - today.getTime()) / 86400000)
    await sb.from('pros').update({ license_status: 'expiring_soon' }).eq('id', pro.id)
    if (daysLeft === 30 || daysLeft === 7) {
      try {
        await getResend().emails.send({
          from: 'TradesNetwork <alerts@tradesnetwork.com>',
          to: pro.email,
          subject: `⚠️ Your license expires in ${daysLeft} days`,
          html: `<p>Hi ${pro.full_name}, your license <b>${pro.license_number}</b> expires in ${daysLeft} days. Please renew to keep your green verified badge on TradesNetwork.</p><p><a href="https://tradesnetwork.vercel.app/edit-profile">Update my profile →</a></p>`,
        })
        emailsSent++
      } catch(e) {}
    }
  }

  for (const pro of (expired || [])) {
    await sb.from('pros').update({ license_status: 'expired' }).eq('id', pro.id)
  }

  if ((active || []).length > 0) {
    const ids = (active || []).map((p: any) => p.id)
    await sb.from('pros').update({ license_status: 'active' }).in('id', ids)
  }

  // ── INSURANCE EXPIRY CHECK ─────────────────────────────────────
  const [{ data: insExpiring }, { data: insExpired }, { data: insActive }] = await Promise.all([
    sb.from('pro_insurance').select('id,pro_id,expiry_date')
      .not('expiry_date','is',null).lte('expiry_date', in30Str).gte('expiry_date', todayStr),
    sb.from('pro_insurance').select('id,pro_id')
      .not('expiry_date','is',null).lt('expiry_date', todayStr),
    sb.from('pro_insurance').select('id,pro_id')
      .not('expiry_date','is',null).gt('expiry_date', in30Str),
  ])

  for (const ins of (insExpiring || [])) {
    await sb.from('pro_insurance').update({ insurance_status: 'expiring_soon' }).eq('id', ins.id)
    await sb.from('pros').update({ insurance_status: 'expiring_soon', insurance_expiry_date: ins.expiry_date }).eq('id', ins.pro_id)
  }
  for (const ins of (insExpired || [])) {
    await sb.from('pro_insurance').update({ insurance_status: 'expired' }).eq('id', ins.id)
    // Suspend profile if insurance expired
    await sb.from('pros').update({ insurance_status: 'expired', profile_status: 'Suspended' }).eq('id', ins.pro_id)
  }
  if ((insActive || []).length > 0) {
    const ids = (insActive || []).map((i: any) => i.id)
    await sb.from('pro_insurance').update({ insurance_status: 'active' }).in('id', ids)
    const proIds = [...new Set((insActive || []).map((i: any) => i.pro_id))]
    for (const pid of proIds) {
      await sb.from('pros').update({ insurance_status: 'active' }).eq('id', pid)
    }
  }

  return NextResponse.json({ ok: true, expiring: expiring?.length || 0, expired: expired?.length || 0, emailsSent, insuranceExpiring: insExpiring?.length || 0, insuranceExpired: insExpired?.length || 0 })
}
