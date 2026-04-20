import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase'

const STATE_MAP: Record<string, { name: string; abbr: string }> = {
  fl: { name: 'Florida', abbr: 'FL' }, tx: { name: 'Texas', abbr: 'TX' },
  ca: { name: 'California', abbr: 'CA' }, ny: { name: 'New York', abbr: 'NY' },
  ga: { name: 'Georgia', abbr: 'GA' }, nc: { name: 'North Carolina', abbr: 'NC' },
  az: { name: 'Arizona', abbr: 'AZ' }, co: { name: 'Colorado', abbr: 'CO' },
  wa: { name: 'Washington', abbr: 'WA' }, il: { name: 'Illinois', abbr: 'IL' },
  oh: { name: 'Ohio', abbr: 'OH' }, pa: { name: 'Pennsylvania', abbr: 'PA' },
  nj: { name: 'New Jersey', abbr: 'NJ' }, va: { name: 'Virginia', abbr: 'VA' },
  tn: { name: 'Tennessee', abbr: 'TN' }, mi: { name: 'Michigan', abbr: 'MI' },
  sc: { name: 'South Carolina', abbr: 'SC' }, nv: { name: 'Nevada', abbr: 'NV' },
}

const TRADE_GROUPS: Record<string, {
  label: string; icon: string; accent: string; description: string
  trades: { label: string; slug: string }[]
}> = {
  mechanical: {
    label: 'Mechanical', icon: '⚡', accent: '#14B8A6',
    description: 'HVAC technicians, electricians, plumbers, and other mechanical trade professionals.',
    trades: [
      { label: 'HVAC Technician',   slug: 'hvac-technician' },
      { label: 'Electrician',       slug: 'electrician' },
      { label: 'Plumber',           slug: 'plumber' },
      { label: 'Solar Installer',   slug: 'solar-installer' },
      { label: 'Gas Fitter',        slug: 'gas-fitter' },
      { label: 'Fire Sprinkler',    slug: 'fire-sprinkler' },
    ],
  },
  structural: {
    label: 'Structural', icon: '🏗', accent: '#6366F1',
    description: 'General contractors, roofers, carpenters, and structural trade professionals.',
    trades: [
      { label: 'Roofer',                  slug: 'roofer' },
      { label: 'General Contractor',      slug: 'general-contractor' },
      { label: 'Impact Window & Shutter', slug: 'impact-window-shutter' },
      { label: 'Framing Carpenter',       slug: 'carpenter' },
      { label: 'Mason',                   slug: 'mason' },
      { label: 'Concrete',               slug: 'concrete-contractor' },
      { label: 'Foundation',             slug: 'foundation-specialist' },
    ],
  },
  finishing: {
    label: 'Finishing', icon: '🎨', accent: '#F59E0B',
    description: 'Painters, flooring installers, drywall, tile, and finishing trade professionals.',
    trades: [
      { label: 'Painter',           slug: 'painter' },
      { label: 'Flooring',          slug: 'flooring' },
      { label: 'Drywall',           slug: 'drywall' },
      { label: 'Tile Setter',       slug: 'tile-setter' },
      { label: 'Insulation',        slug: 'insulation-contractor' },
      { label: 'Windows & Doors',   slug: 'windows-doors' },
    ],
  },
  property: {
    label: 'Property', icon: '🌿', accent: '#10B981',
    description: 'Pool & spa, landscapers, pest control, and property maintenance professionals.',
    trades: [
      { label: 'Pool & Spa',        slug: 'pool-spa' },
      { label: 'Landscaper',        slug: 'landscaper' },
      { label: 'Pest Control',      slug: 'pest-control' },
      { label: 'Irrigation',        slug: 'irrigation' },
      { label: 'Handyman',          slug: 'handyman' },
      { label: 'Home Inspector',    slug: 'home-inspector' },
    ],
  },
  specialty: {
    label: 'Specialty', icon: '🔐', accent: '#8B5CF6',
    description: 'Marine/dock builders, alarm installers, welders, and specialty trade professionals.',
    trades: [
      { label: 'Marine / Dock',     slug: 'marine-contractor' },
      { label: 'Alarm & Security',  slug: 'alarm-security' },
      { label: 'Low-Voltage / AV',  slug: 'low-voltage' },
      { label: 'Septic & Drain',    slug: 'septic-drain' },
      { label: 'Welder',            slug: 'welder' },
      { label: 'Elevator Tech',     slug: 'elevator-technician' },
    ],
  },
}

export async function generateMetadata(
  { params }: { params: Promise<{ state: string; group: string }> }
): Promise<Metadata> {
  const { state, group } = await params
  const info  = STATE_MAP[state.toLowerCase()]
  const grp   = TRADE_GROUPS[group.toLowerCase()]
  const name  = info?.name || state.toUpperCase()
  const label = grp?.label || group
  return {
    title: `${label} Contractors in ${name} — ProGuild.ai`,
    description: `Find verified ${label.toLowerCase()} contractors in ${name}. ${grp?.description || ''} DBPR-licensed. Zero lead fees.`,
    alternates: { canonical: `https://proguild.ai/${state.toLowerCase()}/${group.toLowerCase()}` },
  }
}

async function getGroupProCount(slugs: string[], stateAbbr: string): Promise<number> {
  const sb = getSupabaseAdmin()
  // Get category IDs for all slugs in group
  const { data: cats } = await sb.from('trade_categories').select('id').in('slug', slugs)
  if (!cats?.length) return 0
  const ids = cats.map(c => c.id)
  const { count } = await sb.from('pros').select('id', { count: 'exact', head: true })
    .in('trade_category_id', ids).ilike('state', stateAbbr).eq('profile_status', 'Active')
  return count || 0
}

async function getTradeCounts(slugs: string[], stateAbbr: string): Promise<Record<string, number>> {
  const sb = getSupabaseAdmin()
  const { data: cats } = await sb.from('trade_categories').select('id, slug').in('slug', slugs)
  if (!cats?.length) return {}
  const counts: Record<string, number> = {}
  await Promise.all(cats.map(async cat => {
    const { count } = await sb.from('pros').select('id', { count: 'exact', head: true })
      .eq('trade_category_id', cat.id).ilike('state', stateAbbr).eq('profile_status', 'Active')
    counts[cat.slug] = count || 0
  }))
  return counts
}

export default async function GroupLandingPage(
  { params }: { params: Promise<{ state: string; group: string }> }
) {
  const { state, group } = await params
  const stateSlug = state.toLowerCase()
  const groupSlug = group.toLowerCase()
  const info = STATE_MAP[stateSlug]
  const grp  = TRADE_GROUPS[groupSlug]

  if (!info || !grp) notFound()

  const tradeSlugs = grp.trades.map(t => t.slug)
  const [totalCount, tradeCounts] = await Promise.all([
    getGroupProCount(tradeSlugs, info.abbr),
    getTradeCounts(tradeSlugs, info.abbr),
  ])

  return (
    <div className="min-h-screen" style={{ background: '#F5F0E8', fontFamily: "'DM Sans', sans-serif" }}>

      {/* NAV */}
      <nav className="sticky top-0 z-40 bg-white border-b" style={{ borderColor: '#E8E2D9' }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7">
              <svg viewBox="0 0 32 32" fill="none"><path d="M16 2L4 7V16C4 22.6 9.4 28.4 16 30C22.6 28.4 28 22.6 28 16V7L16 2Z" fill="url(#glg)"/><text x="8.5" y="21" fontSize="12" fontWeight="700" fill="white" fontFamily="DM Sans,sans-serif">PG</text><defs><linearGradient id="glg" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#2DD4BF"/><stop offset="1" stopColor="#0D7377"/></linearGradient></defs></svg>
            </div>
            <span className="font-bold text-sm" style={{ color: '#0A1628' }}>ProGuild<span style={{ color: '#14B8A6', fontWeight: 300 }}>.ai</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm hidden sm:block" style={{ color: '#6B7280' }}>Log in</Link>
            <Link href="/login?tab=signup" className="text-xs font-bold px-4 py-2 rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #14B8A6, #0D7377)' }}>Join Free</Link>
          </div>
        </div>
      </nav>

      {/* VISUAL ANCHOR + BREADCRUMB */}
      <div className="bg-white border-b" style={{ borderColor: '#E8E2D9' }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border flex-shrink-0"
            style={{ borderColor: grp.accent, borderTopWidth: '2px', background: grp.accent + '08' }}>
            <span className="text-lg">{grp.icon}</span>
            <span className="text-xs font-bold" style={{ color: grp.accent }}>{grp.label}</span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#A89F93' }}>
            <Link href="/" style={{ color: '#A89F93' }}>Home</Link>
            <span>›</span>
            <Link href={`/${stateSlug}`} style={{ color: '#A89F93' }}>{info.name}</Link>
            <span>›</span>
            <span className="font-semibold" style={{ color: grp.accent }}>{grp.label}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* HERO */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3" style={{ color: '#0A1628', fontFamily: "'DM Serif Display', serif" }}>
            {grp.label} Contractors in {info.name}
          </h1>
          <p className="text-sm leading-relaxed mb-4 max-w-2xl" style={{ color: '#6B7280' }}>
            {grp.description} Every pro is verified against the {info.name} state licensing database.
            {totalCount > 0 && ` Browse ${totalCount.toLocaleString()}+ verified ${grp.label.toLowerCase()} professionals.`}
          </p>
        </div>

        {/* TRADE CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {grp.trades.map(trade => {
            const count = tradeCounts[trade.slug] || 0
            return (
              <Link key={trade.slug}
                href={`/${stateSlug}/${trade.slug}`}
                className="bg-white rounded-2xl border p-6 hover:shadow-md transition-all hover:-translate-y-0.5 block"
                style={{ borderColor: '#E8E2D9', borderTopWidth: '3px', borderTopColor: grp.accent, textDecoration: 'none' }}>
                <div className="font-bold text-base mb-1" style={{ color: '#0A1628' }}>{trade.label}</div>
                <div className="text-xs mb-4" style={{ color: '#A89F93' }}>
                  {count > 0
                    ? <><span className="font-semibold" style={{ color: grp.accent }}>{count.toLocaleString()}</span> verified pros in {info.name}</>
                    : `Verified pros in ${info.name}`}
                </div>
                <div className="flex items-center gap-1 text-xs font-bold" style={{ color: grp.accent }}>
                  Browse {trade.label}s <span>→</span>
                </div>
              </Link>
            )
          })}
        </div>

        {/* SEO CONTENT */}
        <div className="border-t pt-10" style={{ borderColor: '#E8E2D9' }}>
          <h2 className="text-lg font-bold mb-3" style={{ color: '#0A1628' }}>
            Hiring {grp.label} contractors in {info.name}
          </h2>
          <p className="text-sm leading-relaxed mb-6 max-w-3xl" style={{ color: '#6B7280' }}>
            ProGuild verifies every {grp.label.toLowerCase()} contractor in {info.name} against the state licensing board.
            Unlike other platforms that charge pros $18–$200 per lead, ProGuild uses a flat monthly subscription —
            meaning pros respond faster because they're not paying per contact. Find a verified {grp.label.toLowerCase()} professional
            and hire them directly.
          </p>
          {/* Internal links to sibling trades */}
          <div className="flex flex-wrap gap-2">
            {grp.trades.map(trade => (
              <Link key={trade.slug} href={`/${stateSlug}/${trade.slug}`}
                className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                style={{ color: '#6B7280', borderColor: '#E8E2D9', background: '#fff' }}
                onMouseEnter={e => { e.currentTarget.style.color = grp.accent; e.currentTarget.style.borderColor = grp.accent }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#E8E2D9' }}>
                {trade.label}s in {info.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t py-8 px-6 mt-8" style={{ borderColor: '#E8E2D9', background: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span className="font-bold text-sm" style={{ color: '#0A1628' }}>ProGuild<span style={{ color: '#14B8A6', fontWeight: 300 }}>.ai</span></span>
          <div className="flex flex-wrap gap-4 text-xs" style={{ color: '#A89F93' }}>
            {[['/', 'Home'],[`/${stateSlug}`, info.name],['/search', 'Find a Pro'],['/privacy', 'Privacy']].map(([href, label]) => (
              <Link key={href} href={href} style={{ color: '#A89F93' }}>{label}</Link>
            ))}
          </div>
          <div className="text-xs" style={{ color: '#C4BAB0' }}>© 2026 ProGuild.ai</div>
        </div>
      </footer>
    </div>
  )
}
