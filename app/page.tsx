'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ── Static trade groups — no DB needed ───────────────────────────────────────
const TRADE_GROUPS = [
  {
    id: 'mechanical',
    label: 'Mechanical',
    tagline: 'HVAC · Plumbing · Electrical',
    icon: '⚡',
    slug: 'electrician',
    color: 'from-teal-900 to-teal-700',
    accent: '#14B8A6',
    trades: ['HVAC Technician', 'Electrician', 'Plumber', 'Solar Installer', 'Gas Fitter', 'Fire Sprinkler'],
  },
  {
    id: 'structural',
    label: 'Structural',
    tagline: 'GC · Roofing · Masonry',
    icon: '🏗',
    slug: 'general-contractor',
    color: 'from-slate-900 to-slate-700',
    accent: '#64748B',
    trades: ['General Contractor', 'Roofer', 'Framing Carpenter', 'Mason', 'Concrete', 'Foundation'],
  },
  {
    id: 'finishing',
    label: 'Finishing',
    tagline: 'Paint · Drywall · Flooring',
    icon: '🎨',
    slug: 'painter',
    color: 'from-stone-900 to-stone-700',
    accent: '#A8A29E',
    trades: ['Painter', 'Drywall', 'Flooring', 'Tile Setter', 'Insulation', 'Windows & Doors'],
  },
  {
    id: 'property',
    label: 'Property',
    tagline: 'Landscaping · Pool · Pest',
    icon: '🌿',
    slug: 'landscaper',
    color: 'from-emerald-900 to-emerald-800',
    accent: '#10B981',
    trades: ['Landscaper', 'Pool & Spa', 'Pest Control', 'Irrigation', 'Fence', 'Home Inspector'],
  },
  {
    id: 'specialty',
    label: 'Specialty',
    tagline: 'Security · AV · Welding',
    icon: '🔐',
    slug: 'alarm-security',
    color: 'from-violet-900 to-violet-800',
    accent: '#8B5CF6',
    trades: ['Alarm/Security', 'Low-Voltage/AV', 'Welder', 'Elevator Tech', 'Septic/Drain', 'Marine/Dock'],
  },
]

const TRUST_ITEMS = [
  { icon: '🛡', label: 'DBPR License Verified', sub: 'Florida state database' },
  { icon: '✕', label: 'Zero Lead Fees. Ever.', sub: 'Flat monthly subscription' },
  { icon: '✓', label: 'ID + Background Checked', sub: 'Didit-powered verification' },
]

const HOW_STEPS = [
  { n: '01', title: 'Search', desc: 'Enter your trade and city. We geo-scope results to verified pros near you.' },
  { n: '02', title: 'Match', desc: 'ProGuild Score ranks pros by license standing, safety certs, and real project history.' },
  { n: '03', title: 'Hire Direct', desc: 'Contact the pro directly. No middleman. No lead fees. No surprises.' },
]

// ── Scope helpers (client-readable from NEXT_PUBLIC_*) ────────────────────────
function getScopeLabel(): string {
  const scope = (process.env.NEXT_PUBLIC_LAUNCH_SCOPE || 'FL').toUpperCase()
  if (scope === 'NATIONAL') return 'Nationwide'
  const names: Record<string, string> = { FL: 'Florida', TX: 'Texas', CA: 'California', NY: 'New York', GA: 'Georgia' }
  const states = scope.split(',').map(s => names[s.trim()] || s.trim())
  if (states.length === 1) return states[0]
  if (states.length === 2) return `${states[0]} & ${states[1]}`
  return `${states.slice(0, -1).join(', ')} & ${states[states.length - 1]}`
}

function getTrustLine(): string {
  const scope = (process.env.NEXT_PUBLIC_LAUNCH_SCOPE || 'FL').toUpperCase()
  if (scope === 'NATIONAL') return '134,000+ verified pros nationwide · Zero lead fees · License checked'
  const label = getScopeLabel()
  return `134,000+ DBPR-verified ${label} pros · Zero lead fees · License checked`
}

function getSearchPlaceholder(): string {
  const scope = (process.env.NEXT_PUBLIC_LAUNCH_SCOPE || 'FL').toUpperCase()
  if (scope === 'NATIONAL' || scope.includes(',')) return 'Trade or skill · City or ZIP...'
  const names: Record<string, string> = { FL: 'Florida', TX: 'Texas', CA: 'California' }
  const name = names[scope] || scope
  return `Trade or skill · City or ZIP in ${name}...`
}

function getLaunchBadge(): string {
  const scope = (process.env.NEXT_PUBLIC_LAUNCH_SCOPE || 'FL').toUpperCase()
  if (scope === 'NATIONAL') return '🌎 Available Nationwide'
  const label = getScopeLabel()
  return `📍 Now live in ${label}`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [activeCard, setActiveCard] = useState<string | null>(null)
  const [heroVisible, setHeroVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Stagger hero animation
    const t = setTimeout(() => setHeroVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault()
    if (!search.trim()) { inputRef.current?.focus(); return }
    router.push(`/search?q=${encodeURIComponent(search.trim())}`)
  }

  function handleCategoryClick(slug: string) {
    router.push(`/search?trade=${slug}`)
  }

  const scopeLabel = getScopeLabel()
  const trustLine  = getTrustLine()
  const placeholder = getSearchPlaceholder()
  const badge = getLaunchBadge()

  return (
    <div className="min-h-screen bg-[#0A1628] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10"
        style={{ background: 'rgba(10,22,40,0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Logo mark — geometric PG shield */}
            <div className="w-8 h-8 flex-shrink-0">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 2L4 7V16C4 22.6 9.4 28.4 16 30C22.6 28.4 28 22.6 28 16V7L16 2Z"
                  fill="url(#shield-grad)" stroke="url(#shield-grad)" strokeWidth="0.5"/>
                <text x="9" y="21" fontSize="13" fontWeight="700" fill="white"
                  fontFamily="DM Sans, sans-serif">PG</text>
                <defs>
                  <linearGradient id="shield-grad" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2DD4BF"/>
                    <stop offset="1" stopColor="#0D7377"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-bold text-white tracking-tight">ProGuild</span>
              <span className="text-lg font-light text-teal-400">.ai</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {[
              ['/search', 'Find a Pro'],
              ['/community', 'Community'],
              ['/jobs', 'Jobs'],
            ].map(([href, label]) => (
              <Link key={href} href={href}
                className="text-sm text-white/60 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-all">
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login"
              className="text-sm text-white/70 hover:text-white transition-colors hidden sm:block">
              Pro Log In
            </Link>
            <Link href="/login?tab=signup"
              className="text-sm font-semibold px-4 py-2 rounded-lg transition-all"
              style={{ background: 'linear-gradient(135deg, #14B8A6, #0D7377)', color: 'white' }}>
              Join the Guild
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16 overflow-hidden">

        {/* Background texture — dark workshop atmosphere */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(20,184,166,0.08) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(13,115,119,0.06) 0%, transparent 60%)',
        }} />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Content */}
        <div className={`relative z-10 text-center max-w-4xl mx-auto transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

          {/* Launch badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border"
            style={{ background: 'rgba(20,184,166,0.1)', borderColor: 'rgba(20,184,166,0.3)', color: '#5EEAD4' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            {badge}
          </div>

          {/* Headline */}
          <h1 className="font-bold leading-none tracking-tight mb-6"
            style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', fontFamily: "'DM Serif Display', serif" }}>
            <span className="block text-white">CRAFT.</span>
            <span className="block" style={{ color: '#2DD4BF' }}>GUILD.</span>
            <span className="block text-white">VERIFIED.</span>
          </h1>

          {/* Subtext — driven by scope */}
          <p className="text-lg text-white/50 mb-10 font-light">
            Your Craft. Your Guild. &nbsp;·&nbsp; {scopeLabel}'s verified trades network.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-4">
            <div className="flex gap-0 rounded-2xl overflow-hidden border"
              style={{ borderColor: 'rgba(20,184,166,0.4)', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' }}>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={placeholder}
                className="flex-1 px-5 py-4 bg-transparent text-white placeholder-white/30 text-sm outline-none"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')}
                  className="px-3 text-white/30 hover:text-white/60 transition-colors">
                  ×
                </button>
              )}
              <button type="submit"
                className="px-6 py-4 text-sm font-bold text-white transition-all flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #14B8A6, #0D7377)' }}>
                Search
              </button>
            </div>
          </form>

          {/* Trust line */}
          <p className="text-xs text-white/30 tracking-wide">
            {trustLine}
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <span className="text-xs text-white tracking-widest uppercase">Browse trades</span>
          <div className="w-px h-8 bg-white/30" style={{ animation: 'pulse 2s infinite' }} />
        </div>
      </section>

      {/* ── CATEGORY CARDS ───────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: '#0D1F36' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold tracking-widest uppercase text-teal-400/60 mb-3">Browse by trade</div>
            <h2 className="text-2xl font-bold text-white">Find the right professional</h2>
          </div>

          {/* Top row — 3 large cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {TRADE_GROUPS.slice(0, 3).map(group => (
              <button key={group.id}
                onClick={() => handleCategoryClick(group.slug)}
                onMouseEnter={() => setActiveCard(group.id)}
                onMouseLeave={() => setActiveCard(null)}
                className={`group relative rounded-2xl p-6 text-left overflow-hidden border transition-all duration-300 ${
                  activeCard === group.id ? 'scale-[1.02] border-teal-500/50' : 'border-white/10 hover:border-white/20'
                }`}
                style={{ background: `linear-gradient(135deg, rgba(10,22,40,0.9), rgba(10,22,40,0.7)), linear-gradient(135deg, ${group.accent}22, transparent)` }}>

                {/* Accent glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(circle at 30% 50%, ${group.accent}15, transparent 70%)` }} />

                <div className="relative z-10">
                  <div className="text-3xl mb-4">{group.icon}</div>
                  <div className="text-xl font-bold text-white mb-1">{group.label}</div>
                  <div className="text-sm font-medium mb-4" style={{ color: group.accent }}>{group.tagline}</div>
                  <div className="space-y-1">
                    {group.trades.slice(0, 4).map(t => (
                      <div key={t} className="text-xs text-white/40 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        {t}
                      </div>
                    ))}
                    {group.trades.length > 4 && (
                      <div className="text-xs text-white/30">+{group.trades.length - 4} more</div>
                    )}
                  </div>
                  <div className="mt-5 flex items-center gap-1 text-xs font-semibold" style={{ color: group.accent }}>
                    Browse pros
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Bottom row — 2 smaller cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TRADE_GROUPS.slice(3).map(group => (
              <button key={group.id}
                onClick={() => handleCategoryClick(group.slug)}
                onMouseEnter={() => setActiveCard(group.id)}
                onMouseLeave={() => setActiveCard(null)}
                className={`group relative rounded-2xl p-5 text-left overflow-hidden border transition-all duration-300 flex items-center gap-5 ${
                  activeCard === group.id ? 'scale-[1.01] border-teal-500/50' : 'border-white/10 hover:border-white/20'
                }`}
                style={{ background: `linear-gradient(135deg, rgba(10,22,40,0.9), rgba(10,22,40,0.7))` }}>

                <div className="text-4xl flex-shrink-0">{group.icon}</div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-white mb-0.5">{group.label}</div>
                  <div className="text-sm" style={{ color: group.accent }}>{group.tagline}</div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {group.trades.slice(0, 3).map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-white/40">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="text-white/20 group-hover:text-teal-400 transition-colors text-xl flex-shrink-0">→</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ──────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-y border-white/5" style={{ background: '#0A1628' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {TRUST_ITEMS.map(item => (
            <div key={item.label} className="flex items-start gap-4">
              <div className="text-2xl flex-shrink-0 mt-0.5">{item.icon}</div>
              <div>
                <div className="font-bold text-white text-sm mb-0.5">{item.label}</div>
                <div className="text-xs text-white/40">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: '#0D1F36' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs font-semibold tracking-widest uppercase text-teal-400/60 mb-3">How it works</div>
            <h2 className="text-2xl font-bold text-white">Simple. Direct. Transparent.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_STEPS.map((step, i) => (
              <div key={step.n} className="relative">
                {i < HOW_STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-full w-full h-px -translate-y-px"
                    style={{ background: 'linear-gradient(90deg, rgba(20,184,166,0.3), transparent)' }} />
                )}
                <div className="text-4xl font-bold mb-4" style={{ color: 'rgba(20,184,166,0.2)' }}>{step.n}</div>
                <div className="text-lg font-bold text-white mb-2">{step.title}</div>
                <div className="text-sm text-white/40 leading-relaxed">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ANTI-THUMBTACK CTA ───────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: '#0A1628' }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border"
            style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
            Thumbtack charges pros $18–$200 per lead
          </div>
          <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Your craft shouldn't cost you a lead fee.
          </h2>
          <p className="text-white/50 mb-8 leading-relaxed">
            ProGuild pros pay one flat monthly fee. Zero per-lead charges. Zero commission. You keep every dollar you earn.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login?tab=signup"
              className="px-8 py-3.5 rounded-xl font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #14B8A6, #0D7377)' }}>
              Join the Guild — Free
            </Link>
            <Link href="/search"
              className="px-8 py-3.5 rounded-xl font-semibold text-white/70 border border-white/20 hover:border-white/40 transition-all">
              Find a Pro
            </Link>
          </div>
        </div>
      </section>

      {/* ── GEOGRAPHIC SIGNAL ────────────────────────────────────────────── */}
      <section className="py-8 px-6 border-t border-white/5" style={{ background: '#0A1628' }}>
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-3 text-xs text-white/30">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            Currently live in {scopeLabel}
          </span>
          <span>·</span>
          <span>Directly integrated with Florida DBPR</span>
          <span>·</span>
          <span>OSHA certified</span>
          <span>·</span>
          <span>29 licensed trades</span>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-12 px-6" style={{ background: '#060F1E' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-10 mb-10">
            {/* Brand */}
            <div className="max-w-xs">
              <div className="flex items-baseline gap-0.5 mb-3">
                <span className="text-xl font-bold text-white tracking-tight">ProGuild</span>
                <span className="text-xl font-light text-teal-400">.ai</span>
              </div>
              <p className="text-sm text-white/30 leading-relaxed">
                The verified professional home for America's skilled trades workforce. DBPR-integrated, zero lead fees.
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-16 text-sm">
              <div>
                <div className="font-semibold text-white/50 mb-4 text-xs uppercase tracking-widest">Platform</div>
                <div className="space-y-3">
                  {[['/search', 'Find a Pro'],['/post-job', 'Post a Job'],['/jobs', 'Browse Jobs'],['/community', 'Community']].map(([href, label]) => (
                    <Link key={href} href={href} className="block text-white/30 hover:text-teal-400 transition-colors">{label}</Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-semibold text-white/50 mb-4 text-xs uppercase tracking-widest">Company</div>
                <div className="space-y-3">
                  {[['/about', 'About'],['/contact', 'Contact'],['/privacy', 'Privacy'],['/terms', 'Terms']].map(([href, label]) => (
                    <Link key={href} href={href} className="block text-white/30 hover:text-teal-400 transition-colors">{label}</Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-white/20">© 2026 ProGuild.ai · Univaro Technologies Pvt Ltd</div>
            <div className="text-xs text-white/20">Your Craft. Your Guild.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
