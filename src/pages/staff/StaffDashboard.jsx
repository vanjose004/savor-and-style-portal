import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'
import { formatDate, formatTime } from '../../lib/utils'

export default function StaffDashboard() {
  const { showToast } = useToast()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('staff_event_bookings')
        .select('*')
        .gte('event_date', today)
        .neq('status', 'cancelled')
        .order('event_date', { ascending: true })

      if (cancelled) return

      if (error) {
        showToast(error.message, 'error')
      } else {
        setEvents(data ?? [])
      }
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [showToast])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-wine">My Events</h1>
        <p className="text-sm text-text-muted mt-1">Your upcoming assigned events.</p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No upcoming events"
          description="Events you're assigned to will appear here."
        />
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link key={event.id} to={`/staff/event/${event.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-text-dark">{event.event_type}</p>
                    <p className="text-sm text-text-muted mt-0.5">
                      {formatDate(event.event_date)}
                      {event.event_time ? ` · ${formatTime(event.event_time)}` : ''}
                    </p>
                    {event.venue && <p className="text-sm text-text-muted truncate">{event.venue}</p>}
                  </div>
                  <StatusBadge status={event.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
