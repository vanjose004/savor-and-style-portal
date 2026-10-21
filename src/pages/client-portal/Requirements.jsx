import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, FileCheck, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { WEDDING_REQUIREMENTS_TEMPLATES, PORTAL_REQUIREMENT_STATUSES, PORTAL_REQUIREMENT_STATUS_LABELS } from '../../lib/constants'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function Requirements() {
  const { showToast } = useToast()
  const [bookingId, setBookingId] = useState(null)
  const [requirements, setRequirements] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  const loadRequirements = async (id) => {
    const { data } = await supabase.from('portal_requirements').select('*').eq('booking_id', id).order('sort')
    setRequirements(data ?? [])
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
      await loadRequirements(current.id)
      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const loadTemplate = async (variant) => {
    const template = WEDDING_REQUIREMENTS_TEMPLATES[variant]
    const rows = template.map((item, index) => ({
      booking_id: bookingId,
      title: item.title,
      where_to_get: item.where_to_get,
      sort: requirements.length + index,
    }))
    const { error } = await supabase.from('portal_requirements').insert(rows)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadRequirements(bookingId)
  }

  const onAdd = async (values) => {
    setSubmitting(true)
    const { error } = await supabase.from('portal_requirements').insert({ booking_id: bookingId, ...values, sort: requirements.length })
    setSubmitting(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    reset()
    loadRequirements(bookingId)
  }

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('portal_requirements').update({ status }).eq('id', id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadRequirements(bookingId)
  }

  const uploadFile = async (requirement, file) => {
    const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
    const path = `${bookingId}/${crypto.randomUUID()}${ext}`
    const { error: uploadError } = await supabase.storage.from('portal-requirements').upload(path, file)
    if (uploadError) {
      showToast(uploadError.message, 'error')
      return
    }
    await supabase.from('portal_requirements').update({ file_path: path, status: 'submitted' }).eq('id', requirement.id)
    loadRequirements(bookingId)
  }

  const viewFile = async (path) => {
    const { data, error } = await supabase.storage.from('portal-requirements').createSignedUrl(path, 300)
    if (error || !data) {
      showToast('Could not open this file.', 'error')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const deleteRequirement = async (id) => {
    const { error } = await supabase.from('portal_requirements').delete().eq('id', id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadRequirements(bookingId)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card title="Requirements Tracker">
        <p className="text-xs text-text-muted mb-4">
          Requirements vary per parish and LGU. Please confirm with your parish office / Local Civil Registrar.
        </p>

        {requirements.length === 0 && (
          <div className="flex gap-2 mb-4">
            <Button size="sm" variant="secondary" onClick={() => loadTemplate('church')}>
              Load Church Wedding Checklist
            </Button>
            <Button size="sm" variant="secondary" onClick={() => loadTemplate('civil')}>
              Load Civil Wedding Checklist
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit(onAdd)} className="grid grid-cols-2 gap-2 mb-4">
          <Input
            placeholder="Requirement"
            className="col-span-2"
            error={errors.title?.message}
            {...register('title', { required: 'Enter a requirement' })}
          />
          <Input placeholder="Where to get it" className="col-span-2" {...register('where_to_get')} />
          <Button type="submit" size="sm" disabled={submitting} className="col-span-2 justify-self-end">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </form>

        {requirements.length === 0 ? (
          <EmptyState icon={FileCheck} title="No requirements yet" description="Load a checklist above, or add your own." />
        ) : (
          <ul className="divide-y divide-gold/10">
            {requirements.map((req) => (
              <li key={req.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-dark truncate">{req.title}</p>
                    {req.where_to_get && <p className="text-xs text-text-muted">{req.where_to_get}</p>}
                  </div>
                  <button onClick={() => deleteRequirement(req.id)} aria-label="Remove">
                    <Trash2 className="w-4 h-4 text-danger shrink-0" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Select
                    className="text-xs w-40"
                    options={PORTAL_REQUIREMENT_STATUSES.map((s) => ({ value: s, label: PORTAL_REQUIREMENT_STATUS_LABELS[s] }))}
                    value={req.status}
                    onChange={(e) => updateStatus(req.id, e.target.value)}
                  />
                  {req.file_path ? (
                    <Button size="sm" variant="ghost" onClick={() => viewFile(req.file_path)}>
                      View File
                    </Button>
                  ) : (
                    <label className="text-xs text-wine cursor-pointer flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" />
                      Upload
                      <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(req, e.target.files[0])} />
                    </label>
                  )}
                  {req.status === 'done' && <Badge color="success">Done</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
