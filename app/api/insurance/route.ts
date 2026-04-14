import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const proId = new URL(req.url).searchParams.get('pro_id')
  if (!proId) return NextResponse.json({ error: 'pro_id required' }, { status: 400 })
  const { data } = await getSupabaseAdmin()
    .from('pro_insurance').select('*').eq('pro_id', proId)
    .order('created_at', { ascending: false })
  return NextResponse.json({ insurance: data || [] })
}

export async function POST(req: NextRequest) {
  const { pro_id, file_url } = await req.json()
  if (!pro_id || !file_url) return NextResponse.json({ error: 'pro_id and file_url required' }, { status: 400 })
  const sb = getSupabaseAdmin()

  let extracted = { insurer_name: null as string|null, policy_number: null as string|null, coverage_type: null as string|null, expiry_date: null as string|null }
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (apiKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'url', url: file_url } },
            { type: 'text', text: 'Extract from this Certificate of Insurance. Respond ONLY with JSON, no markdown:\n{"insurer_name":"string or null","policy_number":"string or null","coverage_type":"string or null","expiry_date":"YYYY-MM-DD or null"}' },
          ]}],
        }),
      })
      if (res.ok) {
        const d = await res.json()
        const text = (d.content?.[0]?.text || '').replace(/```json|```/g, '').trim()
        const p = JSON.parse(text)
        extracted = { insurer_name: p.insurer_name||null, policy_number: p.policy_number||null, coverage_type: p.coverage_type||null, expiry_date: p.expiry_date||null }
      }
    } catch(e) { console.error('COI extract:', e) }
  }

  let status = 'unknown'
  if (extracted.expiry_date) {
    const exp = new Date(extracted.expiry_date), now = new Date()
    const in30 = new Date(); in30.setDate(now.getDate()+30)
    status = exp < now ? 'expired' : exp < in30 ? 'expiring_soon' : 'active'
  }

  const { data, error } = await sb.from('pro_insurance').insert({
    pro_id, file_url, ...extracted, insurance_status: status,
    extracted_at: apiKey ? new Date().toISOString() : null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await sb.from('pros').update({ insurance_status: status, insurance_expiry_date: extracted.expiry_date||null }).eq('id', pro_id)
  return NextResponse.json({ insurance: data, extracted }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { pro_id, id } = await req.json()
  if (!pro_id || !id) return NextResponse.json({ error: 'pro_id and id required' }, { status: 400 })
  const sb = getSupabaseAdmin()
  await sb.from('pro_insurance').delete().eq('id', id).eq('pro_id', pro_id)
  const { data: rem } = await sb.from('pro_insurance').select('id').eq('pro_id', pro_id).limit(1)
  if (!rem?.length) await sb.from('pros').update({ insurance_status: 'unknown', insurance_expiry_date: null }).eq('id', pro_id)
  return NextResponse.json({ ok: true })
}
