import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ClipboardList, Send } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import { useFormDraft } from '../../../hooks/useFormDraft'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import Badge from '../../ui/Badge'
import Select from '../../ui/Select'
import Textarea from '../../ui/Textarea'
import Spinner from '../../ui/Spinner'
import EmptyState from '../../ui/EmptyState'
import { formatDateTime } from '../../../lib/utils'
import { UPDATE_TYPES, UPDATE_TYPE_LABELS } from '../../../lib/constants'

const UPDATE_TYPE_OPTIONS = UPDATE_TYPES.map((value) => ({ value, label: UPDATE_TYPE_LABELS[value] }))

const EMPTY_FORM = { update_type: 'general_update', message: '', internal_note: '' }

export default function UpdatesTimeline({ bookingId }) {
  const { showToast } = useToast()
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const form = useForm({ defaultValues: EMPTY_FORM })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form

  const { restoreDraft, clearDraft } = useFormDraft(form, `draft:booking-update-${bookingId}`)

  useEffect(() => {
    restoreDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadUpdates = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('booking_updates')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })

    if (error) {
      showToast(error.message, 'error')
    } else {
      setUpdates(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUpdates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])

  const onSubmit = async (values) => {
    setSubmitting(true)
    const { error } = await supabase.from('booking_updates').insert({
      booking_id: bookingId,
      update_type: values.update_type,
      message: values.message.trim(),
      internal_note: values.internal_note?.trim() || null,
      created_by: 'Admin',
    })
    setSubmitting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    clearDraft()
    showToast('Update posted.')
    reset({ ...EMPTY_FORM, update_type: values.update_type })
    loadUpdates()
  }

  return (
    <Card title="Updates Timeline">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mb-5 pb-5 border-b border-gold/10">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_12rem] gap-3">
          <Textarea
            placeholder="Write an update for the client…"
            error={errors.message?.message}
            {...register('message', { required: 'Message is required' })}
          />
          <Select label="Type" options={UPDATE_TYPE_OPTIONS} {...register('update_type')} />
        </div>
        <Textarea placeholder="Internal note (admin only, optional)" {...register('internal_note')} />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={submitting}>
            <Send className="w-4 h-4" />
            {submitting ? 'Posting…' : 'Post Update'}
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner className="w-6 h-6" />
        </div>
      ) : updates.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No updates yet"
          description="Updates posted here are visible to the client in their portal."
        />
      ) : (
        <ul className="space-y-4">
          {updates.map((update) => (
            <li key={update.id}>
              <div className="flex items-center gap-2 mb-1">
                <Badge color="wine">{UPDATE_TYPE_LABELS[update.update_type] ?? update.update_type}</Badge>
                <span className="text-xs text-text-muted">{formatDateTime(update.created_at)}</span>
              </div>
              <p className="text-sm text-text-dark whitespace-pre-wrap">{update.message}</p>
              {update.internal_note && (
                <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2 mt-1.5 whitespace-pre-wrap">
                  Internal note: {update.internal_note}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
