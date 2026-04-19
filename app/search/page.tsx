'use client'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ProCard from '@/components/ui/ProCard'
import { Pro, TradeCategory } from '@/types'

const PAGE_SIZE = 12

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
      <div className="flex gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-gray-100 flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3.5 w-3/5 rounded bg-gray-100" />
          <div className="h-3 w-2/5 rounded bg-gray-100" />
        </div>
      </div>
      <div className="h-3 w-4/5 rounded bg-gray-100 mb-2" />
      <div className="h-3 w-3/5 rounded bg-gray-100 mb-4" />
      <div className="h-8 w-full rounded-lg bg-gray-100" />
    </div>
  )
}

function SearchPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [pros, setPros]             = useState<Pro[]>([])
  const [categories, setCategories] = useState<TradeCategory[]>([])
  const [total, setTotal]           = useState(0)
  const [hasMore, setHasMore]       = useState(false)
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]           = useState('')
  const [search, setSearch]         = useState(searchParams.get('q') || '')
  const [appliedSearch, setAppliedSearch] = useState(searchParams.get('q') || '')
  const [activeTrade, setActiveTrade] = useState(searchParams.get('trade') || '')
  const [sort, setSort]             = useState('rating')
  const [availableOnly, setAvailableOnly] = useState(false)
  const offset = useRef(0)

  // Load categories once
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.categories || []))
  }, [])

  function buildUrl(off: number) {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(off), sort })
    if (activeTrade)   params.set('trade', activeTrade)
    if (appliedSearch) params.set('search', appliedSearch)
    if (availableOnly) params.set('available', 'true')
    return `/api/pros?${params}`
  }

  const loadPros = useCallback(async () => {
    setLoading(true); setError(''); offset.current = 0
    try {
      const r = await fetch(buildUrl(0))
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setPros(d.pros || [])
      setTotal(d.total || 0)
      setHasMore(d.hasMore || false)
      offset.current = PAGE_SIZE
    } catch { setError('Could not load pros. Please refresh.') }
    setLoading(false)
  }, [activeTrade, appliedSearch, sort, availableOnly])

  useEffect(() => { loadPros() }, [loadPros])

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const r = await fetch(buildUrl(offset.current))
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setPros(prev => [...prev, ...(d.pros || [])])
      setHasMore(d.hasMore || false)
      offset.current += PAGE_SIZE
    } catch {}
    setLoadingMore(false)
  }

  function applySearch() {
    setAppliedSearch(search)
    router.replace(`/search?q=${encodeURIComponent(search)}&trade=${activeTrade}`, { scroll: false })
  }

  function selectTrade(id: string) {
    setActiveTrade(prev => prev === id ? '' : id)
    setSearch(''); setAppliedSearch('')
  }

  function clearFilters() {
    setActiveTrade(''); setSearch(''); setAppliedSearch(''); setAvailableOnly(false)
    router.replace('/search', { scroll: false })
  }

  const activeCategory = categories.find(c => c.id === activeTrade)
  const hasFilters = activeTrade || appliedSearch || availableOnly

  const TRADE_GROUPS = [
    { label: 'Mechanical', slugs: ['electrician','plumber','hvac-technician','alarm-security','irrigation','solar-installer','solar-energy'] },
    { label: 'Structural',  slugs: ['general-contractor','carpenter','roofer','roofing','mason','welder','structural-contractor','marine-contractor'] },
    { label: 'Finishing',   slugs: ['painter','flooring','drywall','windows-doors','gutters','glass-glazing','tile-setter'] },
    { label: 'Property',    slugs: ['landscaper','pool-spa','pest-control','handyman','other-trades'] },
    { label: 'Specialty',   slugs: ['alarm-security','industrial-facility'] },
  ]

  const catBySlug: Record<string, typeof categories[0]> = {}
  for (const cat of categories) catBySlug[cat.slug] = cat
  const groupedSlugs = new Set(TRADE_GROUPS.flatMap(g => g.slugs))
  const ungrouped = categories.filter(c => !groupedSlugs.has(c.slug))

  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-6 h-6">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 2L4 7V16C4 22.6 9.4 28.4 16 30C22.6 28.4 28 22.6 28 16V7L16 2Z" fill="url(#sg)"/>
                <text x="9" y="21" fontSize="13" fontWeight="700" fill="white" fontFamily="DM Sans, sans-serif">PG</text>
                <defs><linearGradient id="sg" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#2DD4BF"/><stop offset="1" stopColor="#0D7377"/></linearGradient></defs>
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-sm">ProGuild<span className="text-teal-600">.ai</span></span>
          </Link>

          {/* Inline search bar */}
          <div className="flex-1 max-w-xl">
            <div className="flex gap-0 rounded-lg overflow-hidden border border-gray-200">
              <input
                type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applySearch()}
                placeholder="Trade, name, or city..."
                className="flex-1 px-4 py-2 text-sm bg-white outline-none text-gray-900 placeholder-gray-400"
              />
              {search && (
                <button onClick={() => { setSearch(''); setAppliedSearch('') }}
                  className="px-2 text-gray-300 hover:text-gray-500">×</button>
              )}
              <button onClick={applySearch}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors">
                Search
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button onClick={() => setAvailableOnly(v => !v)}
              className={`hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                availableOnly ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-500 hover:border-green-400'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${availableOnly ? 'bg-white animate-pulse' : 'bg-gray-300'}`} />
              Available now
            </button>
            <Link href="/login?tab=signup"
              className="text-xs font-semibold px-4 py-2 rounded-lg text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #14B8A6, #0D7377)' }}>
              Join the Guild
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">

        {/* ── SIDEBAR FILTERS ───────────────────────────────────────────── */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-20 space-y-6">

            {/* Sort */}
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Sort by</div>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none">
                <option value="rating">Highest rated</option>
                <option value="default">Top credentialed</option>
                <option value="reviews">Most reviews</option>
                <option value="name_asc">Name A–Z</option>
              </select>
            </div>

            {/* Trade filter */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Trade</div>
                {activeTrade && (
                  <button onClick={() => selectTrade('')} className="text-xs text-teal-600 hover:underline">Clear</button>
                )}
              </div>
              <div className="space-y-4">
                {TRADE_GROUPS.map(group => {
                  const groupCats = group.slugs.map(s => catBySlug[s]).filter(Boolean)
                  if (groupCats.length === 0) return null
                  return (
                    <div key={group.label}>
                      <div className="text-xs font-semibold text-gray-500 mb-1.5">{group.label}</div>
                      <div className="space-y-1">
                        {groupCats.map(cat => (
                          <button key={cat.id} onClick={() => selectTrade(cat.id)}
                            className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-all ${
                              activeTrade === cat.id ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}>
                            {cat.category_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {ungrouped.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1.5">Other</div>
                    {ungrouped.map(cat => (
                      <button key={cat.id} onClick={() => selectTrade(cat.id)}
                        className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-all ${
                          activeTrade === cat.id ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                        }`}>
                        {cat.category_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* ── RESULTS ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Results header */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-500">
                {loading ? 'Searching...' : (
                  <>
                    <span className="font-semibold text-gray-900">{total.toLocaleString()}</span>
                    {' '}{activeCategory ? <span className="text-teal-700">{activeCategory.category_name} pros</span> : 'verified pros'}
                    {appliedSearch && <span className="text-gray-400"> for "<span className="text-gray-700">{appliedSearch}</span>"</span>}
                  </>
                )}
              </span>
              {hasFilters && !loading && (
                <button onClick={clearFilters}
                  className="text-xs text-gray-400 hover:text-red-400 border border-gray-200 px-2.5 py-1 rounded-full transition-colors">
                  Clear filters ×
                </button>
              )}
            </div>
            {/* Mobile sort */}
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="lg:hidden text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none">
              <option value="rating">Highest rated</option>
              <option value="default">Top credentialed</option>
              <option value="reviews">Most reviews</option>
              <option value="name_asc">Name A–Z</option>
            </select>
          </div>

          {/* Pro card grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {loading
              ? Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)
              : error
                ? <div className="col-span-3 text-center py-16 text-gray-400">{error}</div>
                : pros.length === 0
                  ? (
                    <div className="col-span-3 text-center py-20">
                      <div className="text-5xl mb-4 opacity-20">🔍</div>
                      <div className="font-semibold text-gray-700 mb-2">No pros found</div>
                      <div className="text-sm text-gray-400 mb-5">Try a different trade or city.</div>
                      {hasFilters && (
                        <button onClick={clearFilters} className="text-sm text-teal-600 font-medium hover:underline">
                          Clear filters
                        </button>
                      )}
                    </div>
                  )
                  : pros.map((pro, i) => <ProCard key={pro.id} pro={pro} index={i} />)
            }
          </div>

          {/* Load more */}
          {!loading && hasMore && (
            <div className="text-center pb-16">
              <button onClick={loadMore} disabled={loadingMore}
                className="px-8 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-all disabled:opacity-50">
                {loadingMore
                  ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-gray-300 border-t-teal-600 rounded-full animate-spin" />Loading...</span>
                  : `Load more (${(total - pros.length).toLocaleString()} remaining)`}
              </button>
            </div>
          )}
          {!loading && !hasMore && pros.length > 0 && (
            <div className="text-center pb-16 text-xs text-gray-300">
              — All {total.toLocaleString()} pros shown —
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SearchPageInner />
    </Suspense>
  )
}
