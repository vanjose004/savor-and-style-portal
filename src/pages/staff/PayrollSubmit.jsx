import { useEffect, useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { useStaffProfile } from '../../hooks/useStaffProfile'
import {
  effectiveRoleLabel,
  isTeamLeaderAssignment,
  toCanonicalPayrollRole,
} from '../../utils/payrollHelpers'
import { getBaseRate, getOtPay } from '../../config/payrollRates'
import AttendanceStep from '../../components/staff/payroll/AttendanceStep'
import ExpensesStep from '../../components/staff/payroll/ExpensesStep'
import PayrollSummaryCard from '../../components/payroll/PayrollSummaryCard'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { formatDate } from '../../lib/utils'

const STEPS = ['Attendance', 'Expenses', 'Review & Submit']

export default function PayrollSubmit() {
  const { eventId } = useParams()
  const { user } = useAuth()
  const { loading: profileLoading } = useStaffProfile()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState(null)
  const [existingReportId, setExistingReportId] = useState(null)
  const [isTeamLeader, setIsTeamLeader] = useState(false)
  const [step, setStep] = useState(0)
  const [attendanceRows, setAttendanceRows] = useState([])
  const [expenseRows, setExpenseRows] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (profileLoading || !user) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const [eventRes, rosterRes, reportRes] = await Promise.all([
        supabase.from('staff_event_bookings').select('*').eq('id', eventId).single(),
        supabase.from('event_team_roster').select('*').eq('event_id', eventId),
        supabase.from('event_payroll_reports').select('id').eq('event_id', eventId).maybeSingle(),
      ])

      if (cancelled) return

      if (eventRes.error) {
        showToast(eventRes.error.message, 'error')
        setLoading(false)
        return
      }
      setEvent(eventRes.data)

      if (reportRes.data) {
        setExistingReportId(reportRes.data.id)
        setLoading(false)
        return
      }

      const roster = rosterRes.data ?? []
      const selfRow = roster.find((row) => row.staff_id === user.id)
      const selfIsTL = selfRow ? isTeamLeaderAssignment(selfRow.role_for_event, selfRow.role) : false
      setIsTeamLeader(selfIsTL)

      setAttendanceRows(
        roster.map((row) => ({
          staffId: row.staff_id,
          name: row.name,
          present: true,
          roleAtEvent: toCanonicalPayrollRole(effectiveRoleLabel(row.role_for_event, row.role)),
          otHours: 0,
          rateOverride: row.rate_override,
        }))
      )

      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [eventId, profileLoading, user, showToast])

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (existingReportId) {
    return <Navigate to={`/staff/payroll/report/${existingReportId}`} replace />
  }

  if (!event) {
    return <p className="text-sm text-text-muted">Event not found.</p>
  }

  if (!isTeamLeader) {
    return (
      <EmptyState
        title="Not available"
        description="Only the team leader assigned to this event can submit its payroll report."
      />
    )
  }

  const presentRows = attendanceRows.filter((row) => row.present)
  const totalStaffPay = presentRows.reduce((sum, row) => {
    const base = getBaseRate(row.roleAtEvent, row.rateOverride)
    const ot = getOtPay(row.roleAtEvent, row.otHours)
    return sum + base + ot
  }, 0)
  const totalExpenses = expenseRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const totalDeduction = totalStaffPay + totalExpenses

  const summaryAttendance = presentRows.map((row) => {
    const base = getBaseRate(row.roleAtEvent, row.rateOverride)
    const ot = getOtPay(row.roleAtEvent, row.otHours)
    return {
      id: row.staffId,
      staffName: row.name,
      role_at_event: row.roleAtEvent,
      ot_hours: Number(row.otHours) || 0,
      total_pay: base + ot,
    }
  })
  const summaryExpenses = expenseRows.map((row) => ({
    id: row.key,
    description: row.description || '(no description)',
    amount: Number(row.amount) || 0,
  }))

  const handleSubmit = async () => {
    setSubmitting(true)

    const { data: report, error: reportError } = await supabase
      .from('event_payroll_reports')
      .insert({
        event_id: eventId,
        submitted_by: user.id,
        total_staff_pay: totalStaffPay,
        total_expenses: totalExpenses,
        total_deduction: totalDeduction,
      })
      .select('id')
      .single()

    if (reportError) {
      showToast(reportError.message, 'error')
      setSubmitting(false)
      return
    }

    if (presentRows.length > 0) {
      const { error: attendanceError } = await supabase.from('event_staff_attendance').insert(
        presentRows.map((row) => {
          const base = getBaseRate(row.roleAtEvent, row.rateOverride)
          const ot = getOtPay(row.roleAtEvent, row.otHours)
          return {
            report_id: report.id,
            event_id: eventId,
            staff_id: row.staffId,
            role_at_event: row.roleAtEvent,
            base_rate: base,
            ot_hours: Number(row.otHours) || 0,
            ot_pay: ot,
            total_pay: base + ot,
          }
        })
      )

      if (attendanceError) {
        showToast(attendanceError.message, 'error')
        setSubmitting(false)
        return
      }
    }

    const validExpenses = expenseRows.filter((row) => row.description.trim() && Number(row.amount) > 0)
    if (validExpenses.length > 0) {
      const { error: expensesError } = await supabase.from('event_expenses').insert(
        validExpenses.map((row) => ({
          report_id: report.id,
          event_id: eventId,
          submitted_by: user.id,
          description: row.description.trim(),
          amount: Number(row.amount),
          photo_url: row.photoUrl?.trim() || null,
        }))
      )

      if (expensesError) {
        showToast(expensesError.message, 'error')
        setSubmitting(false)
        return
      }
    }

    showToast('Payroll report submitted.')
    navigate(`/staff/payroll/report/${report.id}`)
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => (step === 0 ? navigate('/staff/payroll') : setStep(step - 1))}
        className="inline-flex items-center gap-1 text-sm text-wine hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        {step === 0 ? 'Back to payroll' : 'Back'}
      </button>

      <div>
        <h1 className="font-heading text-2xl font-bold text-wine">{event.event_type}</h1>
        <p className="text-sm text-text-muted mt-0.5">{formatDate(event.event_date)}</p>
      </div>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted text-center">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>
      </Card>

      {step === 0 && <AttendanceStep rows={attendanceRows} onChange={setAttendanceRows} />}
      {step === 1 && <ExpensesStep rows={expenseRows} onChange={setExpenseRows} />}
      {step === 2 && (
        <PayrollSummaryCard
          attendance={summaryAttendance}
          expenses={summaryExpenses}
          totals={{ total_staff_pay: totalStaffPay, total_expenses: totalExpenses, total_deduction: totalDeduction }}
        />
      )}

      <div className="flex justify-end gap-3">
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Report'}
          </Button>
        )}
      </div>
    </div>
  )
}
