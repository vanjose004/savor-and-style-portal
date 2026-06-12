import Card from '../ui/Card'
import StatusBadge from '../ui/StatusBadge'
import Field from '../ui/Field'
import { formatDate, formatTime } from '../../lib/utils'
import { KIDS_EVENT_TYPES } from '../../lib/constants'

export default function EventSummaryCard({ booking }) {
  return (
    <Card title="Event Summary" actions={<StatusBadge status={booking.status} />}>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Field label="Event Type" value={booking.event_type} />
        <Field label="Date" value={formatDate(booking.event_date)} />
        <Field label="Time" value={booking.event_time ? formatTime(booking.event_time) : 'TBD'} />
        <Field label="Venue" value={booking.venue || 'TBD'} />
        <Field label="Event Motif" value={booking.event_motif || 'TBD'} />
        <Field label="Guests" value={booking.pax ?? 'TBD'} />
        {KIDS_EVENT_TYPES.includes(booking.event_type) && (
          <>
            <Field label="Number of Adults" value={booking.num_adults ?? 'TBD'} />
            <Field label="Number of Kids" value={booking.num_kids ?? 'TBD'} />
          </>
        )}
      </dl>
      {booking.special_requests && (
        <div className="mt-4 pt-4 border-t border-gold/10">
          <p className="text-text-muted text-sm mb-1">Special Requests</p>
          <p className="text-sm text-text-dark whitespace-pre-wrap">{booking.special_requests}</p>
        </div>
      )}
    </Card>
  )
}
