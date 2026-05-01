'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Session, Lead } from '@/types'
import DashboardShell from '@/components/layout/DashboardShell'
import LeadPipeline from '@/components/ui/LeadPipeline'
import ActionAlert from '@/components/ui/ActionAlert'
import AddLeadModal from '@/components/ui/AddLeadModal'

export default function PipelinePage() {
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
  const [dataLoading, setDataLoading] = useState(true)
  const [showAddLead, setShowAddLead] = useState(false)
  const [saveError,   setSaveError]   = useState<string | null>(null)

  // Single fetch function — reused on mount, after add, after save
  const fetchLeads = useCallback(async () => {
    if (!session) return
    const r = await fetch(`/api/leads?pro_id=${session.id}`)
    if (!r.ok) return
    const data = await r.json()
    setLeads(data.leads || [])
  }, [session])

  useEffect(() => {
    if (!session) { router.push('/login'); return }
    fetchLeads().finally(() => setDataLoading(false))
  }, [session, router, fetchLeads])

  const newLeads = leads.filter(l => l.lead_status === 'New')
  const overdue  = leads.filter(l => {
    const days = (Date.now() - new Date(l.created_at).getTime()) / 86400000
    return days >= 3 && l.lead_status === 'New'
  })

  const TEAL     = '#0F766E'
  const textMain = dk ? '#F1F5F9' : '#0A1628'

  // Status change — PATCH [id] route, then re-fetch from DB (no optimistic state)
  async function handleStatusChange(leadId: string, status: string) {
    setSaveError(null)
    const r = await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_status: status }),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      setSaveError(err.error || 'Failed to save — please try again')
      return
    }
    // Re-fetch from Supabase so mobile + desktop see identical DB state
    await fetchLeads()
  }

  // Field update (notes, amount, dates) — same pattern
  async function handleUpdate(leadId: string, fields: Partial<Lead>) {
    setSaveError(null)
    const r = await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      setSaveError(err.error || 'Failed to save — please try again')
      return
    }
    await fetchLeads()
  }

  if (!session || dataLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#F5F4F0' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: TEAL, borderTopColor: 'transparent' }} />
          <span className="text-sm font-medium" style={{ color: '#9CA3AF' }}>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <DashboardShell session={session} newLeads={newLeads.length} onAddLead={() => setShowAddLead(true)} darkMode={dk} onToggleDark={toggleDark}>
      <div className="px-4 py-6" style={{ color: textMain }}>

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: textMain }}>Pipeline</h1>
            <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
              Track and manage your leads from first contact to payment.
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between mb-5 p-4 rounded-2xl bg-white border border-gray-100"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-8">
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Leads</div>
              <div className="text-2xl font-bold" style={{ color: textMain }}>{leads.length}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Pipeline Value</div>
              <div className="text-2xl font-bold" style={{ color: textMain }}>
                ${leads.filter(l => l.quoted_amount && !['Lost','Archived'].includes(l.lead_status)).reduce((s, l) => s + (l.quoted_amount || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              Filter
            </button>
            <button onClick={() => setShowAddLead(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: TEAL, color: 'white' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Lead
            </button>
          </div>
        </div>

        {/* Save error toast */}
        {saveError && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}>
            ⚠️ {saveError}
          </div>
        )}

        {/* Overdue alerts */}
        {overdue.length > 0 && (
          <div className="mb-4">
            <ActionAlert
              leads={overdue.slice(0, 3)}
              onRespond={(leadId) => {
                const el = document.getElementById(`lead-${leadId}`)
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
            />
          </div>
        )}

        {session && (
          <LeadPipeline
            leads={leads}
            onStatusChange={handleStatusChange}
            onUpdate={handleUpdate}
            isPaid={['Pro','Elite','Pro_Founding','Elite_Founding','Pro_Annual','Elite_Annual','Pro_Founding_Annual','Elite_Founding_Annual'].includes(session.plan)}
          />
        )}
      </div>

      {showAddLead && session && (
        <AddLeadModal
          proId={session.id}
          onClose={() => setShowAddLead(false)}
          onAdded={async () => {
            setShowAddLead(false)
            await fetchLeads()  // re-fetch from DB, not optimistic
          }}
        />
      )}
    </DashboardShell>
  )
}
