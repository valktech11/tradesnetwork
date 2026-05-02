'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MoreHorizontal, Eye, Send } from 'lucide-react'
import DashboardShell from '@/components/layout/DashboardShell'
import EstimateItems from '@/components/estimate/EstimateItems'
import EstimateSummary from '@/components/estimate/EstimateSummary'
import PaymentPanel from '@/components/estimate/PaymentPanel'
import ApprovalTimeline from '@/components/estimate/ApprovalTimeline'
import SmartNudges from '@/components/estimate/SmartNudges'
import { Session } from '@/types'

export type EstimateItem = {
  id: string
  name: string
  description: string
  qty: number
  unit_price: number
  amount: number
}

export type Estimate = {
  id: string
  estimate_number: string
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'paid'
  lead_name: string
  lead_source: string
  trade: string
  job_description: string
  created_at: string
  valid_until: string
  subtotal: number
  discount: number
  tax_rate: number
  tax_amount: number
  total: number
  deposit_percent: number
  require_deposit: boolean
  terms: string
  items: EstimateItem[]
  timeline: { event: string; label: string; timestamp: string | null }[]
}

const STATUS_STYLES: Record<Estimate['status'], { bg: string; text: string; label: string }> = {
  draft:    { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Draft' },
  sent:     { bg: 'bg-blue-50',    text: 'text-blue-600',   label: 'Sent' },
  viewed:   { bg: 'bg-purple-50',  text: 'text-purple-600', label: 'Viewed' },
  approved: { bg: 'bg-teal-50',    text: 'text-teal-700',   label: 'Approved' },
  paid:     { bg: 'bg-green-50',   text: 'text-green-700',  label: 'Paid' },
}

export default function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  // Read session synchronously to avoid flicker
  const [session] = useState<Session | null>(() => {
    if (typeof window === 'undefined') return null
    const s = sessionStorage.getItem('pg_pro')
    return s ? JSON.parse(s) : null
  })

  const [dk, setDk] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('pg_darkmode') === '1'
  })

  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'items' | 'notes'>('items')

  useEffect(() => {
    if (!session) { router.push('/login'); return }
    fetch(`/api/estimates/${id}`)
      .then(r => r.json())
      .then(d => {
        setEstimate(d.estimate ?? MOCK_ESTIMATE)
        setLoading(false)
      })
      .catch(() => {
        // Fallback to mock while API not yet built
        setEstimate(MOCK_ESTIMATE)
        setLoading(false)
      })
  }, [id, session, router])

  const handleSave = async () => {
    if (!estimate) return
    setSaving(true)
    try {
      await fetch(`/api/estimates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estimate),
      })
      setSaveMsg('Saved')
    } catch {
      setSaveMsg('Error saving')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  const toggleDark = () => {
    const next = !dk
    localStorage.setItem('pg_darkmode', next ? '1' : '0')
    setDk(next)
  }

  if (!session) return null

  const card = dk ? 'bg-[#1E293B] text-white border-[#334155]' : 'bg-white text-gray-900 border-[#E8E2D9]'
  const muted = dk ? 'text-slate-400' : 'text-[#6B7280]'

  return (
    <DashboardShell
      session={session}
      newLeads={0}
      onAddLead={() => {}}
      darkMode={dk}
      onToggleDark={toggleDark}
    >
      <div className={`min-h-screen pb-12 ${dk ? 'bg-[#0A1628]' : 'bg-[#F5F4F0]'}`}>
        <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-5">

          {/* ── Top action bar ── */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className={`flex items-center gap-1.5 text-sm font-medium ${muted} hover:text-[#0F766E] transition-colors`}
            >
              <ArrowLeft size={16} />
              Back to Estimates
            </button>

            <div className="flex items-center gap-3">
              {saveMsg && (
                <span className={`text-sm ${saveMsg === 'Saved' ? 'text-teal-600' : 'text-red-500'}`}>
                  {saveMsg}
                </span>
              )}
              <button className={`p-2 rounded-lg border ${card} hover:border-[#0F766E] transition-colors`}>
                <MoreHorizontal size={18} />
              </button>
              <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium ${card} hover:border-[#0F766E] hover:text-[#0F766E] transition-colors`}>
                <Eye size={16} />
                Preview
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-60 ${
                  dk ? 'border-[#334155] text-slate-300 hover:border-[#0F766E] hover:text-[#0F766E]' : 'border-[#E8E2D9] text-gray-700 hover:border-[#0F766E] hover:text-[#0F766E]'
                }`}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={async () => {
                  await handleSave()
                  // TODO: trigger send flow in v76
                }}
                disabled={saving}
                className="flex items-center gap-2 bg-gradient-to-r from-[#0F766E] to-[#0D9488] text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                <Send size={15} />
                Send & Get Paid Faster
              </button>
            </div>
          </div>

          {loading ? (
            <EstimateSkeleton dk={dk} />
          ) : estimate ? (
            <>
              {/* ── Estimate header card ── */}
              <div className={`rounded-xl border p-6 ${card}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold tracking-tight">
                        Estimate #{estimate.estimate_number}
                      </h1>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[estimate.status].bg} ${STATUS_STYLES[estimate.status].text}`}>
                        {STATUS_STYLES[estimate.status].label}
                      </span>
                    </div>

                    {/* Client meta row */}
                    <div className="flex items-center gap-6 mt-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-bold">
                          {estimate.lead_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{estimate.lead_name}</p>
                          <p className={`text-xs ${muted}`}>{estimate.trade}</p>
                        </div>
                      </div>

                      <div className={`text-sm ${muted} flex items-center gap-1`}>
                        <span className="font-medium text-gray-500 dark:text-slate-400">Lead Source</span>
                        <span className={`ml-1 font-semibold ${dk ? 'text-white' : 'text-gray-800'}`}>{estimate.lead_source}</span>
                      </div>

                      <div className={`text-sm ${muted}`}>
                        <span className="font-medium">Created</span>
                        <span className={`ml-1 font-semibold ${dk ? 'text-white' : 'text-gray-800'}`}>
                          {new Date(estimate.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>

                      <div className={`text-sm ${muted}`}>
                        <span className="font-medium">Valid Until</span>
                        <span className="ml-1 font-semibold text-amber-600">
                          {new Date(estimate.valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Smart nudge ── */}
              <SmartNudges darkMode={dk} />

              {/* ── Main 2-col layout ── */}
              <div className="flex gap-5 items-start">

                {/* Left — items + tabs */}
                <div className="flex-1 min-w-0 space-y-5">

                  {/* Tab strip */}
                  <div className={`rounded-xl border ${card} overflow-hidden`}>
                    <div className={`flex border-b ${dk ? 'border-[#334155]' : 'border-[#E8E2D9]'}`}>
                      {(['items', 'notes'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-6 py-3.5 text-sm font-medium transition-colors relative ${
                            activeTab === tab
                              ? 'text-[#0F766E]'
                              : `${muted} hover:text-[#0F766E]`
                          }`}
                        >
                          {tab === 'items' ? 'Estimate Items' : 'Notes & Attachments'}
                          {activeTab === tab && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F766E]" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="p-6">
                      {activeTab === 'items' ? (
                        <EstimateItems
                          estimate={estimate}
                          setEstimate={setEstimate}
                          darkMode={dk}
                        />
                      ) : (
                        <div className={`text-center py-12 ${muted}`}>
                          <p className="text-sm">Notes & Attachments — coming in v76</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div className={`rounded-xl border p-6 ${card}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">Terms & Conditions</h3>
                      <button className={`text-xs text-[#0F766E] border border-[#0F766E] px-3 py-1 rounded-lg hover:bg-teal-50 transition-colors`}>
                        Edit
                      </button>
                    </div>
                    <p className={`text-sm leading-relaxed ${muted}`}>{estimate.terms}</p>
                  </div>

                  {/* Client Actions footer */}
                  <div className={`rounded-xl border p-4 ${card}`}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border ${dk ? 'border-[#334155] hover:border-[#0F766E]' : 'border-[#E8E2D9] hover:border-[#0F766E]'} hover:text-[#0F766E] transition-colors`}>
                        <Eye size={15} />
                        View Estimate
                      </button>
                      <button className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border ${dk ? 'border-[#334155] hover:border-[#0F766E]' : 'border-[#E8E2D9] hover:border-[#0F766E]'} hover:text-[#0F766E] transition-colors`}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Download PDF
                      </button>
                      <button className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border ${dk ? 'border-[#334155] hover:border-[#0F766E]' : 'border-[#E8E2D9] hover:border-[#0F766E]'} hover:text-[#0F766E] transition-colors`}>
                        <Send size={15} />
                        Mark as Sent
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right sidebar */}
                <div className="w-[340px] shrink-0 space-y-5">
                  <EstimateSummary estimate={estimate} darkMode={dk} />
                  <PaymentPanel estimate={estimate} setEstimate={setEstimate} darkMode={dk} />
                  <ApprovalTimeline timeline={estimate.timeline} darkMode={dk} />
                </div>
              </div>
            </>
          ) : (
            <div className={`rounded-xl border p-12 text-center ${card} ${muted}`}>
              Estimate not found.
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}

function EstimateSkeleton({ dk }: { dk: boolean }) {
  const shimmer = dk ? 'bg-[#1E293B] animate-pulse' : 'bg-gray-100 animate-pulse'
  return (
    <div className="space-y-5">
      <div className={`h-32 rounded-xl ${shimmer}`} />
      <div className="flex gap-5">
        <div className={`flex-1 h-96 rounded-xl ${shimmer}`} />
        <div className={`w-[340px] h-96 rounded-xl ${shimmer}`} />
      </div>
    </div>
  )
}

// ── Mock data — remove once API /api/estimates/[id] is built ──
const MOCK_ESTIMATE: Estimate = {
  id: 'mock-1',
  estimate_number: 'EST-1047',
  status: 'draft',
  lead_name: 'Surya Yadav',
  lead_source: 'Website',
  trade: 'Interior Painting • 2BHK',
  job_description: 'Full interior painting for 2BHK apartment',
  created_at: '2024-05-14T10:30:00Z',
  valid_until: '2024-05-28T10:30:00Z',
  subtotal: 1900,
  discount: 100,
  tax_rate: 7,
  tax_amount: 126,
  total: 1926,
  deposit_percent: 50,
  require_deposit: true,
  terms: 'This estimate is valid for 14 days. Payment is due upon job completion. A 50% deposit is required to begin work.',
  items: [
    { id: '1', name: 'Interior Wall Painting', description: 'Premium quality paint', qty: 1, unit_price: 1200, amount: 1200 },
    { id: '2', name: 'Ceiling Painting',       description: 'Flat white finish',      qty: 1, unit_price: 300,  amount: 300  },
    { id: '3', name: 'Surface Preparation',    description: 'Patch, sand & prime',    qty: 1, unit_price: 250,  amount: 250  },
    { id: '4', name: 'Protection & Cleanup',   description: 'Furniture covering & cleanup', qty: 1, unit_price: 150, amount: 150 },
  ],
  timeline: [
    { event: 'sent',     label: 'Sent to client',       timestamp: '2024-05-14T10:30:00Z' },
    { event: 'viewed',   label: 'Viewed by client (2 times)', timestamp: '2024-05-15T09:15:00Z' },
    { event: 'approved', label: 'Approved by client',   timestamp: null },
    { event: 'paid',     label: 'Payment received',     timestamp: null },
  ],
}
