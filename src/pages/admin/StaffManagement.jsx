import { useEffect, useState } from 'react'
import { ChefHat, Plus, Pencil, Trash2, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import StaffFormModal from '../../components/admin/staff/StaffFormModal'
import GenerateCOEModal from '../../components/admin/staff/GenerateCOEModal'
import { STAFF_ROLE_LABELS } from '../../lib/constants'

export default function StaffManagement() {
  const { showToast } = useToast()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [formTarget, setFormTarget] = useState(undefined)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [coeTarget, setCoeTarget] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('staff').select('*').order('name')
    if (error) {
      showToast(error.message, 'error')
    } else {
      setStaff(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggleActive = async (member) => {
    const { error } = await supabase.from('staff').update({ is_active: !member.is_active }).eq('id', member.id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, is_active: !member.is_active } : s)))
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('staff').delete().eq('id', deleteTarget.id)
    setDeleting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    setStaff((prev) => prev.filter((s) => s.id !== deleteTarget.id))
    setDeleteTarget(null)
    showToast('Staff member removed.')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-wine">Staff</h1>
          <p className="text-sm text-text-muted mt-1">Manage your team and their login access.</p>
        </div>
        <Button onClick={() => setFormTarget(null)}>
          <Plus className="w-4 h-4" /> Add Staff
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="w-8 h-8" />
        </div>
      ) : staff.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          title="No staff yet"
          description="Add your team members so you can assign them to events."
          action={
            <Button onClick={() => setFormTarget(null)}>
              <Plus className="w-4 h-4" /> Add Staff
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staff.map((member) => (
            <Card key={member.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-text-dark truncate">{member.name}</h3>
                  <p className="text-sm text-text-muted">{STAFF_ROLE_LABELS[member.role] ?? member.role}</p>
                </div>
                <Badge color={member.is_active ? 'success' : 'default'}>
                  {member.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="text-sm text-text-muted space-y-0.5">
                {member.phone && <p>{member.phone}</p>}
                {member.email && <p>{member.email}</p>}
              </div>

              <div className="flex items-center gap-2 pt-3 mt-1 border-t border-gold/10">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleToggleActive(member)}>
                  {member.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label={`Generate COE for ${member.name}`}
                  onClick={() => setCoeTarget(member)}
                >
                  <FileText className="w-4 h-4" /> COE
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Edit ${member.name}`}
                  onClick={() => setFormTarget(member)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:bg-danger/10"
                  aria-label={`Remove ${member.name}`}
                  onClick={() => setDeleteTarget(member)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <StaffFormModal
        open={formTarget !== undefined}
        onClose={() => setFormTarget(undefined)}
        staff={formTarget}
        onSaved={load}
      />

      <GenerateCOEModal open={!!coeTarget} onClose={() => setCoeTarget(null)} staff={coeTarget} />

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Staff Member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Removing…' : 'Remove'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-dark">
          Are you sure you want to remove <strong>{deleteTarget?.name}</strong>? They will be removed from all
          event assignments. Their login account is not deleted automatically.
        </p>
      </Modal>
    </div>
  )
}
