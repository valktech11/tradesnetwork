'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Session, Lead, Review } from '@/types'
import { timeAgo, planLabel } from '@/lib/utils'
import DashboardShell from '@/components/layout/DashboardShell'
import AddLeadModal from '@/components/ui/AddLeadModal'

const TEAL   = '#0F766E'
const TEAL_L = '#14B8A6'
const NAVY   = '#0A1628'
const AMBER  = '#B45309'
const CREAM  = '#F5F4F0'
const BORDER = '#E8E2D9'
const MUTED  = '#9CA3AF'
const BODY   = '#6B7280'

// ── Icons ─────────────────────────────────────────────────────────────────────
function Ic({ d, s = 18, sw = 1.7, color }: { d: string; s?: number; sw?: number; color?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

function Star({ filled, size = 13 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? '#F59E0B' : 'none'} stroke="#F59E0B" strokeWidth="1.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
function Stars({ rating, size }: { rating: number; size?: number }) {
  const r = Math.round(rating)
  return <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <div key={i}><Star filled={r >= i} size={size} /></div>)}</div>
}

// ── Action Center Card ─────────────────────────────────────────────────────────
function ActionCard({ icon, count, label, sub, color, ctaLabel, ctaHref, dark }: {
  icon: string; count: number | string; label: string; sub: string; color: string;
  ctaLabel: string; ctaHref: string; dark: boolean
}) {
  const bg     = dark ? '#1E293B' : 'white'
  const border = dark ? '#334155' : BORDER
  const textM  = dark ? '#F1F5F9' : NAVY
  return (
    <div className="flex-1 min-w-0 rounded-2xl p-4 flex flex-col gap-3"
      style={{ backgroundColor: bg, border: `1px solid ${border}` }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + '15' }}>
          <Ic d={icon} s={18} sw={1.8} color={color} />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold" style={{ color: textM }}>{count}</div>
          <div className="text-[12px] font-semibold" style={{ color: textM }}>{label}</div>
          <div className="text-[11px] mt-0.5" style={{ color: MUTED }}>{sub}</div>
        </div>
      </div>
      <Link href={ctaHref}
        className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-all hover:opacity-90"
        style={{ backgroundColor: color + '12', color }}>
        {ctaLabel}
      </Link>
    </div>
  )
}

// ── Pipeline Stage Arrow ───────────────────────────────────────────────────────
function PipeStage({ label, count, color, isLast, dark }: {
  label: string; count: number; color: string; isLast?: boolean; dark: boolean
}) {
  const dimmed = count === 0
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Link href="/dashboard/pipeline" className="flex flex-col items-center gap-1 min-w-0">
        <div className="text-lg font-bold" style={{ color: dimmed ? (dark ? '#4B5563' : '#D1D5DB') : color }}>{count}</div>
        <div className="text-[10px] font-semibold text-center leading-tight" style={{ color: dimmed ? MUTED : BODY }}>{label}</div>
      </Link>
      {!isLast && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dark ? '#374151' : '#D1D5DB'} strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mx-1">
          <path d="M9 18l6-6-6-6" />
        </svg>
      )}
    </div>
  )
}

export default function OverviewPage() {
  const router = useRouter()

  const [session] = useState<Session | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = sessionStorage.getItem('pg_pro')
    return stored ? JSON.parse(stored) : null
  })

  const [dk, setDk] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('pg_darkmode') === '1'
  })

  function toggleDark() {
    setDk(prev => {
      const next = !prev
      localStorage.setItem('pg_darkmode', next ? '1' : '0')
      return next
    })
  }

  const [leads,       setLeads]       = useState<Lead[]>([])
  const [reviews,     setReviews]     = useState<Review[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [showAddLead, setShowAddLead] = useState(false)

  useEffect(() => {
    if (!session) { router.push('/login'); return }
    Promise.all([
      fetch(`/api/leads?pro_id=${session.id}`).then(r => r.json()),
      fetch(`/api/reviews?pro_id=${session.id}`).then(r => r.json()),
    ]).then(([leadsData, reviewsData]) => {
      setLeads(leadsData.leads || [])
      setReviews((reviewsData.reviews || []).filter((r: Review) => r.is_approved))
      setDataLoading(false)
    }).catch(() => setDataLoading(false))
  }, [session, router])

  const newLeads       = leads.filter(l => l.lead_status === 'New')
  const contactedLeads = leads.filter(l => l.lead_status === 'Contacted')
  const quotedLeads    = leads.filter(l => l.lead_status === 'Quoted')
  const scheduledLeads = leads.filter(l => l.lead_status === 'Scheduled')
  const completedLeads = leads.filter(l => l.lead_status === 'Completed')
  const paidLeads      = leads.filter(l => l.lead_status === 'Paid')
  const revenueLeads   = leads.filter(l => ['Paid','Completed'].includes(l.lead_status))
  const activeLeads    = leads.filter(l => !['Paid','Lost','Archived','Converted','Completed'].includes(l.lead_status))

  // Awaiting response = we need to reply (contacted but no follow-up from us implied by age)
  const awaitingResponse = contactedLeads.filter(l => {
    const days = (Date.now() - new Date(l.created_at).getTime()) / 86400000
    return days >= 1
  })
  // Waiting on customer = we quoted and waiting to hear back
  const waitingOnCustomer = quotedLeads

  const revenue  = revenueLeads.reduce((sum, l) => sum + (l.quoted_amount || 0), 0)
  const pipeline = activeLeads.reduce((sum, l) => sum + (l.quoted_amount || 0), 0)
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null

  const overdue = leads.filter(l => {
    const days = (Date.now() - new Date(l.created_at).getTime()) / 86400000
    return days >= 3 && l.lead_status === 'New'
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = session?.name?.split(' ')[0] || ''

  // Theme
  const pageBg   = dk ? '#0F172A' : '#ECEAE5'
  const cardBg   = dk ? '#1E293B' : 'white'
  const cardBdr  = dk ? '#334155' : BORDER
  const textMain = dk ? '#F1F5F9' : NAVY
  const textBody = dk ? '#94A3B8' : BODY
  const sectionBg = dk ? '#162033' : '#F8F7F5'

  if (!session || dataLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: TEAL, borderTopColor: 'transparent' }} />
          <span className="text-sm font-medium" style={{ color: MUTED }}>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <DashboardShell session={session} newLeads={newLeads.length} onAddLead={() => setShowAddLead(true)} darkMode={dk} onToggleDark={toggleDark}>
      <div className="max-w-5xl mx-auto px-5 py-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: textMain }}>
              {greeting}, {firstName}! 👋
            </h1>
            <p className="text-sm mt-0.5" style={{ color: MUTED }}>
              Here&apos;s what&apos;s happening with your business today.
            </p>
          </div>
          <button onClick={() => setShowAddLead(true)}
            className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: TEAL, color: 'white' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add New Lead
          </button>
        </div>

        {/* ── Action Center ───────────────────────────────────────────────── */}
        {leads.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-[15px] font-bold" style={{ color: textMain }}>Action Center</h2>
                <p className="text-[12px]" style={{ color: MUTED }}>Top items that need your attention</p>
              </div>
              <Link href="/dashboard/pipeline" className="text-[12px] font-semibold flex items-center gap-1" style={{ color: TEAL }}>
                View all leads
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {newLeads.length > 0 && (
                <ActionCard
                  icon="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                  count={newLeads.length} label="New Leads"
                  sub={`Received in last 2 hours`}
                  color="#B45309" ctaLabel="View Leads" ctaHref="/dashboard/pipeline" dark={dk}
                />
              )}
              {awaitingResponse.length > 0 && (
                <ActionCard
                  icon="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zm0-6l-4-4 1.41-1.41L12 13.17l6.59-6.58L20 8l-8 8z"
                  count={awaitingResponse.length} label="Awaiting Your Response"
                  sub="Customers messaged you"
                  color="#7C3AED" ctaLabel="View Leads" ctaHref="/dashboard/pipeline" dark={dk}
                />
              )}
              {waitingOnCustomer.length > 0 && (
                <ActionCard
                  icon="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zM12 8v4l3 3"
                  count={waitingOnCustomer.length} label="Waiting on Customer"
                  sub="You replied, waiting for them"
                  color="#0EA5E9" ctaLabel="View Leads" ctaHref="/dashboard/pipeline" dark={dk}
                />
              )}
              {scheduledLeads.length > 0 && (
                <ActionCard
                  icon="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
                  count={scheduledLeads.length} label="Jobs Scheduled"
                  sub="This week"
                  color={TEAL} ctaLabel="View Pipeline" ctaHref="/dashboard/pipeline" dark={dk}
                />
              )}
            </div>
            {/* Overdue alert */}
            {overdue.length > 0 && (
              <div className="flex items-center gap-3 mt-3 px-4 py-3 rounded-xl"
                style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>
                </svg>
                <span className="text-[12px] font-semibold flex-1" style={{ color: '#92400E' }}>
                  {overdue.length} lead{overdue.length > 1 ? 's' : ''} overdue — no response in 3+ days
                </span>
                <Link href="/dashboard/pipeline" className="text-[12px] font-bold" style={{ color: '#B45309' }}>Follow up →</Link>
              </div>
            )}
          </div>
        )}

        {/* ── Pipeline ────────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: cardBg, border: `1px solid ${cardBdr}` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-bold" style={{ color: textMain }}>Pipeline</h2>
              <p className="text-[12px]" style={{ color: MUTED }}>Track your leads at every stage</p>
            </div>
            <Link href="/dashboard/pipeline" className="text-[12px] font-semibold flex items-center gap-1" style={{ color: TEAL }}>
              Open Full Pipeline
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </Link>
          </div>

          {leads.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm mb-3" style={{ color: MUTED }}>No leads yet. Add your first lead to get started.</p>
              <button onClick={() => setShowAddLead(true)}
                className="hidden md:inline-flex px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: TEAL, color: 'white' }}>
                Add First Lead
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              {/* Stage flow */}
              <div className="flex items-center gap-1 flex-wrap">
                <PipeStage label="New" count={newLeads.length} color="#B45309" dark={dk} />
                <PipeStage label="Contacted" count={contactedLeads.length} color="#2563EB" dark={dk} />
                <PipeStage label="Quoted" count={quotedLeads.length} color="#7C3AED" dark={dk} />
                <PipeStage label="Scheduled" count={scheduledLeads.length} color={TEAL} dark={dk} />
                <PipeStage label="Job Won" count={completedLeads.length + paidLeads.length} color="#16A34A" isLast dark={dk} />
              </div>

              {/* Pipeline value */}
              {pipeline > 0 && (
                <div className="hidden md:flex flex-col items-end flex-shrink-0 pl-6 border-l" style={{ borderColor: cardBdr }}>
                  <div className="text-[11px] font-semibold mb-0.5" style={{ color: MUTED }}>Total Pipeline Value</div>
                  <div className="text-2xl font-bold" style={{ color: textMain }}>${pipeline.toLocaleString()}</div>
                  <div className="text-[11px]" style={{ color: MUTED }}>Potential Revenue</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Stats row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total Leads', value: leads.length, sub: `${activeLeads.length} active`, accent: TEAL, href: '/dashboard/pipeline' },
            { label: 'New', value: newLeads.length, sub: 'awaiting response', accent: AMBER, href: '/dashboard/pipeline' },
            { label: 'Revenue', value: revenue > 0 ? `$${revenue.toLocaleString()}` : '$0', sub: revenueLeads.length > 0 ? `${revenueLeads.length} closed job${revenueLeads.length !== 1 ? 's' : ''}` : 'Mark a lead Paid', accent: '#7C3AED', href: '/dashboard/pipeline' },
            { label: 'Rating', value: avgRating ? avgRating.toFixed(1) : '—', sub: reviews.length > 0 ? `${reviews.length} review${reviews.length !== 1 ? 's' : ''}` : 'no reviews yet', accent: '#16A34A', href: '/edit-profile' },
          ].map(c => (
            <Link key={c.label} href={c.href}
              className="rounded-2xl p-4 relative overflow-hidden transition-all hover:shadow-sm active:scale-[.98]"
              style={{ backgroundColor: cardBg, border: `1px solid ${cardBdr}` }}>
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ backgroundColor: c.accent }} />
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-2 mt-1" style={{ color: MUTED }}>{c.label}</div>
              <div className="text-3xl font-bold" style={{ color: textMain }}>{c.value}</div>
              <div className="text-[11px] mt-0.5" style={{ color: MUTED }}>{c.sub}</div>
            </Link>
          ))}
        </div>

        {/* ── Reviews & Growth ────────────────────────────────────────────── */}
        {reviews.length > 0 && (
          <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: cardBg, border: `1px solid ${cardBdr}` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-base">⭐</span>
                <h2 className="text-[15px] font-bold" style={{ color: textMain }}>Reviews &amp; Growth</h2>
              </div>
              <Link href="/edit-profile" className="text-[12px] font-semibold flex items-center gap-1" style={{ color: TEAL }}>
                View all reviews
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </Link>
            </div>

            <div className="flex flex-col md:flex-row gap-5">
              {/* Left: big rating */}
              <div className="flex items-center gap-4 md:w-40 flex-shrink-0">
                <div>
                  <div className="text-5xl font-bold" style={{ color: textMain }}>{avgRating?.toFixed(1)}</div>
                  <Stars rating={avgRating || 0} size={14} />
                  <div className="text-[11px] mt-1" style={{ color: MUTED }}>({reviews.length} reviews)</div>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px" style={{ backgroundColor: cardBdr }} />

              {/* Right: review cards */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                {reviews.slice(0, 4).map(review => (
                  <div key={review.id} className="rounded-xl p-3" style={{ backgroundColor: sectionBg, border: `1px solid ${cardBdr}` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: TEAL }}>
                          {review.reviewer_name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[12px] font-semibold" style={{ color: textMain }}>{review.reviewer_name}</span>
                      </div>
                      <Stars rating={review.rating} size={11} />
                    </div>
                    {review.comment && (
                      <p className="text-[11px] line-clamp-2" style={{ color: textBody }}>{review.comment}</p>
                    )}
                    <p className="text-[10px] mt-1.5" style={{ color: MUTED }}>{timeAgo(review.reviewed_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Revenue banner (only when meaningful) ───────────────────────── */}
        {revenue > 0 && (
          <div className="rounded-2xl p-5 mb-4 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #0A1628 0%, #0F2240 100%)' }}>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Total Revenue</div>
              <div className="text-4xl font-bold" style={{ color: TEAL_L }}>${revenue.toLocaleString()}</div>
              <div className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                from {revenueLeads.length} closed job{revenueLeads.length !== 1 ? 's' : ''}
              </div>
            </div>
            <Link href="/dashboard/pipeline"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold"
              style={{ backgroundColor: 'rgba(20,184,166,0.15)', color: TEAL_L, border: '1px solid rgba(20,184,166,0.3)' }}>
              View Pipeline →
            </Link>
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {leads.length === 0 && reviews.length === 0 && (
          <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: cardBg, border: `1px solid ${cardBdr}` }}>
            <div className="text-5xl mb-4">🏗️</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: textMain }}>Welcome to ProGuild</h3>
            <p className="text-sm mb-5" style={{ color: MUTED }}>Add your first lead to start tracking your pipeline and growing your business.</p>
            <button onClick={() => setShowAddLead(true)}
              className="hidden md:inline-flex px-6 py-3 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: TEAL, color: 'white' }}>
              Add First Lead
            </button>
          </div>
        )}
      </div>

      {showAddLead && session && (
        <AddLeadModal
          proId={session.id}
          onClose={() => setShowAddLead(false)}
          onAdded={() => { setShowAddLead(false); window.location.reload() }}
        />
      )}
    </DashboardShell>
  )
}
