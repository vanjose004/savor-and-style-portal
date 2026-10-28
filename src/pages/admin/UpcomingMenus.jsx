import { useEffect, useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { formatDate, formatTime } from '../../lib/utils'

export default function UpcomingMenus() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const todayStr = new Date().toISOString().slice(0, 10)

      const { data, error } = await supabase
        .from('bookings')
        .select('id, event_date, event_time, pax, venue, status, clients(name), booking_menu_items(dish_name, status)')
        .in('status', ['confirmed', 'pending'])
        .gte('event_date', todayStr)
        .order('event_date', { ascending: true })

      if (cancelled) return

      if (error) {
        showToast(error.message, 'error')
      } else {
        setBookings(data ?? [])
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
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-wine">Event Menu &amp; Costing</h1>
        <p className="text-sm text-text-muted mt-1">
          All upcoming confirmed and pending events with their menu choices, so you know what to buy.
        </p>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No upcoming events"
          description="Confirmed and pending events from today onward will appear here."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-text-muted">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Client Name</th>
                  <th className="text-left font-medium px-3 py-2">Event Date</th>
                  <th className="text-left font-medium px-3 py-2">Event Time</th>
                  <th className="text-right font-medium px-3 py-2">Pax</th>
                  <th className="text-left font-medium px-3 py-2">Venue / Location</th>
                  <th className="text-left font-medium px-3 py-2">Menu Choices</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/10">
                {bookings.map((booking) => {
                  const confirmedDishes = (booking.booking_menu_items ?? [])
                    .filter((item) => item.status === 'confirmed')
                    .map((item) => item.dish_name)

                  return (
                    <tr key={booking.id}>
                      <td className="px-3 py-2 font-medium text-text-dark whitespace-nowrap">
                        {booking.clients?.name ?? 'Unknown client'}
                      </td>
                      <td className="px-3 py-2 text-text-dark whitespace-nowrap">{formatDate(booking.event_date)}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">
                        {booking.event_time ? formatTime(booking.event_time) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-text-dark whitespace-nowrap">{booking.pax ?? '—'}</td>
                      <td className="px-3 py-2 text-text-muted">{booking.venue || '—'}</td>
                      <td className="px-3 py-2 text-text-dark">
                        {confirmedDishes.length > 0 ? (
                          <ul className="space-y-0.5">
                            {confirmedDishes.map((dish, index) => (
                              <li key={`${dish}-${index}`} className="flex gap-1.5">
                                <span aria-hidden="true">•</span>
                                <span>{dish}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-text-muted italic">No menu confirmed yet</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
