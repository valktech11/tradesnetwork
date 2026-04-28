'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Session, Lead, Review } from '@/types'
import { timeAgo } from '@/lib/utils'
import DashboardShell from '@/components/layout/DashboardShell'
import AddLeadModal from '@/components/ui/AddLeadModal'

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  navy:    '#0A1628',
  teal:    '#0F766E',
  tealLt:  '#14B8A6',
  amber:   '#B45309',
  red:     '#DC2626',
  bg:      '#ECEAE5',
  card:    '#FFFFFF',
  border:  '#E8E2D9',
  muted:   '#9CA3AF',
  body:    '#6B7280',
  label:   '#A8A19A',
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function plural(n: number, w: string) { return `${n} ${w}${n !== 1 ? 's' : ''}` }

function fmt$(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`
}

// ── Stage config ──────────────────────────────────────────────────────────────
const STAGES = [
  { key: 'New',       label: 'New',       color: '#F59E0B', bg: '#FEF9EE' },
  { key: 'Contacted', label: 'Contacted', color: '#3B82F6', bg: '#EFF6FF' },
  { key: 'Quoted',    label: 'Quoted',    color: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'Scheduled', label: 'Scheduled', color: '#0F766E', bg: '#F0FDFA' },
  { key: 'Completed', label: 'Completed', color: '#10B981', bg: '#ECFDF5' },
  { key: 'Paid',      label: 'Paid',      color: '#059669', bg: '#D1FAE5' },
]

// ── Stat chip ─────────────────────────────────────────────────────────────────
function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex-1 min-w-0 px-4 py-3.5 rounded-xl"
      style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1.5" style={{ color: T.label }}>
        {label}
      </div>
      <div className="text-[26px] font-bold leading-none" style={{ color: T.navy, fontFamily: "'DM Serif Display', serif" }}>
        {value}
      </div>
      {sub && <div className="text-[11px] mt-1.5" style={{ color: T.muted }}>{sub}</div>}
    </div>
  )
}

// ── Pipeline stage pill ───────────────────────────────────────────────────────
function StagePill({ stage, count }: { stage: typeof STAGES[number]; count: number }) {
  if (count === 0) return null
  return (
    <Link href="/dashboard/pipeline"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all hover:opacity-80 active:scale-95"
      style={{ backgroundColor: stage.bg, color: stage.color, border: `1px solid ${stage.color}20` }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
      <span className="font-bold">{count}</span>
      <span style={{ color: T.body }}>{stage.label}</span>
    </Link>
  )
}

// ── Alert bar ─────────────────────────────────────────────────────────────────
function AlertBar({ leads }: { leads: Lead[] }) {
  const [idx, setIdx] = useState(0)
  if (leads.length === 0) return null
  const lead = leads[idx]
  const days = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000)

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
      style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: T.amber }} />
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-semibold" style={{ color: '#92400E' }}>
          {lead.contact_name}
        </span>
        <span className="text-[13px] ml-1" style={{ color: '#B45309' }}>
          — no response in {plural(days, 'day')}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {leads.length > 1 && (
          <span className="text-[11px] font-medium" style={{ color: '#B45309' }}>
            {idx + 1}/{leads.length}
          </span>
        )}
        <Link href="/dashboard/pipeline"
          className="text-[12px] font-bold px-3 py-1 rounded-lg transition-all hover:opacity-90"
          style={{ backgroundColor: T.amber, color: '#fff' }}
          onClick={leads.length > 1 ? () => setIdx(i => (i + 1) % leads.length) : undefined}>
          View →
        </Link>
      </div>
    </div>
  )
}

// ── Star rating ───────────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24"
          fill={i <= rating ? T.teal : 'none'} stroke={T.teal} strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

// ── Empty state — no illustration, clean editorial ────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {/* Blueprint SVG illustration */}
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mb-4 opacity-30">
        <rect x="8" y="8" width="48" height="48" rx="4" stroke={T.teal} strokeWidth="2"/>
        <line x1="8" y1="20" x2="56" y2="20" stroke={T.teal} strokeWidth="1.5" strokeDasharray="3 2"/>
        <line x1="8" y1="32" x2="56" y2="32" stroke={T.teal} strokeWidth="1.5" strokeDasharray="3 2"/>
        <line x1="8" y1="44" x2="56" y2="44" stroke={T.teal} strokeWidth="1.5" strokeDasharray="3 2"/>
        <line x1="20" y1="8" x2="20" y2="56" stroke={T.teal} strokeWidth="1.5" strokeDasharray="3 2"/>
        <line x1="32" y1="8" x2="32" y2="56" stroke={T.teal} strokeWidth="1.5" strokeDasharray="3 2"/>
        <line x1="44" y1="8" x2="44" y2="56" stroke={T.teal} strokeWidth="1.5" strokeDasharray="3 2"/>
        <circle cx="32" cy="32" r="6" stroke={T.teal} strokeWidth="2"/>
        <circle cx="32" cy="32" r="2" fill={T.teal}/>
      </svg>
      <p className="text-[14px] font-semibold mb-1" style={{ color: T.navy }}>
        Your pipeline starts here
      </p>
      <p className="text-[12px] max-w-[220px] leading-relaxed" style={{ color: T.muted }}>
        Use <strong>Quick Add</strong> in the sidebar to log your first lead.
      </p>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHead({ label, href, count }: { label: string; href: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold tracking-[0.1em] uppercase" style={{ color: T.label }}>
          {label}
        </span>
        {count != null && count > 0 && (
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ backgroundColor: T.bg, color: T.muted }}>
            {count}
          </span>
        )}
      </div>
      <Link href={href} className="text-[12px] font-semibold transition-colors hover:opacity-70"
        style={{ color: T.teal }}>
        View all →
      </Link>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const router = useRouter()

  const [session] = useState<Session | null>(() => {
    if (typeof window === 'undefined') return null
    const s = sessionStorage.getItem('pg_pro')
    return s ? JSON.parse(s) : null
  })
  const [leads,      setLeads]      = useState<Lead[]>([])
  const [reviews,    setReviews]    = useState<Review[]>([])
  const [dataLoading,setDataLoading]= useState(true)
  const [showAdd,    setShowAdd]    = useState(false)

  useEffect(() => {
    if (!session) { router.push('/login'); return }
    Promise.all([
      fetch(`/api/leads?pro_id=${session.id}`).then(r => r.json()),
      fetch(`/api/reviews?pro_id=${session.id}`).then(r => r.json()),
    ]).then(([ld, rd]) => {
      setLeads(ld.leads || [])
      setReviews((rd.reviews || []).filter((r: Review) => r.is_approved))
      setDataLoading(false)
    }).catch(() => setDataLoading(false))
  }, [session, router])

  if (!session || dataLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: T.bg }}>
        {/* Skeleton loader — feels premium */}
        <div className="w-full max-w-4xl px-6 animate-pulse">
          <div className="h-7 w-48 rounded-lg mb-2" style={{ backgroundColor: '#E0DDD8' }} />
          <div className="h-4 w-32 rounded mb-6" style={{ backgroundColor: '#E8E5E0' }} />
          <div className="flex gap-4 mb-6">
            {[1,2,3,4].map(i => <div key={i} className="flex-1 h-20 rounded-xl" style={{ backgroundColor: '#E8E5E0' }} />)}
          </div>
          <div className="h-36 rounded-xl mb-4" style={{ backgroundColor: '#E8E5E0' }} />
          <div className="h-28 rounded-xl" style={{ backgroundColor: '#E8E5E0' }} />
        </div>
      </div>
    )
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const active   = leads.filter(l => !['Paid','Lost','Archived','Converted'].includes(l.lead_status))
  const newLeads = leads.filter(l => l.lead_status === 'New')
  const paid     = leads.filter(l => l.lead_status === 'Paid')
  const revenue  = paid.reduce((s, l) => s + (l.quoted_amount || 0), 0)
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null

  const overdue = newLeads.filter(l => {
    const days = (Date.now() - new Date(l.created_at).getTime()) / 86400000
    return days >= 3
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = session.name?.split(' ')[0] || ''

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <DashboardShell session={session} newLeads={newLeads.length} onAddLead={() => setShowAdd(true)}>
      <div className="max-w-3xl mx-auto px-5 py-6">

        {/* ── Greeting ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-[22px] font-bold leading-tight" style={{ color: T.navy }}>
              {greeting}, {firstName}
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>{today}</p>
          </div>
          {/* Desktop only — Quick Add in sidebar handles this too */}
          <button onClick={() => setShowAdd(true)}
            className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: T.teal, color: '#fff', boxShadow: '0 2px 8px rgba(15,118,110,0.25)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Lead
          </button>
        </div>

        {/* ── Overdue alerts ────────────────────────────────────────────── */}
        <AlertBar leads={overdue} />

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <div className="flex gap-3 mb-4 overflow-x-auto pb-1 hide-scrollbar">
          <Stat label="Leads"   value={leads.length}  sub={`${active.length} active`} />
          <Stat label="New"     value={newLeads.length} sub={newLeads.length === 0 ? 'all caught up' : 'need response'} />
          <Stat label="Revenue" value={revenue > 0 ? fmt$(revenue) : '—'} sub={paid.length > 0 ? plural(paid.length, 'paid job') : 'no paid jobs yet'} />
          <Stat label="Rating"  value={avgRating ? avgRating.toFixed(1) : '—'} sub={reviews.length > 0 ? plural(reviews.length, 'review') : 'no reviews yet'} />
        </div>

        {/* ── Pipeline card ─────────────────────────────────────────────── */}
        <div className="rounded-2xl mb-4 overflow-hidden"
          style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div className="px-5 pt-4 pb-1">
            <SectionHead label="Pipeline" href="/dashboard/pipeline" count={active.length} />
          </div>

          {leads.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="px-5 pb-4">
              <div className="flex flex-wrap gap-2">
                {STAGES.map(s => (
                  <StagePill key={s.key} stage={s}
                    count={leads.filter(l => l.lead_status === s.key).length} />
                ))}
              </div>
              {/* Most recent lead preview */}
              {active.length > 0 && (() => {
                const recent = [...active].sort((a, b) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                return (
                  <Link href="/dashboard/pipeline"
                    className="flex items-center justify-between mt-4 pt-4 group"
                    style={{ borderTop: `1px solid ${T.border}` }}>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold truncate group-hover:opacity-70 transition-opacity" style={{ color: T.navy }}>
                        {recent.contact_name}
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: T.muted }}>
                        {recent.lead_status} · {timeAgo(recent.created_at)}
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke={T.muted} strokeWidth="2" strokeLinecap="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </Link>
                )
              })()}
            </div>
          )}
        </div>

        {/* ── Reviews card ──────────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div className="px-5 pt-4 pb-1">
            <SectionHead label="Recent Reviews" href="/dashboard/reviews" count={reviews.length} />
          </div>

          {reviews.length === 0 ? (
            <div className="px-5 pb-5 text-center py-8">
              <p className="text-[13px]" style={{ color: T.muted }}>
                Reviews from homeowners will appear here after your first job.
              </p>
            </div>
          ) : (
            <div className="px-5 pb-4">
              {reviews.slice(0, 3).map((r, i) => (
                <div key={r.id}
                  className={i > 0 ? 'pt-3 mt-3' : ''}
                  style={i > 0 ? { borderTop: `1px solid ${T.border}` } : undefined}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-semibold" style={{ color: T.navy }}>
                      {r.reviewer_name}
                    </span>
                    <Stars rating={Math.round(r.rating)} />
                  </div>
                  {r.comment && (
                    <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: T.body }}>
                      "{r.comment}"
                    </p>
                  )}
                  <p className="text-[11px] mt-1" style={{ color: T.muted }}>
                    {timeAgo(r.reviewed_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Revenue strip (only if there is revenue) ──────────────────── */}
        {revenue > 0 && (
          <Link href="/dashboard/revenue"
            className="flex items-center justify-between mt-4 px-5 py-4 rounded-2xl transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${T.navy} 0%, #0D2442 100%)` }}>
            <div>
              <div className="text-[10px] font-bold tracking-[0.12em] uppercase mb-1" style={{ color: 'rgba(255,255,255,.4)' }}>
                Revenue this month
              </div>
              <div className="text-[28px] font-bold leading-none" style={{ color: T.tealLt, fontFamily: "'DM Serif Display', serif" }}>
                {fmt$(revenue)}
              </div>
              <div className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,.35)' }}>
                {plural(paid.length, 'completed job')}
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        )}
      </div>

      {/* ── Add Lead modal ─────────────────────────────────────────────────── */}
      {showAdd && session && (
        <AddLeadModal
          proId={session.id}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false)
            fetch(`/api/leads?pro_id=${session.id}`).then(r => r.json()).then(d => setLeads(d.leads || []))
          }}
        />
      )}
    </DashboardShell>
  )
}
