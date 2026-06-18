import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import PayrollSummaryCard from '../../components/payroll/PayrollSummaryCard'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import StatusBadge from '../../components/ui/StatusBadge'
import { formatDate } from '../../lib/utils'

export default function PayrollReport() {
  const { reportId } = useParams()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)
  const [event, setEvent] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [expenses, setExpenses] = useState([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data: reportData, error: reportError } = await supabase
        .from('event_payroll_reports')
        .select('*')
        .eq('id', reportId)
        .single()

      if (cancelled) return

      if (reportError) {
        showToast(reportError.message, 'error')
        setLoading(false)
        return
      }
      setReport(reportData)

      const [eventRes, attendanceRes, expensesRes, rosterRes] = await Promise.all([
        supabase.from('staff_event_bookings').select('*').eq('id', reportData.event_id).maybeSingle(),
        supabase.from('event_staff_attendance').select('*').eq('report_id', reportId),
        supabase.from('event_expenses').select('*').eq('report_id', reportId),
        // staff_event_bookings/staff RLS only exposes a staff member's own row, so
        // teammates' names come from event_team_roster instead — it runs as the
        // view owner and is scoped to staff sharing this event.
        supabase.from('event_team_roster').select('staff_id, name').eq('event_id', reportData.event_id),
      ])

      if (cancelled) return

      if (!eventRes.error) setEvent(eventRes.data)

      const nameByStaffId = Object.fromEntries((rosterRes.data ?? []).map((row) => [row.staff_id, row.name]))

      if (!attendanceRes.error) {
        setAttendance(
          (attendanceRes.data ?? []).map((row) => ({ ...row, staffName: nameByStaffId[row.staff_id] ?? 'Staff' }))
        )
      }
      if (!expensesRes.error) setExpenses(expensesRes.data ?? [])

      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [reportId, showToast])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!report) {
    return <p className="text-sm text-text-muted">Report not found.</p>
  }

  return (
    <div className="space-y-4">
      <Link to="/staff/payroll" className="inline-flex items-center gap-1 text-sm text-wine hover:underline">
        <ArrowLeft className="w-4 h-4" />
        Back to payroll
      </Link>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-wine">{event?.event_type ?? 'Event'}</h1>
          {event?.event_date && <p className="text-sm text-text-muted mt-0.5">{formatDate(event.event_date)}</p>}
        </div>
        <StatusBadge status={report.status} />
      </div>

      {report.status === 'rejected' && report.admin_notes && (
        <Card title="Admin Notes" className="border-danger/30">
          <p className="text-sm text-text-dark whitespace-pre-wrap">{report.admin_notes}</p>
        </Card>
      )}

      <PayrollSummaryCard
        attendance={attendance}
        expenses={expenses}
        totals={{
          total_staff_pay: report.total_staff_pay,
          total_expenses: report.total_expenses,
          total_deduction: report.total_deduction,
        }}
      />
    </div>
  )
}
