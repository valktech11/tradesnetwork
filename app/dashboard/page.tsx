'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Session, Lead, Review } from '@/types'
import { timeAgo, planLabel } from '@/lib/utils'
import DashboardShell from '@/components/layout/DashboardShell'
import ActionAlert from '@/components/ui/ActionAlert'
import AddLeadModal from '@/components/ui/AddLeadModal'

const TEAL   = '#0F766E'
const NAVY   = '#0A1628'
const AMBER  = '#B45309'
const CREAM  = '#F5F4F0'
const BORDER = '#E8E2D9'
const MUTED  = '#9CA3AF'
const BODY   = '#6B7280'

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24"
      fill={filled ? TEAL : 'none'} stroke={TEAL} strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function Stars({ rating }: { rating: number }) {
  const r = Math.round(rating)
  return (
    <div className="flex gap-0.5">
      <Star filled={r >= 1} /><Star filled={r >= 2} /><Star filled={r >= 3} />
      <Star filled={r >= 4} /><Star filled={r >= 5} />
    </div>
  )
}

function StatCard({ label, value, sub, accent, onClick, dark }: {
  label: string; value: string | number; sub?: string; accent?: string; onClick?: () => void; dark?: boolean
}) {
  return (
    <button onClick={onClick}
      className="flex-1 min-w-0 rounded-xl p-4 text-left transition-all active:scale-95 relative overflow-hidden"
      style={{ backgroundColor: dark ? '#1E293B' : 'white', border: `1px solid ${dark ? '#334155' : BORDER}` }}>
      {accent && <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ backgroundColor: accent }} />}
      <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-1" style={{ color: MUTED }}>
        {label}
      </div>
      <div className="text-3xl font-bold" style={{ color: dark ? '#F1F5F9' : NAVY }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: MUTED }}>{sub}</div>}
    </button>
  )
}

function StageChip({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <Link href="/dashboard/pipeline"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:opacity-80"
      style={{ backgroundColor: color + '18', color: color, border: `1px solid ${color}30` }}>
      <span className="font-bold">{count}</span>
      <span style={{ color: BODY }}>{label}</span>
    </Link>
  )
}

export default function OverviewPage() {
  const router = useRouter()

  const [session] = useState<Session | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = sessionStorage.getItem('pg_pro')
    return stored ? JSON.parse(stored) : null
  })

  // Dark mode — persisted in localStorage so it survives navigation
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

  const [leads,       setLeads]      = useState<Lead[]>([])
  const [reviews,     setReviews]    = useState<Review[]>([])
  const [dataLoading, setDataLoading]= useState(true)
  const [showAddLead, setShowAddLead]= useState(false)

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

  const activeLeads    = leads.filter(l => !['Paid','Lost','Archived','Converted','Completed'].includes(l.lead_status))
  const newLeads       = leads.filter(l => l.lead_status === 'New')
  // BUG FIX: Revenue includes both Paid + Completed (previously only Paid)
  const revenueLeads   = leads.filter(l => ['Paid', 'Completed'].includes(l.lead_status))
  const paidLeads      = leads.filter(l => l.lead_status === 'Paid')
  const contactedLeads = leads.filter(l => l.lead_status === 'Contacted')
  const quotedLeads    = leads.filter(l => l.lead_status === 'Quoted')
  const scheduledLeads = leads.filter(l => l.lead_status === 'Scheduled')
  const completedLeads = leads.filter(l => l.lead_status === 'Completed')

  const revenue = revenueLeads.reduce((sum, l) => sum + (l.quoted_amount || 0), 0)
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const overdue = leads.filter(l => {
    const days = (Date.now() - new Date(l.created_at).getTime()) / 86400000
    return days >= 3 && l.lead_status === 'New'
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = session?.name?.split(' ')[0] || ''

  const cardBg     = dk ? '#1E293B' : 'white'
  const cardBorder = dk ? '#334155' : BORDER
  const textMain   = dk ? '#F1F5F9' : NAVY
  const textBody   = dk ? '#94A3B8' : BODY

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
      <div className="max-w-4xl mx-auto px-4 py-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: textMain }}>
              {greeting}, {firstName}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: MUTED }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button onClick={() => setShowAddLead(true)}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: TEAL, color: 'white' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Lead
          </button>
        </div>

        {/* Action alerts */}
        {overdue.length > 0 && (
          <div className="mb-4">
            <ActionAlert
              leads={overdue.slice(0, 2)}
              onRespond={() => { window.location.href = '/dashboard/pipeline' }}
            />
            {overdue.length > 2 && (
              <Link href="/dashboard/pipeline"
                className="block text-center text-sm font-medium py-2 rounded-lg mt-2"
                style={{ color: AMBER, backgroundColor: '#FEF3C7' }}>
                +{overdue.length - 2} more leads need attention →
              </Link>
            )}
          </div>
        )}

        {/* Stats — grid on all screens, bigger numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard label="Total Leads" value={leads.length}  sub={`${activeLeads.length} active`}   accent="#0F766E" dark={dk} />
          <StatCard label="New"         value={newLeads.length} sub="awaiting response"                accent="#B45309" dark={dk} />
          <StatCard
            label="Revenue"
            value={revenue > 0 ? `$${revenue.toLocaleString()}` : '—'}
            sub={revenueLeads.length > 0 ? `${revenueLeads.length} closed job${revenueLeads.length !== 1 ? 's' : ''}` : 'no closed jobs yet'}
            accent="#7C3AED"
            dark={dk}
          />
          <StatCard
            label="Rating"
            value={avgRating || '—'}
            sub={reviews.length > 0 ? `${reviews.length} reviews` : 'no reviews yet'}
            accent="#16A34A"
            dark={dk}
          />
        </div>

        {/* Pipeline summary */}
        <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: MUTED }}>Pipeline</h2>
            <Link href="/dashboard/pipeline" className="text-sm font-medium" style={{ color: TEAL }}>View all →</Link>
          </div>
          {leads.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm mb-3" style={{ color: MUTED }}>No leads yet. Add your first lead to get started.</p>
              <button onClick={() => setShowAddLead(true)}
                className="hidden md:inline-flex px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: TEAL, color: 'white' }}>
                Add Lead
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {newLeads.length > 0       && <StageChip label="New"       count={newLeads.length}       color="#B45309" />}
              {contactedLeads.length > 0  && <StageChip label="Contacted" count={contactedLeads.length} color="#2563EB" />}
              {quotedLeads.length > 0    && <StageChip label="Quoted"    count={quotedLeads.length}    color="#7C3AED" />}
              {scheduledLeads.length > 0  && <StageChip label="Scheduled" count={scheduledLeads.length} color={TEAL} />}
              {completedLeads.length > 0  && <StageChip label="Completed" count={completedLeads.length} color="#10B981" />}
              {paidLeads.length > 0      && <StageChip label="Paid"      count={paidLeads.length}      color="#16A34A" />}
            </div>
          )}
        </div>

        {/* Revenue card */}
        {revenue > 0 && (
          <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: NAVY }}>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Revenue</h2>
            <div className="text-4xl font-bold" style={{ color: '#14B8A6' }}>${revenue.toLocaleString()}</div>
            <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              from {revenueLeads.length} closed job{revenueLeads.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="rounded-xl p-4" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: MUTED }}>Recent Reviews</h2>
              {avgRating && <span className="text-sm font-bold" style={{ color: textMain }}>{avgRating} ★</span>}
            </div>
            <div className="space-y-3">
              {reviews.slice(0, 2).map(review => (
                <div key={review.id} className="pb-3 last:pb-0 last:border-0 border-b" style={{ borderColor: cardBorder }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold" style={{ color: textMain }}>{review.reviewer_name}</span>
                    <Stars rating={review.rating} />
                  </div>
                  {review.comment && (
                    <p className="text-sm line-clamp-2" style={{ color: textBody }}>{review.comment}</p>
                  )}
                  <p className="text-xs mt-1" style={{ color: MUTED }}>{timeAgo(review.reviewed_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {leads.length === 0 && reviews.length === 0 && (
          <div className="rounded-xl p-8 text-center" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
            <div className="text-4xl mb-3">🏗️</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: textMain }}>Welcome to ProGuild</h3>
            <p className="text-sm mb-4" style={{ color: MUTED }}>Add your first lead to start tracking your pipeline.</p>
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
