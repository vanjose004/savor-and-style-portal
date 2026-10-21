import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, X, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import Spinner from '../../ui/Spinner'
import StatusBadge from '../../ui/StatusBadge'
import Field from '../../ui/Field'
import Modal from '../../ui/Modal'
import { formatDate, formatTime, formatCurrency } from '../../../lib/utils'
import { LECHON_NOTE, KIDS_EVENT_TYPES } from '../../../lib/constants'
import { calculateBookingQuote } from '../../../lib/bookings'
import MenuSection from './MenuSection'
import FreebiesSection from './FreebiesSection'
import PaymentSection from './PaymentSection'
import ContractSection from './ContractSection'
import UpdatesTimeline from './UpdatesTimeline'
import ChangeRequestsSection from './ChangeRequestsSection'
import StaffAssignmentsSection from './StaffAssignmentsSection'
import ChecklistSection from './ChecklistSection'
import InternalNotesCard from './InternalNotesCard'
import ClientPortalCard from './ClientPortalCard'
import WeddingPortalCard from './WeddingPortalCard'
import EventCheckinQRCard from './EventCheckinQRCard'

// Shared by the full booking detail page and the slide-over drawer opened
// from the bookings list / notification bell. `variant` controls the header
// (back link vs. close button) and whether sections stack in a single
// column (drawer, which is narrower than the lg breakpoint regardless of
// viewport width) or a 2-column grid (page).
export default function BookingDetailContent({ bookingId, variant = 'page', onClose, onDeleted }) {
  const { showToast } = useToast()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadBooking = useCallback(async () => {
    const { data, error } = await supabase.from('bookings').select('*, clients(*)').eq('id', bookingId).single()
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setBooking(data)
  }, [bookingId, showToast])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setBooking(null)
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

  const quote = calculateBookingQuote(booking)

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase.from('bookings').delete().eq('id', booking.id)
    setDeleting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast('Booking deleted.')
    setDeleteOpen(false)
    onDeleted?.(booking.id)
    onClose?.()
  }

  const mainSections = (
    <>
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
          {booking.menu_package && <Field label="Menu Package" value={booking.menu_package} />}
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
        {quote && (
          <div className="mt-4 pt-4 border-t border-gold/10">
            <p className="text-text-muted text-sm mb-1">Price Breakdown (estimate)</p>
            <dl className="text-sm text-text-dark space-y-0.5">
              <div className="flex justify-between">
                <dt>{booking.menu_package}</dt>
                <dd>{formatCurrency(quote.packagePrice)}</dd>
              </div>
              {quote.lechonFee > 0 && (
                <div className="flex justify-between">
                  <dt>Lechon chopping fee</dt>
                  <dd>{formatCurrency(quote.lechonFee)}</dd>
                </div>
              )}
              <div className="flex justify-between font-semibold text-wine border-t border-gold/10 mt-1 pt-1">
                <dt>Estimated Total</dt>
                <dd>{formatCurrency(quote.total)}</dd>
              </div>
            </dl>
            <p className="text-xs text-text-muted mt-1">
              Placeholder pricing — confirm against the quotation app before finalizing the contract amount.
            </p>
          </div>
        )}
        {KIDS_EVENT_TYPES.includes(booking.event_type) && booking.kids_menu?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gold/10">
            <p className="text-text-muted text-sm mb-1">Kids Menu</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-text-dark">
              {booking.kids_menu.map((item) => (
                <li key={item} className="flex gap-1.5">
                  <span aria-hidden="true">•</span>
                  <span>{item}</span>
                </li>
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
    </>
  )

  const sidebarSections = (
    <>
      <ClientPortalCard booking={booking} />
      <WeddingPortalCard booking={booking} />
      <EventCheckinQRCard booking={booking} />
      <StaffAssignmentsSection bookingId={booking.id} />
      <ChecklistSection bookingId={booking.id} />
      <InternalNotesCard booking={booking} onChange={loadBooking} />
    </>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          {variant === 'page' ? (
            <Link to="/admin/bookings" className="inline-flex items-center gap-1 text-sm text-wine hover:underline mb-2">
              <ArrowLeft className="w-4 h-4" />
              Back to bookings
            </Link>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 text-sm text-wine hover:underline mb-2"
            >
              <X className="w-4 h-4" />
              Close
            </button>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-heading text-2xl font-bold text-wine">{booking.booking_code}</h1>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-text-muted mt-1">
            {booking.clients?.name} · {booking.event_type} · {formatDate(booking.event_date)}
            {booking.event_time ? ` · ${formatTime(booking.event_time)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button as={Link} to={`/admin/bookings/${booking.id}/edit`} variant="secondary">
            <Pencil className="w-4 h-4" />
            Edit Booking
          </Button>
          <Button variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="w-4 h-4" />
            Delete Booking
          </Button>
        </div>
      </div>

      {variant === 'drawer' ? (
        <div className="space-y-6">
          {mainSections}
          {sidebarSections}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">{mainSections}</div>
          <div className="space-y-6">{sidebarSections}</div>
        </div>
      )}

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Booking"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-dark">
          Are you sure you want to delete booking <strong>{booking.booking_code}</strong> for{' '}
          <strong>{booking.clients?.name}</strong>? This will permanently remove the booking and all
          associated payments, menu items, staff assignments, checklists, and updates. This action
          cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
