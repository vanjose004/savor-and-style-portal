import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Check, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { insertPayrollExpense } from '../../utils/payrollAccounting'
import PayrollSummaryCard from '../../components/payroll/PayrollSummaryCard'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Textarea from '../../components/ui/Textarea'
import Spinner from '../../components/ui/Spinner'
import StatusBadge from '../../components/ui/StatusBadge'
import Field from '../../components/ui/Field'
import { formatCurrency, formatDate } from '../../lib/utils'

export default function AdminPayrollDetail() {
  const { reportId } = useParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [expenses, setExpenses] = useState([])
  const [rejectNotes, setRejectNotes] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [acting, setActing] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data: reportData, error: reportError } = await supabase
      .from('event_payroll_reports')
      .select(
        'id, status, total_staff_pay, total_expenses, total_deduction, admin_notes, accounting_expense_id, event_id, event:bookings(event_type, event_date, booking_code, total_amount, balance), tl:staff!event_payroll_reports_submitted_by_fkey(name)'
      )
      .eq('id', reportId)
      .single()

    if (reportError) {
      showToast(reportError.message, 'error')
      setLoading(false)
      return
    }
    setReport(reportData)

    const [attendanceRes, expensesRes] = await Promise.all([
      supabase.from('event_staff_attendance').select('*, staff(name)').eq('report_id', reportId),
      supabase.from('event_expenses').select('*').eq('report_id', reportId),
    ])

    if (!attendanceRes.error) {
      setAttendance(
        (attendanceRes.data ?? []).map((row) => ({ ...row, staffName: row.staff?.name ?? 'Staff' }))
      )
    }
    if (!expensesRes.error) setExpenses(expensesRes.data ?? [])

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId])

  const handleApprove = async () => {
    setActing(true)

    const { error: updateError } = await supabase
      .from('event_payroll_reports')
      .update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() })
      .eq('id', reportId)

    if (updateError) {
      showToast(updateError.message, 'error')
      setActing(false)
      return
    }

    try {
      const expenseCode = await insertPayrollExpense({
        eventName: report.event?.event_type ?? 'Event',
        eventDate: report.event?.event_date ?? new Date().toISOString().slice(0, 10),
        bookingRef: report.event?.booking_code ?? null,
        totalAmount: report.total_deduction,
      })
      await supabase.from('event_payroll_reports').update({ accounting_expense_id: expenseCode }).eq('id', reportId)
    } catch (err) {
      showToast(`Approved, but accounting sync failed: ${err.message}`, 'error')
    }

    setActing(false)
    showToast('Payroll report approved.')
    load()
  }

  const handleReject = async () => {
    if (!rejectNotes.trim()) {
      showToast('Add a note explaining the rejection.', 'error')
      return
    }

    setActing(true)
    const { error } = await supabase
      .from('event_payroll_reports')
      .update({ status: 'rejected', admin_notes: rejectNotes.trim() })
      .eq('id', reportId)
    setActing(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast('Payroll report rejected.')
    setShowRejectForm(false)
    load()
  }

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
    <div className="space-y-4 max-w-3xl">
      <Link to="/admin/payroll" className="inline-flex items-center gap-1 text-sm text-wine hover:underline">
        <ArrowLeft className="w-4 h-4" />
        Back to payroll
      </Link>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-wine">{report.event?.event_type ?? 'Event'}</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {report.event?.event_date ? formatDate(report.event.event_date) : ''} · {report.event?.booking_code}
          </p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <Card title="Event Info">
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <Field label="Team Leader" value={report.tl?.name ?? '—'} />
          <Field label="Client Total" value={formatCurrency(report.event?.total_amount)} />
          <Field label="Client Balance" value={formatCurrency(report.event?.balance)} />
        </dl>
      </Card>

      <PayrollSummaryCard
        attendance={attendance}
        expenses={expenses}
        totals={{
          total_staff_pay: report.total_staff_pay,
          total_expenses: report.total_expenses,
          total_deduction: report.total_deduction,
        }}
      />

      {report.accounting_expense_id && (
        <p className="text-xs text-text-muted">Synced to accounting as {report.accounting_expense_id}</p>
      )}

      {report.status === 'pending' && (
        <Card>
          {showRejectForm ? (
            <div className="space-y-3">
              <Textarea
                label="Rejection notes"
                placeholder="Explain what needs to change…"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
              />
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowRejectForm(false)} disabled={acting}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleReject} disabled={acting}>
                  {acting ? 'Rejecting…' : 'Confirm Reject'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              <Button variant="danger" onClick={() => setShowRejectForm(true)} disabled={acting}>
                <X className="w-4 h-4" /> Reject
              </Button>
              <Button onClick={handleApprove} disabled={acting}>
                <Check className="w-4 h-4" /> {acting ? 'Approving…' : 'Approve'}
              </Button>
            </div>
          )}
        </Card>
      )}

      {report.status === 'rejected' && report.admin_notes && (
        <Card title="Rejection Notes" className="border-danger/30">
          <p className="text-sm text-text-dark whitespace-pre-wrap">{report.admin_notes}</p>
        </Card>
      )}
    </div>
  )
}
