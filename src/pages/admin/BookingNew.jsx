import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import BookingForm from '../../components/admin/BookingForm'
import { splitBookingFormValues, syncKidsMenuItems } from '../../lib/bookings'

export default function BookingNew() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (values) => {
    setSubmitting(true)

    const { clientFields, bookingFields } = splitBookingFormValues(values)

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert(clientFields)
      .select('id')
      .single()

    if (clientError) {
      showToast(clientError.message, 'error')
      setSubmitting(false)
      return false
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({ ...bookingFields, client_id: client.id })
      .select('id')
      .single()

    if (bookingError) {
      showToast(bookingError.message, 'error')
      setSubmitting(false)
      return false
    }

    await syncKidsMenuItems(booking.id, bookingFields.event_type, bookingFields.kids_menu)

    showToast('Booking created.')
    navigate(`/admin/bookings/${booking.id}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-wine">New Booking</h1>
        <p className="text-sm text-text-muted mt-1">Enter client and event details to create a booking.</p>
      </div>
      <BookingForm
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Create Booking"
        draftKey="draft:booking-new"
      />
    </div>
  )
}
