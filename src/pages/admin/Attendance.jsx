import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { formatDateTime, cn } from '../../lib/utils'

function toDateString(date) {
  return date.toISOString().slice(0, 10)
}

function ByDateView() {
  const [date, setDate] = useState(toDateString(new Date()))
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('attendance_logs')
      .select('id, location_type, checked_in_at, staff(name, role), bookings(booking_code, event_type, venue)')
      .eq('check_date', date)
      .order('checked_in_at', { ascending: false })
    setLogs(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  useEffect(() => {
    const channel = supabase
      .channel('admin-attendance-by-date')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  return (
    <Card>
      <Input type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-xs mb-4" />
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner className="w-6 h-6" />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState icon={Search} title="Walang check-in" description="Walang naka-log in sa araw na ito." />
      ) : (
        <ul className="divide-y divide-gold/10">
          {logs.map((log) => (
            <li key={log.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-dark">{log.staff?.name ?? 'Unknown'}</p>
                <p className="text-xs text-text-muted">
                  {log.location_type === 'home'
                    ? 'Bahay/Home'
                    : `${log.bookings?.venue ?? '—'} (${log.bookings?.booking_code ?? '—'})`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <Badge color={log.location_type === 'home' ? 'gold' : 'wine'}>
                  {log.location_type === 'home' ? 'Home' : 'Event'}
                </Badge>
                <p className="text-xs text-text-muted mt-1">{formatDateTime(log.checked_in_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function ByEventView() {
  const [search, setSearch] = useState('')
  const [candidates, setCandidates] = useState([])
  const [selected, setSelected] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [checkedInIds, setCheckedInIds] = useState(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!search.trim()) {
      setCandidates([])
      return
    }
    let cancelled = false
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, booking_code, event_type, event_date, venue, clients!inner(name)')
        .or(`booking_code.ilike.%${search}%,clients.name.ilike.%${search}%`)
        .order('event_date', { ascending: false })
        .limit(8)
      if (!cancelled) setCandidates(data ?? [])
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [search])

  const loadAttendance = async (bookingId) => {
    setLoading(true)
    const [{ data: assignmentData }, { data: checkinData }] = await Promise.all([
      supabase.from('event_assignments').select('staff_id, role_for_event, staff(name, role)').eq('booking_id', bookingId),
      supabase.from('attendance_logs').select('staff_id').eq('booking_id', bookingId).eq('location_type', 'event'),
    ])
    setAssignments(assignmentData ?? [])
    setCheckedInIds(new Set((checkinData ?? []).map((r) => r.staff_id)))
    setLoading(false)
  }

  useEffect(() => {
    if (!selected) return
    loadAttendance(selected.id)

    const channel = supabase
      .channel(`admin-attendance-event-${selected.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_logs', filter: `booking_id=eq.${selected.id}` },
        () => loadAttendance(selected.id)
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [selected])

  const handleSelect = (booking) => {
    setSelected(booking)
    setCandidates([])
    setSearch('')
  }

  return (
    <Card>
      {!selected ? (
        <>
          <Input
            label="Hanapin ang Booking"
            placeholder="Pangalan ng client o booking code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {candidates.length > 0 && (
            <ul className="mt-2 divide-y divide-gold/10 border border-gold/20 rounded-lg overflow-hidden">
              {candidates.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(b)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-cream/60 transition-colors"
                  >
                    <span className="font-medium text-text-dark">{b.clients?.name}</span>
                    <span className="text-text-muted"> — {b.event_type} — {b.booking_code}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-semibold text-text-dark">{selected.clients?.name} — {selected.event_type}</p>
              <p className="text-xs text-text-muted">{selected.booking_code} — {selected.venue}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setSelected(null)}>
              Change
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner className="w-6 h-6" />
            </div>
          ) : assignments.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Walang naka-assign na staff"
              description="Mag-assign muna ng staff sa booking na ito."
            />
          ) : (
            <ul className="divide-y divide-gold/10">
              {assignments.map((a) => {
                const isCheckedIn = checkedInIds.has(a.staff_id)
                return (
                  <li key={a.staff_id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {isCheckedIn ? (
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-text-muted shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-text-dark">{a.staff?.name ?? 'Unknown'}</p>
                        <p className="text-xs text-text-muted">{a.role_for_event ?? a.staff?.role}</p>
                      </div>
                    </div>
                    <span className={cn('text-xs', isCheckedIn ? 'text-success' : 'text-text-muted')}>
                      {isCheckedIn ? 'Naka-check-in' : 'Wala pa'}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </Card>
  )
}

export default function Attendance() {
  const [tab, setTab] = useState('date')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-wine">Attendance</h1>
        <p className="text-sm text-text-muted mt-1">Staff check-in log — home base and per-event QR scans.</p>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === 'date' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('date')}>
          By Date
        </Button>
        <Button variant={tab === 'event' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('event')}>
          By Event
        </Button>
      </div>

      {tab === 'date' ? <ByDateView /> : <ByEventView />}
    </div>
  )
}
