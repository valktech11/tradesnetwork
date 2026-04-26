import { NextResponse, NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const BASE  = 'https://proguild.ai'
const LIMIT = 45000

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ batch: string }> }
) {
  const { batch } = await context.params
  const batchNum  = parseInt(batch, 10)
  if (isNaN(batchNum)) return new NextResponse('Bad request', { status: 400 })

  const offset = batchNum * LIMIT

  const { data } = await getSupabaseAdmin()
    .from('pros')
    .select('id, slug, updated_at')
    .eq('profile_status', 'Active')
    .order('updated_at', { ascending: false })
    .range(offset, offset + LIMIT - 1)

  if (!data) return new NextResponse('Error', { status: 500 })

  const urls = data.map(pro => {
    const loc = `${BASE}/pro/${pro.slug || pro.id}`
    const mod = pro.updated_at ? `<lastmod>${new Date(pro.updated_at).toISOString().split('T')[0]}</lastmod>` : ''
    return `  <url><loc>${loc}</loc>${mod}<priority>0.6</priority><changefreq>monthly</changefreq></url>`
  })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
