import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarHeart, Users, Wallet, MessageSquare, ClipboardList } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate, formatShortDate, getDaysUntil, getPaymentProgress } from '../../lib/utils'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'

export default function Dashboard() {
  const [booking, setBooking] = useState(null)
  const [guestCounts, setGuestCounts] = useState({ total: 0, confirmed: 0 })
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [checklistProgress, setChecklistProgress] = useState(0)
  const [upcomingTasks, setUpcomingTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data: bookingRows } = await supabase.rpc('get_my_booking_summary')
      const current = bookingRows?.[0] ?? null
      if (cancelled) return
      setBooking(current)

      if (current) {
        const [{ data: guests }, { count: unread }, { data: tasks }] = await Promise.all([
          supabase.from('portal_guests').select('rsvp_status').eq('booking_id', current.id),
          supabase
            .from('portal_messages')
            .select('id', { count: 'exact', head: true })
            .eq('booking_id', current.id)
            .eq('sender_is_admin', true)
            .eq('read_by_client', false),
          supabase.from('portal_checklist_tasks').select('id, status, due_date, title').eq('booking_id', current.id),
        ])
        if (cancelled) return
        setGuestCounts({
          total: guests?.length ?? 0,
          confirmed: guests?.filter((g) => g.rsvp_status === 'confirmed').length ?? 0,
        })
        setUnreadMessages(unread ?? 0)

        const allTasks = tasks ?? []
        setChecklistProgress(
          allTasks.length > 0 ? Math.round((allTasks.filter((t) => t.status === 'done').length / allTasks.length) * 100) : 0
        )
        setUpcomingTasks(
          allTasks
            .filter((t) => t.status !== 'done' && t.status !== 'skipped' && t.due_date)
            .sort((a, b) => a.due_date.localeCompare(b.due_date))
            .slice(0, 3)
        )
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!booking) return null

  const daysUntil = getDaysUntil(booking.event_date)
  const { paid } = getPaymentProgress(booking.total_amount, booking.balance)

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start gap-3">
          <CalendarHeart className="w-8 h-8 text-wine shrink-0" />
          <div>
            <h1 className="font-heading font-bold text-xl text-wine">{booking.client_name}'s Wedding</h1>
            <p className="text-sm text-text-muted mt-0.5">
              {formatDate(booking.event_date)} · {booking.venue ?? 'Venue TBD'}
            </p>
            {daysUntil !== null && (
              <p className="text-sm font-semibold text-wine mt-2">
                {daysUntil > 0 ? `${daysUntil} days to go 🎉` : daysUntil === 0 ? "Today's the day! 🎉" : 'Event completed'}
              </p>
            )}
          </div>
        </div>
      </Card>

      <Link to="/my-event/checklist">
        <Card className="hover:border-wine/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-wine" />
              <span className="text-sm font-semibold text-text-dark">Planning Progress</span>
            </div>
            <span className="text-sm font-semibold text-text-dark">{checklistProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-cream overflow-hidden mb-2">
            <div className="h-full bg-success transition-all" style={{ width: `${checklistProgress}%` }} />
          </div>
          {upcomingTasks.length > 0 && (
            <ul className="text-xs text-text-muted space-y-0.5">
              {upcomingTasks.map((t) => (
                <li key={t.id}>
                  {formatShortDate(t.due_date)} — {t.title}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Link>

      <div className="grid grid-cols-2 gap-4">
        <Link to="/my-event/guests">
          <Card className="hover:border-wine/40 transition-colors">
            <Users className="w-5 h-5 text-wine mb-2" />
            <p className="text-xl font-bold text-text-dark">
              {guestCounts.confirmed}/{guestCounts.total}
            </p>
            <p className="text-xs text-text-muted">Guests confirmed</p>
          </Card>
        </Link>

        <Link to="/my-event/payments">
          <Card className="hover:border-wine/40 transition-colors">
            <Wallet className="w-5 h-5 text-wine mb-2" />
            <p className="text-xl font-bold text-text-dark">{formatCurrency(booking.balance)}</p>
            <p className="text-xs text-text-muted">Balance due · {formatCurrency(paid)} paid</p>
          </Card>
        </Link>
      </div>

      <Link to="/my-event/messages">
        <Card className="flex items-center gap-3 hover:border-wine/40 transition-colors">
          <MessageSquare className="w-5 h-5 text-wine shrink-0" />
          <p className="text-sm text-text-dark">
            {unreadMessages > 0 ? (
              <span className="font-semibold">
                {unreadMessages} new message{unreadMessages > 1 ? 's' : ''} from your coordinator
              </span>
            ) : (
              'No new messages'
            )}
          </p>
        </Card>
      </Link>
    </div>
  )
}
