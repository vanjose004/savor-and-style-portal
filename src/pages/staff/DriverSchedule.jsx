import { useEffect, useRef, useState } from 'react'
import { Search, MapPin, Phone, Users, Gift, Truck, CalendarDays } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { cn, formatDate, formatTime } from '../../lib/utils'
import { LECHON_NOTE } from '../../lib/constants'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'

const POLL_INTERVAL_MS = 30000
const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
]

function googleMapsUrl(venue, pinLocation) {
  if (pinLocation && /^https?:\/\//i.test(pinLocation)) return pinLocation
  const query = [venue, pinLocation].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export default function DriverSchedule() {
  const { showToast } = useToast()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('upcoming')
  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const cancelledRef = useRef(false)

  const load = async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    const { data, error } = await supabase
      .from('driver_event_schedule')
      .select('*')
      .order('event_date', { ascending: true })

    if (cancelledRef.current) return
    if (error) {
      if (!isBackground) showToast(error.message, 'error')
    } else {
      setEvents(data ?? [])
    }
    if (!isBackground) setLoading(false)
  }

  useEffect(() => {
    cancelledRef.current = false
    load()

    const interval = setInterval(() => load(true), POLL_INTERVAL_MS)
    const onFocus = () => load(true)
    window.addEventListener('focus', onFocus)

    return () => {
      cancelledRef.current = true
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)

  const filtered = events
    .filter((e) => (tab === 'upcoming' ? e.event_date >= today : tab === 'past' ? e.event_date < today : true))
    .filter((e) => (dateFilter ? e.event_date === dateFilter : true))
    .filter((e) => {
      if (!query.trim()) return true
      const haystack = `${e.client_name ?? ''} ${e.venue ?? ''} ${e.booking_code ?? ''} ${e.event_type ?? ''}`.toLowerCase()
      return haystack.includes(query.trim().toLowerCase())
    })
    .sort((a, b) => (tab === 'past' ? b.event_date.localeCompare(a.event_date) : a.event_date.localeCompare(b.event_date)))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-wine">Driver Schedule</h1>
        <p className="text-sm text-text-muted mt-1">All events — where and when each trip is.</p>
      </div>

      <div className="flex gap-2 border-b border-gold/20">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key ? 'border-wine text-wine' : 'border-transparent text-text-muted hover:text-wine'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <Input className="pl-9" placeholder="Search client, venue, event type…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="sm:w-44" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No events found" description="Try a different tab, date, or search term." />
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => (
            <Card key={event.id}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-semibold text-text-dark">{event.event_type}</p>
                  <p className="text-sm text-wine font-medium">
                    {formatDate(event.event_date)}
                    {event.event_time ? ` · ${formatTime(event.event_time)}` : ''}
                  </p>
                </div>
                <StatusBadge status={event.status} />
              </div>

              <div className="space-y-2 text-sm text-text-dark">
                {event.client_name && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-text-muted shrink-0" />
                    <span>{event.client_name}</span>
                    {event.client_phone && (
                      <a href={`tel:${event.client_phone}`} className="text-wine hover:underline">
                        {event.client_phone}
                      </a>
                    )}
                  </div>
                )}

                {event.venue && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p>{event.venue}</p>
                      {event.venue_pin_location && !/^https?:\/\//i.test(event.venue_pin_location) && (
                        <p className="text-text-muted">{event.venue_pin_location}</p>
                      )}
                      {event.venue_access_time && <p className="text-text-muted text-xs">Access: {event.venue_access_time}</p>}
                      <a
                        href={googleMapsUrl(event.venue, event.venue_pin_location)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-wine hover:underline text-xs font-medium mt-1"
                      >
                        <MapPin className="w-3 h-3" />
                        Open in Google Maps
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-text-muted shrink-0" />
                  <span>{event.pax ?? '—'} pax</span>
                  {event.service_hours && <span className="text-text-muted">· {event.service_hours} hrs</span>}
                </div>

                {event.freebies?.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Gift className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                    <p className="text-text-muted">
                      {event.freebies.map((f) => (f.quantity ? `${f.name} (${f.quantity})` : f.name)).join(', ')}
                    </p>
                  </div>
                )}

                {event.lechon_chopping && (
                  <div className="flex items-start gap-2">
                    <Truck className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                    <p className="text-text-muted">{LECHON_NOTE}</p>
                  </div>
                )}

                {event.special_requests && (
                  <p className="text-text-muted border-t border-gold/10 pt-2 mt-2 whitespace-pre-wrap">{event.special_requests}</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
