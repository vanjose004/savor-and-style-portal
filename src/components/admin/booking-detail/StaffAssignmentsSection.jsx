import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { UserPlus, X, Users } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import Select from '../../ui/Select'
import Input from '../../ui/Input'
import Spinner from '../../ui/Spinner'
import EmptyState from '../../ui/EmptyState'
import { STAFF_ROLE_LABELS } from '../../../lib/constants'

export default function StaffAssignmentsSection({ bookingId }) {
  const { showToast } = useToast()
  const [assignments, setAssignments] = useState([])
  const [staffOptions, setStaffOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const { register, handleSubmit, reset } = useForm({ defaultValues: { staff_id: '', role_for_event: '' } })

  const load = async () => {
    setLoading(true)
    const [assignmentsRes, staffRes] = await Promise.all([
      supabase
        .from('event_assignments')
        .select('id, role_for_event, staff_id, staff(id, name, role)')
        .eq('booking_id', bookingId),
      supabase.from('staff').select('id, name, role').eq('is_active', true).order('name'),
    ])

    if (assignmentsRes.error) {
      showToast(assignmentsRes.error.message, 'error')
    } else {
      setAssignments(assignmentsRes.data ?? [])
    }

    if (staffRes.error) {
      showToast(staffRes.error.message, 'error')
    } else {
      setStaffOptions(staffRes.data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])

  const assignedIds = new Set(assignments.map((a) => a.staff_id))
  const availableStaff = staffOptions.filter((s) => !assignedIds.has(s.id))

  const onAdd = async (values) => {
    if (!values.staff_id) return
    setAdding(true)
    const { error } = await supabase.from('event_assignments').insert({
      booking_id: bookingId,
      staff_id: values.staff_id,
      role_for_event: values.role_for_event?.trim() || null,
    })
    setAdding(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    reset({ staff_id: '', role_for_event: '' })
    load()
  }

  const handleRemove = async (assignment) => {
    setRemovingId(assignment.id)
    const { error } = await supabase.from('event_assignments').delete().eq('id', assignment.id)
    setRemovingId(null)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    setAssignments((prev) => prev.filter((a) => a.id !== assignment.id))
  }

  return (
    <Card title="Staff Assignments">
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner className="w-6 h-6" />
        </div>
      ) : (
        <>
          {assignments.length === 0 ? (
            <EmptyState icon={Users} title="No staff assigned" description="Assign staff for this event below." />
          ) : (
            <ul className="divide-y divide-gold/10 mb-4">
              {assignments.map((assignment) => (
                <li key={assignment.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-dark">{assignment.staff?.name}</p>
                    <p className="text-xs text-text-muted">
                      {assignment.role_for_event || STAFF_ROLE_LABELS[assignment.staff?.role] || assignment.staff?.role}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger/10 shrink-0"
                    disabled={removingId === assignment.id}
                    onClick={() => handleRemove(assignment)}
                    aria-label={`Remove ${assignment.staff?.name}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {availableStaff.length > 0 && (
            <form onSubmit={handleSubmit(onAdd)} className="space-y-2 pt-3 border-t border-gold/10">
              <Select
                options={availableStaff.map((s) => ({ value: s.id, label: `${s.name} (${STAFF_ROLE_LABELS[s.role] ?? s.role})` }))}
                placeholder="Select staff…"
                {...register('staff_id', { required: true })}
              />
              <Input placeholder="Role for this event (optional)" {...register('role_for_event')} />
              <Button type="submit" size="sm" className="w-full" disabled={adding}>
                <UserPlus className="w-4 h-4" />
                {adding ? 'Adding…' : 'Add Staff'}
              </Button>
            </form>
          )}
        </>
      )}
    </Card>
  )
}
