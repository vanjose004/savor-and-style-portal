import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import StatusBadge from '../../components/ui/StatusBadge'
import Field from '../../components/ui/Field'
import { formatDate, formatTime } from '../../lib/utils'
import MenuSection from '../../components/admin/booking-detail/MenuSection'
import PaymentSection from '../../components/admin/booking-detail/PaymentSection'
import ContractSection from '../../components/admin/booking-detail/ContractSection'
import UpdatesTimeline from '../../components/admin/booking-detail/UpdatesTimeline'
import ChangeRequestsSection from '../../components/admin/booking-detail/ChangeRequestsSection'
import StaffAssignmentsSection from '../../components/admin/booking-detail/StaffAssignmentsSection'
import ChecklistSection from '../../components/admin/booking-detail/ChecklistSection'
import InternalNotesCard from '../../components/admin/booking-detail/InternalNotesCard'
import ClientPortalCard from '../../components/admin/booking-detail/ClientPortalCard'

export default function BookingDetail() {
  const { id } = useParams()
  const { showToast } = useToast()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadBooking = useCallback(async () => {
    const { data, error } = await supabase.from('bookings').select('*, clients(*)').eq('id', id).single()
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setBooking(data)
  }, [id, showToast])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadBooking().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [loadBooking])

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link to="/admin/bookings" className="inline-flex items-center gap-1 text-sm text-wine hover:underline mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back to bookings
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-heading text-2xl font-bold text-wine">{booking.booking_code}</h1>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-text-muted mt-1">
            {booking.clients?.name} · {booking.event_type} · {formatDate(booking.event_date)}
            {booking.event_time ? ` · ${formatTime(booking.event_time)}` : ''}
          </p>
        </div>
        <Button as={Link} to={`/admin/bookings/${booking.id}/edit`} variant="secondary">
          <Pencil className="w-4 h-4" />
          Edit Booking
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Client Information">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Name" value={booking.clients?.name || '—'} />
              <Field label="Phone" value={booking.clients?.phone || '—'} />
              <Field label="Email" value={booking.clients?.email || '—'} />
              <Field label="Address" value={booking.clients?.address || '—'} />
            </dl>
          </Card>

          <Card title="Event Details">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Event Type" value={booking.event_type} />
              <Field label="Date" value={formatDate(booking.event_date)} />
              <Field label="Time" value={booking.event_time ? formatTime(booking.event_time) : '—'} />
              <Field label="Venue" value={booking.venue || '—'} />
              <Field label="Pax" value={booking.pax ?? '—'} />
              <Field label="Service Hours" value={booking.service_hours} />
              <Field label="Lechon Chopping" value={booking.lechon_chopping ? 'Yes (+₱300 fee)' : 'No'} />
            </dl>
            {booking.special_requests && (
              <div className="mt-4 pt-4 border-t border-gold/10">
                <p className="text-text-muted text-sm mb-1">Special Requests</p>
                <p className="text-sm text-text-dark whitespace-pre-wrap">{booking.special_requests}</p>
              </div>
            )}
          </Card>

          <MenuSection bookingId={booking.id} menuConfirmed={booking.menu_confirmed} onChange={loadBooking} />
          <PaymentSection booking={booking} onChange={loadBooking} />
          <ContractSection booking={booking} onChange={loadBooking} />
          <UpdatesTimeline bookingId={booking.id} />
          <ChangeRequestsSection bookingId={booking.id} />
        </div>

        <div className="space-y-6">
          <ClientPortalCard booking={booking} />
          <StaffAssignmentsSection bookingId={booking.id} />
          <ChecklistSection bookingId={booking.id} />
          <InternalNotesCard booking={booking} onChange={loadBooking} />
        </div>
      </div>
    </div>
  )
}
