import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../ui/Card'
import Select from '../../ui/Select'
import Spinner from '../../ui/Spinner'
import EmptyState from '../../ui/EmptyState'
import StatusBadge from '../../ui/StatusBadge'
import { formatCurrency, formatDate } from '../../../lib/utils'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export default function EventPayrollTable() {
  const { showToast } = useToast()
  const [reports, setReports] = useState([])
  const [staffCounts, setStaffCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('event_payroll_reports')
        .select(
          'id, status, total_staff_pay, total_expenses, total_deduction, submitted_at, event:bookings(event_type, event_date, booking_code), tl:staff!event_payroll_reports_submitted_by_fkey(name)'
        )
        .order('submitted_at', { ascending: false })

      if (cancelled) return

      if (error) {
        showToast(error.message, 'error')
        setLoading(false)
        return
      }

      setReports(data ?? [])

      const reportIds = (data ?? []).map((r) => r.id)
      if (reportIds.length > 0) {
        const { data: attendanceRows } = await supabase
          .from('event_staff_attendance')
          .select('report_id')
          .in('report_id', reportIds)

        const counts = {}
        for (const row of attendanceRows ?? []) {
          counts[row.report_id] = (counts[row.report_id] ?? 0) + 1
        }
        if (!cancelled) setStaffCounts(counts)
      }

      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [showToast])

  const filtered = statusFilter === 'all' ? reports : reports.filter((r) => r.status === statusFilter)

  return (
    <Card>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <h3 className="text-lg font-semibold text-wine">Event Payroll Reports</h3>
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-44"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="w-6 h-6" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No reports" description="No payroll reports match this filter." />
      ) : (
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-text-muted border-b border-gold/10">
                <th className="px-6 py-2">Event</th>
                <th className="px-6 py-2">Date</th>
                <th className="px-6 py-2">TL</th>
                <th className="px-6 py-2 text-right">Staff</th>
                <th className="px-6 py-2 text-right">Total Pay</th>
                <th className="px-6 py-2 text-right">Expenses</th>
                <th className="px-6 py-2 text-right">Deduction</th>
                <th className="px-6 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((report) => (
                <tr key={report.id} className="border-b border-gold/10 last:border-0 hover:bg-cream/60">
                  <td className="px-6 py-3">
                    <Link to={`/admin/payroll/${report.id}`} className="font-medium text-wine hover:underline">
                      {report.event?.event_type ?? '—'}
                    </Link>
                    <p className="text-xs text-text-muted">{report.event?.booking_code}</p>
                  </td>
                  <td className="px-6 py-3">{report.event?.event_date ? formatDate(report.event.event_date) : '—'}</td>
                  <td className="px-6 py-3">{report.tl?.name ?? '—'}</td>
                  <td className="px-6 py-3 text-right">{staffCounts[report.id] ?? 0}</td>
                  <td className="px-6 py-3 text-right">{formatCurrency(report.total_staff_pay)}</td>
                  <td className="px-6 py-3 text-right">{formatCurrency(report.total_expenses)}</td>
                  <td className="px-6 py-3 text-right font-medium">{formatCurrency(report.total_deduction)}</td>
                  <td className="px-6 py-3">
                    <StatusBadge status={report.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
