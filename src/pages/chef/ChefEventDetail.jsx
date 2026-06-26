import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import Field from '../../components/ui/Field'
import { formatDate, formatTime } from '../../lib/utils'
import { MENU_CATEGORIES } from '../../lib/constants'

export default function ChefEventDetail() {
  const { id } = useParams()
  const { showToast } = useToast()
  const [booking, setBooking] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const [bookingRes, menuRes] = await Promise.all([
        supabase.from('chef_confirmed_bookings').select('*').eq('id', id).single(),
        supabase.from('booking_menu_items').select('*').eq('booking_id', id).eq('status', 'confirmed').order('category'),
      ])

      if (cancelled) return

      if (bookingRes.error) {
        showToast(bookingRes.error.message, 'error')
      } else {
        setBooking(bookingRes.data)
      }
      if (!menuRes.error) setMenuItems(menuRes.data ?? [])
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [id, showToast])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!booking) {
    return <p className="text-sm text-text-muted">Booking not found.</p>
  }

  const groupedMenu = MENU_CATEGORIES.map((category) => ({
    category,
    dishes: menuItems.filter((item) => item.category === category),
  })).filter((group) => group.dishes.length > 0)

  return (
    <div className="space-y-4">
      <Link to="/chef/dashboard" className="inline-flex items-center gap-1 text-sm text-wine hover:underline">
        <ArrowLeft className="w-4 h-4" />
        Back to bookings
      </Link>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-heading text-2xl font-bold text-wine">{booking.event_type}</h1>
        <Button as={Link} to={`/chef/print/${booking.id}`} target="_blank" rel="noopener noreferrer">
          <Printer className="w-4 h-4" />
          Print KOS
        </Button>
      </div>

      <Card title="Event Details">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Client" value={booking.client_name || '—'} />
          <Field label="Date" value={formatDate(booking.event_date)} />
          <Field label="Time" value={booking.event_time ? formatTime(booking.event_time) : '—'} />
          <Field label="Venue" value={booking.venue || '—'} />
          <Field label="Pax" value={booking.pax ?? '—'} />
        </dl>
        {booking.special_requests && (
          <div className="mt-4 pt-4 border-t border-gold/10">
            <p className="text-text-muted text-sm mb-1">Special Instructions / Notes</p>
            <p className="text-sm text-text-dark whitespace-pre-wrap">{booking.special_requests}</p>
          </div>
        )}
      </Card>

      <Card title="Menu Order">
        {groupedMenu.length === 0 ? (
          <p className="text-sm text-text-muted">No confirmed dishes yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groupedMenu.map(({ category, dishes }) => (
              <div key={category}>
                <p className="text-sm font-semibold text-wine mb-1">{category}</p>
                <ul className="text-sm text-text-dark space-y-0.5">
                  {dishes.map((dish) => (
                    <li key={dish.id}>{dish.dish_name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
