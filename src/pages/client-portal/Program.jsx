import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, ArrowUp, ArrowDown, ListOrdered, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { formatTime } from '../../lib/utils'
import { WEDDING_PROGRAM_TEMPLATE, PORTAL_PROGRAM_RESPONSIBLE, PORTAL_PROGRAM_RESPONSIBLE_LABELS } from '../../lib/constants'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + minutes
  const hh = String(Math.floor(((total % 1440) + 1440) % 1440 / 60)).padStart(2, '0')
  const mm = String(((total % 60) + 60) % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

export default function Program() {
  const { showToast } = useToast()
  const [bookingId, setBookingId] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { responsible: 'client', duration_min: 10 } })

  const loadItems = async (id) => {
    const { data } = await supabase.from('portal_program_items').select('*').eq('booking_id', id).order('sort')
    setItems(data ?? [])
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
      await loadItems(current.id)
      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const onAdd = async (values) => {
    setSubmitting(true)
    const { error } = await supabase.from('portal_program_items').insert({
      booking_id: bookingId,
      segment: values.segment,
      duration_min: values.duration_min || 10,
      start_time: values.start_time || null,
      responsible: values.responsible,
      sort: items.length,
    })
    setSubmitting(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    reset({ responsible: 'client', duration_min: 10 })
    loadItems(bookingId)
  }

  const loadTemplate = async () => {
    let cursor = '17:00'
    const rows = WEDDING_PROGRAM_TEMPLATE.map((segment, index) => {
      const row = { booking_id: bookingId, segment: segment.segment, duration_min: segment.duration_min, start_time: cursor, sort: items.length + index }
      cursor = addMinutes(cursor, segment.duration_min)
      return row
    })
    const { error } = await supabase.from('portal_program_items').insert(rows)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    showToast('Wedding reception template added — adjust times as needed.')
    loadItems(bookingId)
  }

  const move = async (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= items.length) return
    const a = items[index]
    const b = items[targetIndex]
    if (b.approved) return
    await Promise.all([
      supabase.from('portal_program_items').update({ sort: b.sort }).eq('id', a.id),
      supabase.from('portal_program_items').update({ sort: a.sort }).eq('id', b.id),
    ])
    loadItems(bookingId)
  }

  const deleteItem = async (id) => {
    const { error } = await supabase.from('portal_program_items').delete().eq('id', id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadItems(bookingId)
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
      <Card title="Program / Rundown">
        {items.length === 0 && (
          <Button variant="secondary" size="sm" onClick={loadTemplate} className="mb-4">
            <Sparkles className="w-4 h-4" />
            Load Wedding Reception Template
          </Button>
        )}

        <form onSubmit={handleSubmit(onAdd)} className="grid grid-cols-2 gap-3 mb-4">
          <Input
            placeholder="Segment"
            className="col-span-2"
            error={errors.segment?.message}
            {...register('segment', { required: 'Enter a segment' })}
          />
          <Input type="time" label="Start time" {...register('start_time')} />
          <Input type="number" label="Duration (min)" {...register('duration_min')} />
          <Select
            className="col-span-2"
            options={PORTAL_PROGRAM_RESPONSIBLE.map((v) => ({ value: v, label: PORTAL_PROGRAM_RESPONSIBLE_LABELS[v] }))}
            {...register('responsible')}
          />
          <div className="col-span-2 flex justify-end">
            <Button type="submit" size="sm" disabled={submitting}>
              <Plus className="w-4 h-4" />
              Add Segment
            </Button>
          </div>
        </form>

        {items.length === 0 ? (
          <EmptyState icon={ListOrdered} title="No program yet" description="Load the reception template above, or add your own segments." />
        ) : (
          <ul className="divide-y divide-gold/10">
            {items.map((item, index) => (
              <li key={item.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-dark truncate">
                    {item.start_time ? `${formatTime(item.start_time)} · ` : ''}
                    {item.segment}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-text-muted">{item.duration_min} min</span>
                    <Badge color="gold">{PORTAL_PROGRAM_RESPONSIBLE_LABELS[item.responsible]}</Badge>
                    {item.approved && <Badge color="success">Approved</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!item.approved && (
                    <>
                      <button onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
                        <ArrowUp className="w-4 h-4 text-text-muted disabled:opacity-30" />
                      </button>
                      <button onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Move down">
                        <ArrowDown className="w-4 h-4 text-text-muted disabled:opacity-30" />
                      </button>
                      <button onClick={() => deleteItem(item.id)} aria-label="Remove segment">
                        <Trash2 className="w-4 h-4 text-danger" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
