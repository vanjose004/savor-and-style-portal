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
import { LECHON_NOTE, KIDS_EVENT_TYPES } from '../../lib/constants'
import MenuSection from '../../components/admin/booking-detail/MenuSection'
import FreebiesSection from '../../components/admin/booking-detail/FreebiesSection'
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
              <Field label="Event Motif" value={booking.event_motif || '—'} />
              <Field label="Pax" value={booking.pax ?? '—'} />
              <Field label="Service Hours" value={booking.service_hours} />
              <Field label="Client Has Lechon" value={booking.lechon_chopping ? 'Yes' : 'No'} />
              {KIDS_EVENT_TYPES.includes(booking.event_type) && (
                <>
                  <Field label="Number of Adults" value={booking.num_adults ?? '—'} />
                  <Field label="Number of Kids" value={booking.num_kids ?? '—'} />
                </>
              )}
            </dl>
            {booking.lechon_chopping && (
              <div className="mt-4 pt-4 border-t border-gold/10">
                <p className="text-sm text-wine font-medium">{LECHON_NOTE}</p>
              </div>
            )}
            {KIDS_EVENT_TYPES.includes(booking.event_type) && booking.kids_menu?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gold/10">
                <p className="text-text-muted text-sm mb-1">Kids Menu</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-text-dark">
                  {booking.kids_menu.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {booking.special_requests && (
              <div className="mt-4 pt-4 border-t border-gold/10">
                <p className="text-text-muted text-sm mb-1">Special Requests</p>
                <p className="text-sm text-text-dark whitespace-pre-wrap">{booking.special_requests}</p>
              </div>
            )}
          </Card>

          <Card title="Venue Information">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Venue Name" value={booking.venue || '—'} />
              <Field label="Venue Contact Number" value={booking.venue_contact_number || '—'} />
              <Field label="Access Time" value={booking.venue_access_time || '—'} />
              <Field
                label="Pin Location"
                value={
                  booking.venue_pin_location ? (
                    /^https?:\/\//i.test(booking.venue_pin_location) ? (
                      <a
                        href={booking.venue_pin_location}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-wine hover:underline break-all"
                      >
                        {booking.venue_pin_location}
                      </a>
                    ) : (
                      booking.venue_pin_location
                    )
                  ) : (
                    '—'
                  )
                }
              />
            </dl>
          </Card>

          <MenuSection bookingId={booking.id} menuConfirmed={booking.menu_confirmed} onChange={loadBooking} />
          <FreebiesSection booking={booking} onChange={loadBooking} />
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
