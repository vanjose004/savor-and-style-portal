import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Textarea from '../../components/ui/Textarea'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { cn, formatDate, formatTime } from '../../lib/utils'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const ENTRY_TYPES = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'task', label: 'Task' },
]

const ENTRY_TYPE_DOT = {
  meeting: 'bg-wine',
  reminder: 'bg-warning',
  task: 'bg-gold',
}

const BOOKING_STATUS_DOT = {
  pending: 'bg-warning',
  confirmed: 'bg-success',
  completed: 'bg-wine',
  cancelled: 'bg-danger',
}

const EMPTY_FORM = { title: '', type: 'meeting', entry_date: '', entry_time: '', notes: '' }

function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Always 42 days (6 full weeks) so every month layout is covered, including leading/trailing days from adjacent months. */
function getCalendarDays(viewDate) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay())
  return Array.from(
    { length: 42 },
    (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
  )
}

export default function Calendar() {
  const { showToast } = useToast()
  const [viewDate, setViewDate] = useState(() => new Date())
  const [bookings, setBookings] = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const days = useMemo(() => getCalendarDays(viewDate), [viewDate])
  const todayISO = useMemo(() => toISODate(new Date()), [])
  const currentMonth = viewDate.getMonth()

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const start = toISODate(days[0])
      const end = toISODate(days[days.length - 1])

      const [bookingsRes, entriesRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, event_type, event_date, status, clients(name)')
          .gte('event_date', start)
          .lte('event_date', end),
        supabase
          .from('admin_calendar_entries')
          .select('id, title, type, entry_date, entry_time, notes')
          .gte('entry_date', start)
          .lte('entry_date', end)
          .order('entry_time'),
      ])

      if (cancelled) return

      if (bookingsRes.error) showToast(bookingsRes.error.message, 'error')
      else setBookings(bookingsRes.data ?? [])

      if (entriesRes.error) showToast(entriesRes.error.message, 'error')
      else setEntries(entriesRes.data ?? [])

      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDate])

  const byDate = useMemo(() => {
    const map = {}
    for (const b of bookings) {
      ;(map[b.event_date] ??= { bookings: [], entries: [] }).bookings.push(b)
    }
    for (const e of entries) {
      ;(map[e.entry_date] ??= { bookings: [], entries: [] }).entries.push(e)
    }
    return map
  }, [bookings, entries])

  const dayBookings = selectedDate ? byDate[selectedDate]?.bookings ?? [] : []
  const dayEntries = selectedDate ? byDate[selectedDate]?.entries ?? [] : []

  const goToMonth = (delta) =>
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  const goToToday = () => setViewDate(new Date())

  const openDay = (date) => {
    const iso = toISODate(date)
    setSelectedDate(iso)
    setForm({ ...EMPTY_FORM, entry_date: iso })
  }
  const closeDay = () => {
    setSelectedDate(null)
    setForm(EMPTY_FORM)
  }

  const handleAddEntry = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      showToast('Title is required.', 'error')
      return
    }

    setSaving(true)
    const { data, error } = await supabase
      .from('admin_calendar_entries')
      .insert({
        title: form.title.trim(),
        type: form.type,
        entry_date: form.entry_date,
        entry_time: form.entry_time || null,
        notes: form.notes.trim() || null,
      })
      .select()
      .single()
    setSaving(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    setEntries((prev) => [...prev, data])
    setForm((prev) => ({ ...EMPTY_FORM, entry_date: prev.entry_date }))
    showToast('Entry added.')
  }

  const handleDeleteEntry = async (id) => {
    const { error } = await supabase.from('admin_calendar_entries').delete().eq('id', id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
    showToast('Entry deleted.')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-wine">Calendar</h1>
          <p className="text-sm text-text-muted mt-1">Bookings and personal entries at a glance.</p>
        </div>
        <Button onClick={() => openDay(new Date())}>
          <Plus className="w-4 h-4" />
          Add Entry
        </Button>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => goToMonth(-1)} aria-label="Previous month">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-wine">
              {viewDate.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
            </h2>
            <Button variant="secondary" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => goToMonth(1)} aria-label="Next month">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner className="w-8 h-8" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 text-center text-xs font-medium text-text-muted mb-1">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-2">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((date) => {
                const iso = toISODate(date)
                const dayData = byDate[iso]
                const isCurrentMonth = date.getMonth() === currentMonth
                const isToday = iso === todayISO
                const dots = [
                  ...(dayData?.bookings.map((b) => BOOKING_STATUS_DOT[b.status] ?? 'bg-text-muted') ?? []),
                  ...(dayData?.entries.map((en) => ENTRY_TYPE_DOT[en.type] ?? 'bg-text-muted') ?? []),
                ]
                const chips = [
                  ...(dayData?.bookings.map((b) => ({
                    key: `b-${b.id}`,
                    label: b.clients?.name ?? b.event_type,
                    color: BOOKING_STATUS_DOT[b.status],
                  })) ?? []),
                  ...(dayData?.entries.map((en) => ({
                    key: `e-${en.id}`,
                    label: en.title,
                    color: ENTRY_TYPE_DOT[en.type],
                  })) ?? []),
                ]

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => openDay(date)}
                    className={cn(
                      'aspect-square sm:aspect-auto sm:h-24 rounded-lg border p-1.5 sm:p-2 text-left flex flex-col gap-1 transition-colors hover:bg-cream',
                      isCurrentMonth ? 'border-gold/20 bg-warm-white' : 'border-transparent bg-cream/40 text-text-muted/60',
                      isToday && 'ring-2 ring-wine'
                    )}
                  >
                    <span className={cn('text-xs sm:text-sm font-medium', isToday && 'text-wine font-bold')}>
                      {date.getDate()}
                    </span>

                    <div className="flex flex-wrap gap-1 sm:hidden">
                      {dots.slice(0, 4).map((color, i) => (
                        <span key={i} className={cn('w-1.5 h-1.5 rounded-full', color)} />
                      ))}
                    </div>

                    <div className="hidden sm:flex sm:flex-col gap-0.5 overflow-hidden">
                      {chips.slice(0, 3).map((item) => (
                        <span key={item.key} className="flex items-center gap-1 text-[11px] text-text-dark">
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', item.color ?? 'bg-text-muted')} />
                          <span className="truncate">{item.label}</span>
                        </span>
                      ))}
                      {chips.length > 3 && (
                        <span className="text-[11px] text-text-muted">+{chips.length - 3} more</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </Card>

      <Modal open={!!selectedDate} onClose={closeDay} title={selectedDate ? formatDate(selectedDate) : ''}>
        <div className="space-y-5">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-text-dark">Bookings</h4>
            {dayBookings.length === 0 ? (
              <p className="text-sm text-text-muted">No bookings on this date.</p>
            ) : (
              dayBookings.map((b) => (
                <Link
                  key={b.id}
                  to={`/admin/bookings/${b.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-gold/20 px-3 py-2 hover:bg-cream transition-colors"
                >
                  <span className="text-sm text-text-dark truncate">
                    {b.clients?.name ?? 'Unknown client'} · {b.event_type}
                  </span>
                  <span className={cn('w-2 h-2 rounded-full shrink-0', BOOKING_STATUS_DOT[b.status])} />
                </Link>
              ))
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-text-dark">Personal Entries</h4>
            {dayEntries.length === 0 ? (
              <p className="text-sm text-text-muted">No personal entries on this date.</p>
            ) : (
              dayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-gold/20 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full shrink-0', ENTRY_TYPE_DOT[entry.type])} />
                      <span className="text-sm font-medium text-text-dark truncate">{entry.title}</span>
                      {entry.entry_time && (
                        <span className="text-xs text-text-muted">{formatTime(entry.entry_time)}</span>
                      )}
                    </div>
                    {entry.notes && <p className="text-xs text-text-muted mt-1">{entry.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-text-muted hover:text-danger transition-colors shrink-0"
                    aria-label="Delete entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddEntry} className="space-y-3 pt-3 border-t border-gold/20">
            <h4 className="text-sm font-semibold text-text-dark">Add Personal Entry</h4>
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Type"
                options={ENTRY_TYPES}
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              />
              <Input
                type="time"
                label="Time (optional)"
                value={form.entry_time}
                onChange={(e) => setForm((prev) => ({ ...prev, entry_time: e.target.value }))}
              />
            </div>
            <Textarea
              label="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Saving…' : 'Add Entry'}
            </Button>
          </form>
        </div>
      </Modal>
    </div>
  )
}
