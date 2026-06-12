import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import BookingForm from '../../components/admin/BookingForm'
import Spinner from '../../components/ui/Spinner'
import { splitBookingFormValues } from '../../lib/bookings'

export default function BookingEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [booking, setBooking] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data, error } = await supabase.from('bookings').select('*, clients(*)').eq('id', id).single()

      if (cancelled) return

      if (error) {
        showToast(error.message, 'error')
      } else {
        setBooking(data)
      }
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [id, showToast])

  const handleSubmit = async (values) => {
    setSubmitting(true)

    const { clientFields, bookingFields } = splitBookingFormValues(values, {
      wasContractSigned: booking.contract_signed,
    })

    const { error: clientError } = await supabase.from('clients').update(clientFields).eq('id', booking.client_id)

    if (clientError) {
      showToast(clientError.message, 'error')
      setSubmitting(false)
      return
    }

    const { error: bookingError } = await supabase.from('bookings').update(bookingFields).eq('id', booking.id)

    if (bookingError) {
      showToast(bookingError.message, 'error')
      setSubmitting(false)
      return
    }

    showToast('Booking updated.')
    navigate(`/admin/bookings/${booking.id}`)
  }

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

  const defaultValues = {
    name: booking.clients?.name ?? '',
    phone: booking.clients?.phone ?? '',
    email: booking.clients?.email ?? '',
    address: booking.clients?.address ?? '',
    event_type: booking.event_type,
    event_date: booking.event_date,
    event_time: booking.event_time ? booking.event_time.slice(0, 5) : '',
    venue: booking.venue ?? '',
    pax: booking.pax ?? '',
    special_requests: booking.special_requests ?? '',
    status: booking.status,
    menu_confirmed: booking.menu_confirmed,
    contract_signed: booking.contract_signed,
    service_hours: booking.service_hours,
    lechon_chopping: booking.lechon_chopping,
    total_amount: booking.total_amount,
    reservation_fee: booking.reservation_fee,
    notes: booking.notes ?? '',
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/admin/bookings/${booking.id}`}
          className="inline-flex items-center gap-1 text-sm text-wine hover:underline mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to booking
        </Link>
        <h1 className="font-heading text-2xl font-bold text-wine">Edit Booking — {booking.booking_code}</h1>
      </div>
      <BookingForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Save Changes"
      />
    </div>
  )
}
