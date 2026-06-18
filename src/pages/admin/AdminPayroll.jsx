import { useState } from 'react'
import { cn } from '../../lib/utils'
import EventPayrollTable from '../../components/admin/payroll/EventPayrollTable'
import BahayTeamLog from '../../components/admin/payroll/BahayTeamLog'

const TABS = [
  { id: 'event', label: 'Event Payroll' },
  { id: 'bahay', label: 'Bahay Team' },
]

export default function AdminPayroll() {
  const [activeTab, setActiveTab] = useState('event')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-wine">Payroll</h1>
        <p className="text-sm text-text-muted mt-1">Review event payroll reports and log bahay team pay.</p>
      </div>

      <div className="flex gap-2 border-b border-gold/20">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id ? 'border-wine text-wine' : 'border-transparent text-text-muted hover:text-wine'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'event' ? <EventPayrollTable /> : <BahayTeamLog />}
    </div>
  )
}
