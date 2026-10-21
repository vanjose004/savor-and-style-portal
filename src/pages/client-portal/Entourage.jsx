import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Crown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { WEDDING_ROLE_TEMPLATE } from '../../lib/constants'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const TEMPLATE_OPTIONS = [
  { value: '', label: 'Custom role…' },
  ...WEDDING_ROLE_TEMPLATE.map((r, i) => ({ value: String(i), label: `${r.role_group} — ${r.role_name}` })),
]

export default function Entourage() {
  const { showToast } = useToast()
  const [bookingId, setBookingId] = useState(null)
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [templateChoice, setTemplateChoice] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: { role_group: 'Core Party', role_name: '' } })

  const loadRoles = async (id) => {
    const { data } = await supabase.from('portal_event_roles').select('*').eq('booking_id', id).order('sequence')
    setRoles(data ?? [])
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data: bookingRows } = await supabase.rpc('get_my_booking_summary')
      const current = bookingRows?.[0]
      if (cancelled || !current) {
        setLoading(false)
        return
      }
      setBookingId(current.id)
      await loadRoles(current.id)
      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleTemplatePick = (index) => {
    setTemplateChoice(index)
    if (index === '') return
    const template = WEDDING_ROLE_TEMPLATE[Number(index)]
    setValue('role_group', template.role_group)
    setValue('role_name', template.role_name)
  }

  const onAdd = async (values) => {
    setSubmitting(true)
    const { error } = await supabase.from('portal_event_roles').insert({ booking_id: bookingId, ...values })
    setSubmitting(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    reset({ role_group: 'Core Party', role_name: '' })
    setTemplateChoice('')
    loadRoles(bookingId)
  }

  const toggleConfirmed = async (role) => {
    const { error } = await supabase.from('portal_event_roles').update({ confirmed: !role.confirmed }).eq('id', role.id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadRoles(bookingId)
  }

  const deleteRole = async (id) => {
    const { error } = await supabase.from('portal_event_roles').delete().eq('id', id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadRoles(bookingId)
  }

  const grouped = useMemo(() => {
    const groups = {}
    for (const role of roles) {
      groups[role.role_group] = groups[role.role_group] ?? []
      groups[role.role_group].push(role)
    }
    return groups
  }, [roles])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card title="Add to Entourage">
        <form onSubmit={handleSubmit(onAdd)} className="space-y-3">
          <Select
            label="Quick add from template"
            options={TEMPLATE_OPTIONS}
            value={templateChoice}
            onChange={(e) => handleTemplatePick(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Section" error={errors.role_group?.message} {...register('role_group', { required: true })} />
            <Input label="Role" error={errors.role_name?.message} {...register('role_name', { required: true })} />
            <Input label="Name" {...register('person_name')} />
            <Input label="Contact" {...register('contact')} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={submitting}>
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </form>
      </Card>

      {roles.length === 0 ? (
        <EmptyState icon={Crown} title="No entourage members yet" description="Add your principal sponsors, best man, maid of honor, and more." />
      ) : (
        Object.entries(grouped).map(([group, members]) => (
          <Card key={group} title={group}>
            <ul className="divide-y divide-gold/10">
              {members.map((role) => (
                <li key={role.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <input type="checkbox" checked={role.confirmed} onChange={() => toggleConfirmed(role)} className="shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-dark truncate">
                        {role.role_name}
                        {role.person_name ? ` — ${role.person_name}` : ''}
                      </p>
                      {role.contact && <p className="text-xs text-text-muted">{role.contact}</p>}
                    </div>
                  </div>
                  <button onClick={() => deleteRole(role.id)} aria-label="Remove" className="shrink-0">
                    <Trash2 className="w-4 h-4 text-danger" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  )
}
