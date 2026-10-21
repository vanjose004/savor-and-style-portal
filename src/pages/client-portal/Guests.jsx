import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Users, Download, ClipboardPaste } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { PORTAL_GUEST_SIDE_GROUPS, PORTAL_GUEST_RSVP_STATUSES, PORTAL_GUEST_RSVP_LABELS } from '../../lib/constants'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Textarea from '../../components/ui/Textarea'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const RSVP_BADGE_COLOR = {
  not_invited: 'default',
  invited: 'gold',
  confirmed: 'success',
  declined: 'danger',
  maybe: 'warning',
}

function exportGuestsCSV(guests) {
  const header = ['Full Name', 'Side', 'Relationship', 'Phone', 'RSVP Status', 'Meal Preference', 'Plus One', 'Notes']
  const rows = guests.map((g) => [
    g.full_name,
    g.side_group,
    g.relationship ?? '',
    g.phone ?? '',
    PORTAL_GUEST_RSVP_LABELS[g.rsvp_status] ?? g.rsvp_status,
    g.meal_pref ?? '',
    g.plus_one_name ?? '',
    g.notes ?? '',
  ])
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'guest-list.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export default function Guests() {
  const { showToast } = useToast()
  const [bookingId, setBookingId] = useState(null)
  const [pax, setPax] = useState(null)
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBulkAdd, setShowBulkAdd] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { side_group: 'Others' } })

  const loadGuests = async (id) => {
    const { data } = await supabase
      .from('portal_guests')
      .select('*')
      .eq('booking_id', id)
      .order('full_name')
    setGuests(data ?? [])
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
      setPax(current.pax)
      await loadGuests(current.id)
      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const onAddOne = async (values) => {
    setSubmitting(true)
    const { error } = await supabase.from('portal_guests').insert({ booking_id: bookingId, ...values })
    setSubmitting(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    reset({ side_group: 'Others' })
    showToast('Guest added.')
    loadGuests(bookingId)
  }

  const onBulkAdd = async () => {
    const names = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (names.length === 0) return

    setSubmitting(true)
    const { error } = await supabase
      .from('portal_guests')
      .insert(names.map((full_name) => ({ booking_id: bookingId, full_name, side_group: 'Others' })))
    setSubmitting(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setBulkText('')
    setShowBulkAdd(false)
    showToast(`Added ${names.length} guest${names.length > 1 ? 's' : ''}.`)
    loadGuests(bookingId)
  }

  const updateRsvp = async (guestId, rsvp_status) => {
    const { error } = await supabase.from('portal_guests').update({ rsvp_status }).eq('id', guestId)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadGuests(bookingId)
  }

  const deleteGuest = async (guestId) => {
    const { error } = await supabase.from('portal_guests').delete().eq('id', guestId)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadGuests(bookingId)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  const confirmedCount = guests.filter((g) => g.rsvp_status === 'confirmed').length
  const overPax = pax && confirmedCount > pax

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-heading font-bold text-lg text-wine">Guest List</h2>
          <Button variant="secondary" size="sm" onClick={() => exportGuestsCSV(guests)} disabled={guests.length === 0}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          <div>
            <p className="text-lg font-bold text-text-dark">{guests.length}</p>
            <p className="text-xs text-text-muted">Total</p>
          </div>
          <div>
            <p className="text-lg font-bold text-success">{confirmedCount}</p>
            <p className="text-xs text-text-muted">Confirmed</p>
          </div>
          <div>
            <p className="text-lg font-bold text-text-dark">{pax ?? '—'}</p>
            <p className="text-xs text-text-muted">Package pax</p>
          </div>
        </div>

        {overPax && (
          <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2 mb-4">
            You have {confirmedCount} confirmed guests; your package covers {pax} pax. Extra guests may incur
            additional charges — message your coordinator to confirm.
          </p>
        )}

        <form onSubmit={handleSubmit(onAddOne)} className="grid grid-cols-2 gap-3 mb-3">
          <Input
            placeholder="Full name"
            className="col-span-2"
            error={errors.full_name?.message}
            {...register('full_name', { required: 'Name is required' })}
          />
          <Select options={PORTAL_GUEST_SIDE_GROUPS} {...register('side_group')} />
          <Input placeholder="Relationship (optional)" {...register('relationship')} />
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowBulkAdd((v) => !v)}>
              <ClipboardPaste className="w-4 h-4" />
              Paste List
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              <Plus className="w-4 h-4" />
              Add Guest
            </Button>
          </div>
        </form>

        {showBulkAdd && (
          <div className="border-t border-gold/10 pt-4 mb-2 space-y-2">
            <Textarea
              label="Paste one name per line"
              rows={5}
              placeholder={'Juan Dela Cruz\nMaria Santos\n...'}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={onBulkAdd} disabled={submitting || !bulkText.trim()}>
                Add All
              </Button>
            </div>
          </div>
        )}
      </Card>

      {guests.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No guests yet"
          description="Add your first guest above — or paste your whole list at once."
        />
      ) : (
        <Card>
          <ul className="divide-y divide-gold/10">
            {guests.map((guest) => (
              <li key={guest.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-dark truncate">{guest.full_name}</p>
                  <p className="text-xs text-text-muted">
                    {guest.side_group}
                    {guest.relationship ? ` · ${guest.relationship}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={guest.rsvp_status}
                    onChange={(e) => updateRsvp(guest.id, e.target.value)}
                    className="text-xs rounded-full border border-gold/30 bg-warm-white px-2 py-1 focus:outline-none"
                  >
                    {PORTAL_GUEST_RSVP_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {PORTAL_GUEST_RSVP_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  <Badge color={RSVP_BADGE_COLOR[guest.rsvp_status]} className="hidden sm:inline-flex">
                    {PORTAL_GUEST_RSVP_LABELS[guest.rsvp_status]}
                  </Badge>
                  <button onClick={() => deleteGuest(guest.id)} aria-label="Remove guest">
                    <Trash2 className="w-4 h-4 text-danger" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
