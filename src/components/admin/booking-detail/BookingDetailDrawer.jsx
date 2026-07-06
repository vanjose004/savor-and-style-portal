import { cn } from '../../../lib/utils'
import BookingDetailContent from './BookingDetailContent'

// Slide-over panel from the right. The backdrop is translucent (not a dark
// full-screen scrim) so the bookings list stays visible on the left while
// the drawer is open.
export default function BookingDetailDrawer({ bookingId, open, onClose, onDeleted }) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/10 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full sm:w-[92%] md:w-[640px] max-w-full bg-cream shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
      >
        {bookingId && (
          <div className="p-4 lg:p-6">
            <BookingDetailContent bookingId={bookingId} variant="drawer" onClose={onClose} onDeleted={onDeleted} />
          </div>
        )}
      </div>
    </>
  )
}
