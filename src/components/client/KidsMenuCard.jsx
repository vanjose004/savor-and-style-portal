import { Baby } from 'lucide-react'
import Card from '../ui/Card'
import { KIDS_EVENT_TYPES } from '../../lib/constants'

export default function KidsMenuCard({ booking }) {
  if (!KIDS_EVENT_TYPES.includes(booking.event_type)) return null
  if (!booking.kids_menu || booking.kids_menu.length === 0) return null

  return (
    <Card title="Kids Menu">
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-text-dark">
        {booking.kids_menu.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <Baby className="w-4 h-4 text-wine shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  )
}
