'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Session, Lead } from '@/types'
import DashboardShell from '@/components/layout/DashboardShell'
import LeadPipeline from '@/components/ui/LeadPipeline'
import AddLeadModal from '@/components/ui/AddLeadModal'

export default function PipelinePage() {
  const router = useRouter()

  const [session] = useState<Session | null>(() => {
    if (typeof window === 'undefined') return null
    const s = sessionStorage.getItem('pg_pro')
    return s ? JSON.parse(s) : null
  })
  const [leads,       setLeads]       = useState<Lead[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [showAdd,     setShowAdd]     = useState(false)

  useEffect(() => {
    if (!session) { router.push('/login'); return }
    fetch(`/api/leads?pro_id=${session.id}`)
      .then(r => r.json())
      .then(d => { setLeads(d.leads || []); setDataLoading(false) })
      .catch(() => setDataLoading(false))
  }, [session, router])

  const newLeads = leads.filter(l => l.lead_status === 'New')
  const TEAL = '#0F766E'

  if (!session || dataLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#ECEAE5' }}>
        <div className="w-full max-w-4xl px-6 animate-pulse">
          <div className="h-6 w-32 rounded mb-6" style={{ backgroundColor: '#E0DDD8' }} />
          <div className="grid grid-cols-4 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i}>
                <div className="h-8 rounded-xl mb-2" style={{ backgroundColor: '#E0DDD8' }} />
                {[1,2].map(j => <div key={j} className="h-24 rounded-xl mb-2" style={{ backgroundColor: '#E8E5E0' }} />)}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <DashboardShell session={session} newLeads={newLeads.length} onAddLead={() => setShowAdd(true)}>
      {/* Pipeline page has white bg — high contrast for Kanban */}
      <div className="min-h-screen" style={{ backgroundColor: '#F8F7F5' }}>

        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#EEEAE4' }}>
          <div className="flex items-center gap-3">
            <h1 className="text-[16px] font-bold" style={{ color: '#0A1628' }}>Pipeline</h1>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-medium px-2 py-0.5 rounded-md"
                style={{ backgroundColor: '#F0EDE8', color: '#6B7280' }}>
                {leads.length} leads
              </span>
              {newLeads.length > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                  style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
                  {newLeads.length} new
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: TEAL, color: '#fff', boxShadow: '0 2px 6px rgba(15,118,110,0.25)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Lead
          </button>
        </div>

        {/* ── Pipeline board ───────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          {session && (
            <LeadPipeline
              leads={leads}
              onStatusChange={async (leadId, status) => {
                await fetch(`/api/leads/${leadId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ lead_status: status }),
                })
                setLeads(prev => prev.map(l =>
                  l.id === leadId ? { ...l, lead_status: status as Lead['lead_status'] } : l
                ))
              }}
              onUpdate={async (leadId, fields) => {
                await fetch(`/api/leads/${leadId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(fields),
                })
                setLeads(prev => prev.map(l =>
                  l.id === leadId ? { ...l, ...fields } : l
                ))
              }}
              isPaid={['Pro','Elite','Pro_Founding','Elite_Founding',
                       'Pro_Annual','Elite_Annual','Pro_Founding_Annual','Elite_Founding_Annual']
                       .includes(session.plan)}
            />
          )}
        </div>
      </div>

      {showAdd && session && (
        <AddLeadModal
          proId={session.id}
          onClose={() => setShowAdd(false)}
          onAdded={(lead) => {
            setShowAdd(false)
            setLeads(prev => [lead, ...prev])
          }}
        />
      )}
    </DashboardShell>
  )
}
