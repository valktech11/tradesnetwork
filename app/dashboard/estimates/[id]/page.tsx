'use client'

import React, { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Save, Check } from 'lucide-react'
import DashboardShell from '@/components/layout/DashboardShell'
import EstimateItems from '@/components/estimate/EstimateItems'
import EstimateSummary from '@/components/estimate/EstimateSummary'
import PaymentPanel from '@/components/estimate/PaymentPanel'
import SmartNudges from '@/components/estimate/SmartNudges'
import EstimateProgressBar from '@/components/estimate/EstimateProgressBar'
import { Session } from '@/types'
import { theme } from '@/lib/theme'

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
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'declined' | 'invoiced' | 'paid' | 'void'
  lead_id?: string
  invoice_id?: string
  lead_name: string
  lead_source: string
  trade: string
  job_description: string
  created_at: string
  updated_at?: string
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
  notes?: string
  contact_phone?: string
  contact_email?: string
  declined_at?: string
  voided_at?: string
  void_reason?: string
  decline_reason?: string
  timeline: { event: string; label: string; timestamp: string | null }[]
}

const STATUS_STYLES: Record<Estimate['status'], { bg: string; text: string; label: string }> = {
  draft:    { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Draft' },
  sent:     { bg: 'bg-blue-50',    text: 'text-blue-600',   label: 'Sent' },
  viewed:   { bg: 'bg-purple-50',  text: 'text-purple-600', label: 'Viewed' },
  approved: { bg: 'bg-teal-50',    text: 'text-teal-700',   label: 'Approved' },
  declined: { bg: 'bg-red-50',     text: 'text-red-600',    label: 'Declined' },
  invoiced: { bg: 'bg-orange-50',  text: 'text-orange-700', label: 'Invoiced' },
  paid:     { bg: 'bg-green-50',   text: 'text-green-700',  label: 'Paid' },
  void:     { bg: 'bg-gray-100',   text: 'text-gray-400',   label: 'Void' },
}

// Whether line items should be locked (post-approval)
function isLocked(status: Estimate['status']) {
  return ['approved', 'invoiced', 'paid', 'void'].includes(status)
}

// Whether the estimate is in a terminal/read-only state
function isTerminal(status: Estimate['status']) {
  return ['invoiced', 'paid', 'void'].includes(status)
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
  const [isDirty, setIsDirty] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [showMoreMenu,    setShowMoreMenu]    = useState(false)
  const [showVoidConfirm, setShowVoidConfirm] = useState(false)
  const [voidReason,      setVoidReason]      = useState('')
  const [voiding,         setVoiding]         = useState(false)
  const [duplicating,     setDuplicating]     = useState(false)
  const [activeTab, setActiveTab] = useState<'items' | 'notes'>('items')
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [showSaveTemplate,   setShowSaveTemplate]   = useState(false)
  const [templateName,       setTemplateName]       = useState('')
  const [savingTemplate,     setSavingTemplate]     = useState(false)
  const [templates,          setTemplates]          = useState<{ id: string; name: string; items: any[] }[]>([])
  const [loadingTemplates,   setLoadingTemplates]   = useState(false)
  const [editingTerms,       setEditingTerms]       = useState(false)
  const [termsValue,         setTermsValue]         = useState('')

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

  // Wrap setEstimate for user edits — marks form dirty
  const setEstimateDirty: typeof setEstimate = (val) => {
    setEstimate(val)
    setIsDirty(true)
  }

  const handleCreateInvoice = async () => {
    if (!estimate || !session || creatingInvoice) return
    // If invoice already exists, navigate to it
    if (estimate.invoice_id) { router.push(`/dashboard/invoices/${estimate.invoice_id}`); return }
    setCreatingInvoice(true)
    try {
      const r = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pro_id:        session.id,
          estimate_id:   estimate.id,
          lead_id:       estimate.lead_id,
          lead_name:     estimate.lead_name,
          trade:         estimate.trade,
          contact_name:  estimate.lead_name,
          contact_email: estimate.contact_email,
          contact_phone: estimate.contact_phone,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      // Update local estimate state to reflect invoiced status
      setEstimate(prev => prev ? { ...prev, status: 'invoiced', invoice_id: d.invoice.id } : prev)
      router.push(`/dashboard/invoices/${d.invoice.id}`)
    } catch (e: any) {
      setSaveMsg(`Failed to create invoice: ${e.message}`)
      setTimeout(() => setSaveMsg(null), 4000)
    } finally {
      setCreatingInvoice(false)
    }
  }

  const handleVoid = async () => {
    if (!estimate || voiding) return
    setVoiding(true)
    try {
      await fetch(`/api/estimates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...estimate,
          status:    'void',
          voided_at: new Date().toISOString(),
          void_reason: voidReason || null,
        }),
      })
      setEstimate(prev => prev ? { ...prev, status: 'void', voided_at: new Date().toISOString() } : prev)
      setShowVoidConfirm(false)
      setVoidReason('')
    } catch { setSaveMsg('Failed to void estimate') }
    finally { setVoiding(false) }
  }

  const handleDuplicate = async () => {
    if (!estimate || !session || duplicating) return
    setDuplicating(true)
    try {
      const r = await fetch('/api/estimates/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimate_id: estimate.id, pro_id: session.id }),
      })
      const d = await r.json()
      if (d.estimate?.id) router.push(`/dashboard/estimates/${d.estimate.id}`)
    } catch { setSaveMsg('Failed to duplicate') }
    finally { setDuplicating(false) }
  }

  const handleSave = async () => {
    if (!estimate) return
    // Don't save mock data
    if (estimate.id === 'mock-1') {
      setSaveMsg('Run v75-estimates-sql.sql on staging DB first')
      setTimeout(() => setSaveMsg(null), 5000)
      return
    }
    setSaving(true)
    try {
      const r = await fetch(`/api/estimates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estimate),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        setSaveMsg(err.error || 'Save failed — check DB')
      } else {
        setSaveMsg('Saved ✓')
        setIsDirty(false)
      }
    } catch {
      setSaveMsg('Network error')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 4000)
    }
  }

  const toggleDark = () => {
    const next = !dk
    localStorage.setItem('pg_darkmode', next ? '1' : '0')
    setDk(next)
  }

  // ── Template handlers ──────────────────────────────────────────────────────
  const openTemplatePicker = async () => {
    setShowTemplatePicker(true)
    setLoadingTemplates(true)
    try {
      const r = await fetch(`/api/estimate-templates?pro_id=${session!.id}`)
      const d = await r.json()
      setTemplates(d.templates || [])
    } catch { setTemplates([]) }
    finally { setLoadingTemplates(false) }
  }

  const applyTemplate = (tpl: { id: string; name: string; items: any[] }) => {
    if (!estimate) return
    const newItems = tpl.items.map((i: any) => ({
      ...i, id: crypto.randomUUID()
    }))
    const merged   = [...estimate.items, ...newItems]
    const subtotal = merged.reduce((s: number, i: any) => s + i.qty * i.unit_price, 0)
    const tax_amount = subtotal * (estimate.tax_rate / 100)
    setEstimate(prev => prev ? { ...prev, items: merged, subtotal, tax_amount, total: subtotal + tax_amount } : prev)
    setShowTemplatePicker(false)
  }

  const saveTemplate = async () => {
    if (!estimate || !templateName.trim()) return
    setSavingTemplate(true)
    try {
      await fetch('/api/estimate-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pro_id: session!.id, name: templateName.trim(), items: estimate.items }),
      })
      setShowSaveTemplate(false)
      setTemplateName('')
    } catch { /* silent */ }
    finally { setSavingTemplate(false) }
  }

  if (!session) return null

  const card = dk ? 'bg-[#1E293B] text-white border-[#334155]' : 'bg-white text-gray-900 border-[#E8E2D9]'
  const muted = dk ? 'text-slate-400' : 'text-[#6B7280]'
  const t = theme(dk)

  return (
    <DashboardShell
      session={session}
      newLeads={0}
      onAddLead={() => {}}
      darkMode={dk}
      onToggleDark={toggleDark}
    >
      <div className={`min-h-screen pb-12 w-full max-w-[100vw] overflow-x-hidden ${dk ? "bg-[#0A1628]" : "bg-[#F5F4F0]"}`}>
        <div className="w-full max-w-[1400px] mx-auto px-3 py-4 lg:px-4 lg:py-6 space-y-5 min-w-0">

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
                <span className={`text-sm font-medium ${saveMsg.includes('✓') ? 'text-teal-600' : 'text-red-500'}`}>
                  {saveMsg}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <EstimateSkeleton dk={dk} />
          ) : estimate ? (
            <>
              {/* ── Estimate header ── */}
              <div className={`rounded-xl border px-6 py-5 ${card}`}>
                <div className="flex flex-col xl:flex-row xl:items-start xl:gap-6 gap-3">
                  {/* Col 1: Name H1 + EST# line 2 */}
                  <div className="xl:flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {estimate.lead_id ? (
                        <button onClick={() => router.push(`/dashboard/pipeline/${estimate.lead_id}`)}
                          className={`text-[22px] font-bold leading-tight hover:text-[#0F766E] transition-colors text-left ${dk ? 'text-white' : 'text-gray-900'}`}>
                          {estimate.lead_name}
                        </button>
                      ) : (
                        <h1 className={`text-[22px] font-bold leading-tight ${dk ? 'text-white' : 'text-gray-900'}`}>{estimate.lead_name}</h1>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-100 shrink-0">Lead</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap" style={{ fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: dk ? '#CBD5E1' : '#374151' }}>#{estimate.estimate_number}</span>
                      <span style={{ opacity: 0.35 }}>·</span>
                      <span className={`font-semibold ${STATUS_STYLES[estimate.status].text}`}>{STATUS_STYLES[estimate.status].label}</span>
                      {estimate.trade && <><span style={{ opacity: 0.35 }}>·</span><span style={{ color: dk ? '#94A3B8' : '#6B7280' }}>{estimate.trade}</span></>}
                      <span style={{ opacity: 0.35 }}>·</span>
                      <span style={{ fontSize: 12, color: dk ? '#64748B' : '#9CA3AF' }}>Last edited {timeAgo(estimate.updated_at || estimate.created_at)}</span>
                    </div>
                  </div>

                  {/* Col 2: Lead Source | Created | Valid Until */}
                  <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:gap-0">
                    {[
                      { label: 'Lead Source', value: estimate.lead_source || '—', amber: false },
                      { label: 'Created',     value: new Date(estimate.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), amber: false },
                      { label: 'Valid Until', value: new Date(estimate.valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), amber: true },
                    ].map(({ label, value, amber }, i) => (
                      <div key={label} className="flex items-center gap-0">
                        {i > 0 && <span className="hidden xl:block mx-5 select-none" style={{ color: dk ? '#334155' : '#D1D5DB' }}>|</span>}
                        <div>
                          <p className={`text-[10px] font-semibold uppercase tracking-wider leading-none ${muted}`}>{label}</p>
                          <p className={`text-sm font-bold mt-1 ${amber ? 'text-amber-500' : (dk ? 'text-white' : 'text-gray-900')}`}>{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Col 3: ··· menu + status-based primary CTA */}
                  <div className="flex flex-col items-start xl:items-end gap-2 xl:shrink-0 xl:ml-auto">
                    <div className="flex items-center gap-2">

                      {/* ··· More menu */}
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setShowMoreMenu(m => !m)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: `1.5px solid ${t.inputBorder}`, background: 'transparent', color: t.textBody, cursor: 'pointer', fontSize: 18, letterSpacing: 1 }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0F766E' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = t.inputBorder }}>
                          ···
                        </button>
                        {showMoreMenu && (
                          <div
                            style={{ position: 'absolute', top: '110%', right: 0, zIndex: 50, background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: 180, overflow: 'hidden' }}
                            onMouseLeave={() => setShowMoreMenu(false)}>
                            {[
                              {
                                label: 'Download PDF', icon: '↓',
                                action: async () => {
                                  setShowMoreMenu(false)
                                  if (!estimate || estimate.id === 'mock-1') { setSaveMsg('Save estimate to DB first'); setTimeout(() => setSaveMsg(null), 3000); return }
                                  setSaveMsg('Generating PDF...')
                                  try {
                                    const r = await fetch(`/api/estimates/pdf?id=${id}`)
                                    if (!r.ok) throw new Error('fail')
                                    const blob = await r.blob()
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement('a'); a.href = url; a.download = `Estimate-${estimate.estimate_number}.pdf`; a.click()
                                    URL.revokeObjectURL(url)
                                    setSaveMsg('PDF downloaded ✓')
                                  } catch { setSaveMsg('PDF failed') }
                                  setTimeout(() => setSaveMsg(null), 4000)
                                },
                              },
                              {
                                label: duplicating ? 'Duplicating...' : 'Duplicate Estimate', icon: '⎘',
                                action: () => { setShowMoreMenu(false); handleDuplicate() },
                              },
                              ...(!isTerminal(estimate.status) && estimate.status !== 'void' && estimate.status !== 'declined' ? [{
                                label: 'Void Estimate', icon: '✕', danger: true,
                                action: () => { setShowMoreMenu(false); setShowVoidConfirm(true) },
                              }] : []),
                            ].map(item => (
                              <button key={item.label} onClick={item.action}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', fontSize: 13, fontWeight: 500, background: 'transparent', border: 'none', color: (item as any).danger ? '#EF4444' : t.textBody, cursor: 'pointer', textAlign: 'left' }}
                                onMouseEnter={e => { e.currentTarget.style.background = dk ? '#1a2940' : '#F9FAFB' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                                <span style={{ fontSize: 14, width: 16, textAlign: 'center' }}>{item.icon}</span>
                                {item.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Preview — always visible except void */}
                      {estimate.status !== 'void' && (
                        <button
                          onClick={() => window.open(`${window.location.origin}/estimate/${id}`, '_blank')}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: `1.5px solid ${t.inputBorder}`, background: 'transparent', color: t.textBody, cursor: 'pointer' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0F766E'; e.currentTarget.style.color = '#0F766E' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = t.inputBorder; e.currentTarget.style.color = t.textBody }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          Preview
                        </button>
                      )}

                      {/* Primary CTA — per status */}
                      {estimate.status === 'draft' && (
                        <button onClick={async () => {
                          // D20 FIX: validate before sending
                          if (estimate.items.length === 0) { setSaveMsg('Add items before sending'); setTimeout(() => setSaveMsg(null), 3000); return }
                          if (estimate.total <= 0) { setSaveMsg('Total must be greater than $0'); setTimeout(() => setSaveMsg(null), 3000); return }
                          if (!estimate.contact_email) { setSaveMsg('Add client email to this lead to send estimate'); setTimeout(() => setSaveMsg(null), 4000); return }

                          const sentAt = new Date().toISOString()
                          await handleSave()

                          // D1 FIX: update status AND send actual email
                          await fetch(`/api/estimates/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...estimate, status: 'sent', sent_at: sentAt }) })

                          // Send email to client
                          await fetch('/api/estimates/send-reminder', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ estimateId: id, contactEmail: estimate.contact_email, pro_id: session?.id }),
                          })

                          setEstimate(prev => prev ? { ...prev, status: 'sent', timeline: prev.timeline.map(tl => tl.event === 'sent' ? { ...tl, timestamp: sentAt } : tl) } : prev)
                          setSaveMsg('Estimate sent to client ✓'); setTimeout(() => setSaveMsg(null), 3000)
                        }} disabled={saving}
                          className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60 whitespace-nowrap"
                          style={{ background: 'linear-gradient(135deg, #0F766E, #0D9488)' }}>
                          <Send size={14} /> Send Estimate
                        </button>
                      )}
                      {(estimate.status === 'sent' || estimate.status === 'viewed') && (
                        <button onClick={async () => {
                          if (!estimate.contact_email) { setSaveMsg('No email on file for this client'); setTimeout(() => setSaveMsg(null), 3000); return }
                          const r = await fetch('/api/estimates/send-reminder', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ estimateId: id, contactEmail: estimate.contact_email, pro_id: session?.id }),
                          })
                          setSaveMsg(r.ok ? 'Reminder sent to client ✓' : 'Failed to send reminder')
                          setTimeout(() => setSaveMsg(null), 3000)
                        }}
                          className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 whitespace-nowrap"
                          style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 1h3"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                          Send Reminder
                        </button>
                      )}
                      {estimate.status === 'declined' && (
                        <button onClick={handleDuplicate} disabled={duplicating}
                          className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60 whitespace-nowrap"
                          style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          {duplicating ? 'Creating...' : 'Revise & Resend'}
                        </button>
                      )}
                      {(estimate.status === 'invoiced' || estimate.status === 'paid') && (
                        <button onClick={() => estimate.invoice_id && router.push(`/dashboard/invoices/${estimate.invoice_id}`)}
                          className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 whitespace-nowrap"
                          style={{ background: 'linear-gradient(135deg, #0F766E, #0D9488)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          View Invoice
                        </button>
                      )}
                      {estimate.status === 'void' && (
                        <button onClick={handleDuplicate} disabled={duplicating}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60 whitespace-nowrap"
                          style={{ border: `1.5px solid ${t.inputBorder}`, background: 'transparent', color: t.textBody }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          {duplicating ? 'Creating...' : 'Start New Estimate'}
                        </button>
                      )}
                    </div>
                    {estimate.status !== 'void' && estimate.status !== 'declined' && (
                      <p className={`text-[11px] text-right ${muted}`}>Client can approve &amp; pay instantly</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Status banners for terminal/declined states ── */}
              {estimate.status === 'void' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 14, border: '1px solid #FECACA', background: dk ? 'rgba(239,68,68,0.08)' : '#FEF2F2' }}>
                  <span style={{ fontSize: 18 }}>⛔</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', margin: 0 }}>This estimate has been voided</p>
                    <p style={{ fontSize: 12, color: dk ? '#FDA4AF' : '#9F1239', margin: '2px 0 0' }}>
                      {estimate.void_reason ? `Reason: ${estimate.void_reason}` : 'No reason provided.'}
                    </p>
                  </div>
                  <button onClick={handleDuplicate} disabled={duplicating}
                    style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1.5px solid #FECACA', background: 'transparent', color: '#DC2626', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {duplicating ? 'Creating...' : 'Start New Estimate'}
                  </button>
                </div>
              )}
              {estimate.status === 'declined' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 14, border: '1px solid #FECACA', background: dk ? 'rgba(239,68,68,0.08)' : '#FFF1F1' }}>
                  <span style={{ fontSize: 18 }}>❌</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', margin: 0 }}>Client declined this estimate</p>
                    <p style={{ fontSize: 12, color: dk ? '#FDA4AF' : '#9F1239', margin: '2px 0 0' }}>
                      {estimate.decline_reason ? `"${estimate.decline_reason}"` : 'No reason provided.'}
                    </p>
                  </div>
                  <button onClick={handleDuplicate} disabled={duplicating}
                    style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', background: '#DC2626', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {duplicating ? 'Creating...' : 'Revise & Resend'}
                  </button>
                </div>
              )}

              {/* Horizontal progress bar */}
              <EstimateProgressBar timeline={estimate.timeline} darkMode={dk} />

              {/* Context-aware smart nudge — not shown for void/declined */}
              {!['void', 'declined'].includes(estimate.status) && (
                <SmartNudges
                  darkMode={dk}
                  status={estimate.status}
                  invoiceId={estimate.invoice_id}
                  onCta={() => {
                    if (estimate.status === 'approved') handleCreateInvoice()
                    else if (estimate.status === 'invoiced' && estimate.invoice_id) router.push(`/dashboard/invoices/${estimate.invoice_id}`)
                  }}
                />
              )}

              {/* ── Main 2-col layout ── */}
              <div className="flex flex-col xl:flex-row gap-5 items-start">

                {/* Left — items + tabs */}
                <div className="flex-1 min-w-0 space-y-5 min-w-0">

                  {/* ── Tab strip — matches reference: tabs left, buttons right ── */}
                  <div style={{ borderRadius: 12, border: `1px solid ${t.cardBorder}`, background: t.cardBg }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${t.cardBorder}` }}>
                      {/* Tabs */}
                      <div style={{ display: 'flex' }}>
                        {(['items', 'notes'] as const).map(tab => (
                          <button key={tab} onClick={() => setActiveTab(tab)}
                            style={{ padding: '12px 24px', fontSize: 13, fontWeight: 500, position: 'relative', border: 'none', background: 'transparent', cursor: 'pointer',
                              color: activeTab === tab ? '#0F766E' : t.textMuted,
                              borderBottom: activeTab === tab ? '2px solid #0F766E' : '2px solid transparent',
                            }}>
                            {tab === 'items' ? 'Estimate Items' : 'Notes & Attachments'}
                          </button>
                        ))}
                      </div>
                      {/* Use Previous Job button */}
                      {activeTab === 'items' && (
                        <div style={{ paddingRight: 16 }}>
                          <button onClick={openTemplatePicker}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${t.btnBorder}`, background: 'transparent', color: t.textMuted, cursor: 'pointer' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0F766E'; e.currentTarget.style.color = '#0F766E' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = t.btnBorder; e.currentTarget.style.color = t.textMuted }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                            Use Previous Job
                          </button>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 24 }}>
                      {activeTab === 'items' ? (
                        <>
                          {isLocked(estimate.status) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: dk ? 'rgba(245,158,11,0.08)' : '#FFFBEB', border: '1px solid #FCD34D', marginBottom: 16 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                              <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>
                                {estimate.status === 'approved'
                                  ? `Items locked — client approved on ${estimate.timeline.find(t => t.event === 'approved')?.timestamp ? new Date(estimate.timeline.find(t => t.event === 'approved')!.timestamp!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'this date'}. Create an invoice to proceed.`
                                  : 'Items are locked — this estimate has been invoiced.'}
                              </p>
                            </div>
                          )}
                          <EstimateItems
                            estimate={estimate}
                            setEstimate={setEstimateDirty}
                            darkMode={dk}
                            onOpenTemplatePicker={openTemplatePicker}
                            onSaveTemplate={() => setShowSaveTemplate(true)}
                            locked={isLocked(estimate.status)}
                          />
                        </>
                      ) : (
                        <NotesTab estimate={estimate} setEstimate={setEstimate} darkMode={dk} />
                      )}
                    </div>
                  </div>

                  {/* ── Dirty-state Save bar — only shown when there are unsaved changes ── */}
                  {activeTab === 'items' && isDirty && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, padding: '11px 16px', borderRadius: 12, border: `1.5px solid #F59E0B`, background: dk ? 'rgba(245,158,11,0.08)' : '#FFFBEB' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', display: 'inline-block', flexShrink: 0 }} />
                        {saveMsg ? (
                          <span style={{ fontSize: 13, fontWeight: 500, color: saveMsg.includes('✓') ? '#0F766E' : '#EF4444' }}>{saveMsg}</span>
                        ) : (
                          <span style={{ fontSize: 13, color: dk ? '#FCD34D' : '#92400E' }}>You have unsaved changes</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={async () => {
                          if (isDirty) await handleSave()  // C10 FIX: save current state first
                          setShowSaveTemplate(true)
                        }}
                          style={{ fontSize: 12, color: dk ? '#94A3B8' : '#6B7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent' }}
                          onMouseEnter={e => (e.currentTarget.style.textDecorationColor = 'currentColor')}
                          onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}>
                          Save as template
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', background: '#0F766E', color: '#fff', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                          <Save size={13} />
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Post-save confirmation — shown briefly after save */}
                  {activeTab === 'items' && !isDirty && saveMsg && saveMsg.includes('✓') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: `1px solid #99F6E4`, background: dk ? 'rgba(15,118,110,0.1)' : '#F0FDFA' }}>
                      <Check size={14} color="#0F766E" />
                      <span style={{ fontSize: 13, color: '#0F766E', fontWeight: 500 }}>{saveMsg}</span>
                    </div>
                  )}

                  {/* ── Save as template — slim text link ── */}
                  {activeTab === 'items' && !isDirty && (
                    <div style={{ textAlign: 'center', padding: '2px 0 4px' }}>
                      <button onClick={() => setShowSaveTemplate(true)}
                        style={{ fontSize: 12, color: t.textSubtle, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#0F766E')}
                        onMouseLeave={e => (e.currentTarget.style.color = t.textSubtle)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                        Save as reusable template
                      </button>
                    </div>
                  )}

                  {/* ── Terms & Conditions — editable ── */}
                  <div style={{ borderRadius: 12, border: `1px solid ${t.cardBorder}`, background: t.cardBg, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: t.textPri }}>Terms & Conditions</h3>
                      {!editingTerms && (
                        <button
                          onClick={() => { setTermsValue(estimate.terms); setEditingTerms(true) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${t.btnBorder}`, background: 'transparent', color: t.btnText, cursor: 'pointer' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0F766E'; e.currentTarget.style.color = '#0F766E' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = t.btnBorder; e.currentTarget.style.color = t.btnText }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Edit
                        </button>
                      )}
                    </div>
                    {editingTerms ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <textarea
                          value={termsValue}
                          onChange={e => setTermsValue(e.target.value)}
                          rows={4}
                          style={{ width: '100%', fontSize: 13, borderRadius: 8, padding: '10px 12px', lineHeight: 1.6, resize: 'vertical', background: t.inputBg, color: t.textPri, boxSizing: 'border-box', boxShadow: '0 0 0 1.5px #0F766E', border: 'none', outline: 'none' }}
                        />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditingTerms(false)}
                            style={{ padding: '6px 14px', fontSize: 13, borderRadius: 8, border: `1.5px solid ${t.cardBorder}`, background: 'transparent', color: t.textMuted, cursor: 'pointer' }}>
                            Cancel
                          </button>
                          <button
                            onClick={() => { setEstimate(prev => prev ? { ...prev, terms: termsValue } : prev); setEditingTerms(false) }}
                            style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, borderRadius: 8, border: 'none', background: '#0F766E', color: '#fff', cursor: 'pointer' }}>
                            Save Terms
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: t.textMuted, wordBreak: 'break-word', overflowWrap: 'break-word' }}>{estimate.terms}</p>
                    )}
                  </div>

                  {/* ── Secondary actions — slim row ── */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {/* Download PDF */}
                    <button
                      onClick={async () => {
                        if (!estimate || estimate.id === 'mock-1') { setSaveMsg('Save estimate to DB first'); setTimeout(() => setSaveMsg(null), 3000); return }
                        setSaveMsg('Generating PDF...')
                        try {
                          const r = await fetch(`/api/estimates/pdf?id=${id}`)
                          if (!r.ok) throw new Error('PDF failed')
                          const blob = await r.blob()
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url; a.download = `Estimate-${estimate.estimate_number}.pdf`; a.click()
                          URL.revokeObjectURL(url)
                          setSaveMsg('PDF downloaded ✓')
                        } catch { setSaveMsg('PDF generation failed') }
                        setTimeout(() => setSaveMsg(null), 4000)
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: `1.5px solid ${t.inputBorder}`, background: 'transparent', color: t.textBody, cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#0F766E'; e.currentTarget.style.color = '#0F766E' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = t.inputBorder; e.currentTarget.style.color = t.textBody }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download PDF
                    </button>
                    {/* Mark as Sent / Sent state */}
                    {['sent','viewed','approved','invoiced','paid'].includes(estimate.status) ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#0F766E', background: '#F0FDFA', border: '1px solid #99F6E4' }}>
                        <Check size={13} /> Marked as Sent
                      </div>
                    ) : (
                      <button
                        onClick={async () => {
                          if (!estimate) return
                          const sentAt = new Date().toISOString()
                          await fetch(`/api/estimates/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...estimate, status: 'sent', sent_at: sentAt }) })
                          setEstimate(prev => {
                            if (!prev) return prev
                            return { ...prev, status: 'sent', timeline: prev.timeline.map(tl => tl.event === 'sent' ? { ...tl, timestamp: sentAt } : tl) }
                          })
                          setSaveMsg('Marked as sent ✓'); setTimeout(() => setSaveMsg(null), 3000)
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: `1.5px solid ${t.inputBorder}`, background: 'transparent', color: t.textBody, cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#0F766E'; e.currentTarget.style.color = '#0F766E' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = t.inputBorder; e.currentTarget.style.color = t.textBody }}>
                        <Send size={13} /> Mark as Sent
                      </button>
                    )}
                  </div>
                </div>

                {/* Right sidebar */}
                <div className="w-full xl:w-[340px] xl:shrink-0 space-y-5">
                  <EstimateSummary estimate={estimate} darkMode={dk} />
                  <PaymentPanel
                    estimate={estimate}
                    setEstimate={setEstimate}
                    darkMode={dk}
                    onAction={msg => { setSaveMsg(msg); setTimeout(() => setSaveMsg(null), 4000) }}
                  />
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
    {/* ── Void confirm modal ── */}
      {showVoidConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowVoidConfirm(false)}>
          <div style={{ background: t.cardBg, borderRadius: 20, width: '100%', maxWidth: 400, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: t.textPri, marginBottom: 6 }}>Void this estimate?</h3>
            <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 16 }}>This cannot be undone. You can duplicate it to start a new estimate.</p>
            <input
              type="text"
              placeholder="Reason (optional) — e.g. Wrong price, job cancelled"
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${t.inputBorder}`, background: t.inputBg, color: t.textPri, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowVoidConfirm(false)}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: `2px solid ${t.cardBorder}`, background: 'transparent', color: t.textMuted, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleVoid} disabled={voiding}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: '#EF4444', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: voiding ? 0.7 : 1 }}>
                {voiding ? 'Voiding...' : 'Void Estimate'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showTemplatePicker && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowTemplatePicker(false)}>
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${dk ? 'bg-[#1E293B]' : 'bg-white'}`}
            onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${dk ? 'border-[#334155]' : 'border-[#E8E2D9]'}`}>
              <h3 className={`font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>Use Previous Job</h3>
              <button onClick={() => setShowTemplatePicker(false)} className={muted}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loadingTemplates ? (
                <div className={`p-8 text-center text-sm ${muted}`}>Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="p-8 text-center">
                  <p className={`text-sm font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>No templates yet</p>
                  <p className={`text-xs mt-1 ${muted}`}>Build an estimate and click "Save as Template" to reuse it.</p>
                </div>
              ) : templates.map(tpl => (
                <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                  className={`w-full text-left px-5 py-3.5 border-b last:border-b-0 transition-colors ${dk ? 'border-[#334155] hover:bg-[#0F172A]' : 'border-[#E8E2D9] hover:bg-[#F9FAFB]'}`}>
                  <p className={`text-sm font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>{tpl.name}</p>
                  <p className={`text-xs mt-0.5 ${muted}`}>{tpl.items.length} item{tpl.items.length !== 1 ? 's' : ''}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Save template modal ── */}
      {showSaveTemplate && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowSaveTemplate(false)}>
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl p-6 ${dk ? 'bg-[#1E293B]' : 'bg-white'}`}
            onClick={e => e.stopPropagation()}>
            <h3 className={`font-semibold mb-1 ${dk ? 'text-white' : 'text-gray-900'}`}>Save as Template</h3>
            <p className={`text-sm mb-4 ${muted}`}>Name this template so you can reuse it on future estimates.</p>
            <input autoFocus value={templateName} onChange={e => setTemplateName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveTemplate(); if (e.key === 'Escape') setShowSaveTemplate(false) }}
              placeholder="e.g. Interior Paint 2BHK"
              className={`w-full text-sm px-3 py-2.5 rounded-lg mb-4 ${dk ? 'bg-[#0F172A] text-white' : 'bg-[#F5F4F0] text-gray-900'}`}
              style={{ boxShadow: '0 0 0 1.5px #0F766E' }}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowSaveTemplate(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm border ${dk ? 'border-[#334155] text-slate-400' : 'border-[#E8E2D9] text-gray-600'}`}>Cancel</button>
              <button onClick={saveTemplate} disabled={savingTemplate || !templateName.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#0F766E] to-[#0D9488] text-white hover:opacity-90 disabled:opacity-50">
                {savingTemplate ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}

// ── Notes & Attachments tab ────────────────────────────────────────────────
function NotesTab({ estimate, setEstimate, darkMode }: {
  estimate: Estimate
  setEstimate: React.Dispatch<React.SetStateAction<Estimate | null>>
  darkMode: boolean
}) {
  const dk = darkMode
  const [note, setNote] = React.useState(estimate.notes || '')
  const [saving, setSaving] = React.useState(false)
  const [saved,  setSaved]  = React.useState(false)

  const border  = dk ? '#334155' : '#E8E2D9'
  const bgCard  = dk ? '#1E293B' : '#ffffff'
  const col     = dk ? '#f1f5f9' : '#111827'
  const colMuted= dk ? '#94a3b8' : '#6B7280'

  // C8 FIX: save to DB, not just local state
  const saveNote = async () => {
    setSaving(true)
    try {
      await fetch(`/api/estimates/${estimate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: note }),
      })
      setEstimate(prev => prev ? { ...prev, notes: note } : prev)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { /* silent — toast not critical here */ }
    finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Internal notes */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 8, display: 'block' }}>
          Internal Notes
        </label>
        <textarea
          value={note}
          onChange={e => { setNote(e.target.value); setSaved(false) }}
          placeholder="Add notes visible only to you — job details, client preferences, reminders..."
          rows={5}
          style={{
            width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 10,
            border: `1.5px solid ${border}`, background: dk ? '#0f172a' : '#f9fafb',
            color: col, resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' as const,
          }}
          onFocus={e => (e.target.style.borderColor = '#0F766E')}
          onBlur={e => (e.target.style.borderColor = border)}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, gap: 8, alignItems: 'center' }}>
          {saved && <span style={{ fontSize: 13, color: '#0F766E' }}>✓ Saved</span>}
          <button onClick={saveNote} disabled={saving}
            style={{ padding: '7px 18px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: '#0F766E', color: '#fff', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>

      {/* Attachments placeholder */}
      <div style={{ border: `1.5px dashed ${border}`, borderRadius: 12, padding: '28px 20px', textAlign: 'center' as const }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: dk ? '#0f172a' : '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: col, marginBottom: 4 }}>File Attachments</p>
        <p style={{ fontSize: 13, color: colMuted, marginBottom: 12 }}>Attach photos, contracts, or reference documents to this estimate.</p>
        <button style={{ padding: '8px 18px', fontSize: 13, fontWeight: 500, borderRadius: 8, border: `1.5px solid ${border}`, background: 'transparent', color: colMuted, cursor: 'not-allowed', opacity: 0.5 }}>
          Upload Files — coming in v76
        </button>
      </div>
    </div>
  )
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
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
