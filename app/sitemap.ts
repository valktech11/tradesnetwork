import { MetadataRoute } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase'
import { DBPR_TRADES, FL_SEO_CITIES, cityToSlug } from '@/config/dbpr-trades'

const BASE  = 'https://proguild.ai'
const LIMIT = 45000 // stay safely under Google's 50,000 limit

// ── Sitemap index — Next.js calls generateSitemaps() then sitemap(id) ─────────
// Sitemap 0: static + trade + city pages
// Sitemap 1+: pro profile pages in batches of LIMIT

export async function generateSitemaps() {
  try {
    const { count } = await getSupabaseAdmin()
      .from('pros')
      .select('id', { count: 'exact', head: true })
      .eq('profile_status', 'Active')

    const proCount   = count || 0
    const proBatches = Math.ceil(proCount / LIMIT)

    // id 0 = static/trade/city, ids 1..N = pro batches
    return Array.from({ length: proBatches + 1 }, (_, i) => ({ id: i }))
  } catch {
    return [{ id: 0 }]
  }
}

export default async function sitemap(
  { id }: { id: number }
): Promise<MetadataRoute.Sitemap> {

  // ── Sitemap 0 — static + trade + city pages ────────────────────────────────
  if (id === 0) {
    const entries: MetadataRoute.Sitemap = []

    // Static
    entries.push(
      { url: BASE,                priority: 1.0, changeFrequency: 'weekly'  as const },
      { url: `${BASE}/search`,    priority: 0.9, changeFrequency: 'daily'   as const },
      { url: `${BASE}/post-job`,  priority: 0.8, changeFrequency: 'monthly' as const },
      { url: `${BASE}/community`, priority: 0.8, changeFrequency: 'daily'   as const },
      { url: `${BASE}/jobs`,      priority: 0.7, changeFrequency: 'daily'   as const },
      { url: `${BASE}/about`,     priority: 0.5, changeFrequency: 'monthly' as const },
      { url: `${BASE}/contact`,   priority: 0.4, changeFrequency: 'monthly' as const },
      { url: `${BASE}/privacy`,   priority: 0.3, changeFrequency: 'yearly'  as const },
      { url: `${BASE}/terms`,     priority: 0.3, changeFrequency: 'yearly'  as const },
      { url: `${BASE}/fl`,        priority: 0.9, changeFrequency: 'weekly'  as const },
    )

    // Trade landing pages
    for (const trade of DBPR_TRADES) {
      entries.push({
        url: `${BASE}/fl/${trade.slug}`,
        priority: 0.9,
        changeFrequency: 'weekly' as const,
      })
    }

    // City trade pages
    for (const trade of DBPR_TRADES) {
      for (const city of FL_SEO_CITIES) {
        entries.push({
          url: `${BASE}/fl/${trade.slug}/${cityToSlug(city)}`,
          priority: 0.8,
          changeFrequency: 'weekly' as const,
        })
      }
    }

    return entries
  }

  // ── Sitemaps 1+ — pro profile pages in batches ─────────────────────────────
  try {
    const offset = (id - 1) * LIMIT
    const { data } = await getSupabaseAdmin()
      .from('pros')
      .select('id, slug, updated_at')
      .eq('profile_status', 'Active')
      .order('updated_at', { ascending: false })
      .range(offset, offset + LIMIT - 1)

    if (!data) return []

    return data.map(pro => ({
      // Use vanity slug if available, fall back to UUID
      url: `${BASE}/pro/${pro.slug || pro.id}`,
      lastModified: pro.updated_at ? new Date(pro.updated_at) : new Date(),
      priority: 0.6,
      changeFrequency: 'monthly' as const,
    }))
  } catch {
    return []
  }
}
