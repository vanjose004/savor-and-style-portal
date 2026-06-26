import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'
import { formatDate, formatTime, formatDateTime } from '../../lib/utils'
import { BUSINESS } from '../../lib/constants'
import '../../styles/chefPrintStyles.css'

export default function KitchenOrderSheet() {
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

  useEffect(() => {
    if (!loading && booking) {
      const timeout = setTimeout(() => window.print(), 300)
      return () => clearTimeout(timeout)
    }
  }, [loading, booking])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!booking) {
    return <p className="text-sm text-text-muted p-6">Booking not found.</p>
  }

  return (
    <div className="min-h-screen bg-cream py-6 px-4">
      <div className="no-print max-w-2xl mx-auto mb-4 flex items-center justify-between">
        <Link to={`/chef/event/${booking.id}`} className="inline-flex items-center gap-1 text-sm text-wine hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to event
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-wine text-warm-white text-sm font-medium hover:bg-wine-dark transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>

      <div className="kos-page max-w-2xl mx-auto bg-white text-black border border-black/20 rounded-lg p-8">
        <div className="flex flex-col items-center text-center">
          <img src="/logo.png" alt={BUSINESS.name} className="w-24 h-24 object-contain mb-2" />
          <p className="font-heading text-xl font-bold uppercase">{BUSINESS.name}</p>
          <p className="kos-title text-2xl font-bold uppercase mt-1">Kitchen Order Sheet</p>
        </div>

        <hr className="my-6 border-black/30" />

        <dl className="space-y-3">
          <KosField label="Event Date" value={formatDate(booking.event_date)} />
          <KosField label="Event Type" value={booking.event_type} />
          <KosField label="Client Name" value={booking.client_name} />
          <KosField label="Venue" value={booking.venue || '—'} />
          <KosField label="Start Time" value={booking.event_time ? formatTime(booking.event_time) : '—'} />
          <div className="flex items-baseline justify-between gap-4 pt-2">
            <dt className="kos-field-label text-base font-semibold uppercase">Pax Count</dt>
            <dd className="kos-pax-value text-4xl font-extrabold">{booking.pax ?? '—'}</dd>
          </div>
        </dl>

        <hr className="my-6 border-black/30" />

        <div>
          <p className="kos-section-heading text-lg font-bold uppercase mb-2">Menu Order</p>
          {menuItems.length === 0 ? (
            <p className="kos-menu-item text-base">No confirmed menu items.</p>
          ) : (
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.id} className="kos-menu-item text-base">
                  • {item.dish_name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <hr className="my-6 border-black/30" />

        <div>
          <p className="kos-section-heading text-lg font-bold uppercase mb-2">Special Instructions / Notes</p>
          <p className="kos-menu-item text-base whitespace-pre-wrap">{booking.special_requests || 'None'}</p>
        </div>

        <hr className="my-6 border-black/30" />

        <p className="text-sm">Printed: {formatDateTime(new Date().toISOString())}</p>
      </div>
    </div>
  )
}

function KosField({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="kos-field-label text-base font-semibold uppercase">{label}</dt>
      <dd className="kos-field-value text-xl font-bold text-right">{value}</dd>
    </div>
  )
}
