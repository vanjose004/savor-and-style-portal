import { Link } from 'react-router-dom'
import { MapPin, Clock, Users } from 'lucide-react'
import Card from '../ui/Card'
import { formatDate, formatTime } from '../../lib/utils'

export default function ChefEventCard({ booking }) {
  return (
    <Link to={`/chef/event/${booking.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold text-text-dark">{formatDate(booking.event_date)}</p>
            <p className="text-sm text-wine font-medium mt-0.5">{booking.event_type}</p>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-text-dark shrink-0">
            <Users className="w-4 h-4 text-gold" />
            {booking.pax ?? '—'} pax
          </div>
        </div>

        <div className="mt-3 space-y-1 text-sm text-text-muted">
          {booking.venue && (
            <p className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gold shrink-0" />
              <span className="truncate">{booking.venue}</span>
            </p>
          )}
          {booking.event_time && (
            <p className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gold shrink-0" />
              {formatTime(booking.event_time)}
            </p>
          )}
        </div>
      </Card>
    </Link>
  )
}
