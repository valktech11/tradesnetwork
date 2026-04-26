'use client'

// StatStrip — display only, no click navigation.
// Explicit "View →" links live on each section header instead.

interface StatStripProps {
  totalLeads: number
  newLeads: number
  avgRating: number
  reviewCount: number
  pipelineValue: number
  loading: boolean
}

export default function StatStrip({
  totalLeads,
  newLeads,
  avgRating,
  reviewCount,
  pipelineValue,
  loading,
}: StatStripProps) {
  const stats = [
    {
      label: 'Total leads',
      value: loading ? '—' : totalLeads.toString(),
      sub: 'all time',
      highlight: false,
    },
    {
      label: 'New leads',
      value: loading ? '—' : newLeads.toString(),
      sub: 'uncontacted',
      highlight: newLeads > 0,
    },
    {
      label: 'Pipeline',
      value: loading ? '—' : pipelineValue > 0 ? `$${pipelineValue.toLocaleString()}` : '$0',
      sub: 'quoted value',
      highlight: false,
    },
    {
      label: 'Avg rating',
      value: loading ? '—' : avgRating > 0 ? `${avgRating.toFixed(1)} ★` : '—',
      sub: reviewCount > 0
        ? `${reviewCount} review${reviewCount !== 1 ? 's' : ''}`
        : 'no reviews yet',
      highlight: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {stats.map(s => (
        <div
          key={s.label}
          className={`rounded-2xl p-4 border ${
            s.highlight
              ? 'border-amber-300 bg-amber-50/40'
              : 'bg-white border-gray-100'
          }`}
        >
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
            {s.label}
          </div>
          <div className={`font-serif text-3xl mb-1 ${s.highlight ? 'text-amber-600' : 'text-teal-600'}`}>
            {s.value}
          </div>
          <div className="text-xs text-gray-400">{s.sub}</div>
        </div>
      ))}
    </div>
  )
}
