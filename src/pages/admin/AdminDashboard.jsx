import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  CalendarClock,
  CalendarPlus,
  Wallet,
  AlertCircle,
  Banknote,
  ClipboardList,
  MessageSquareWarning,
  UtensilsCrossed,
  Receipt,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { formatCurrency, formatDate, formatTime, formatDateTime } from '../../lib/utils'

const REQUEST_TYPE_LABELS = {
  menu_suggestion: 'Menu suggestion',
  headcount_change: 'Headcount change',
  venue_change: 'Venue change',
  special_request: 'Special request',
  other: 'Request',
}

// Festive top accent (crimson/gold/holly) for this page's panels — applied
// via className only, since Card is shared with client-facing pages and is
// never edited directly. Resolves to the admin Christmas palette because
// this page always renders inside AdminLayout's .admin-shell scope.
const FESTIVE_CARD_ACCENT =
  "relative overflow-hidden before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-gradient-to-r before:from-wine before:via-gold before:to-success"

function toDateString(date) {
  return date.toISOString().slice(0, 10)
}

export default function AdminDashboard() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalBookings: 0,
    upcomingThisMonth: 0,
    totalRevenue: 0,
    pendingBalance: 0,
  })
  const [alerts, setAlerts] = useState({ pendingChangeRequests: 0, pendingMenuSuggestions: 0 })
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [activity, setActivity] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-change-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'change_requests' }, () =>
        setRefreshKey((key) => key + 1)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      const today = new Date()
      const todayStr = toDateString(today)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      const endOfMonthStr = toDateString(endOfMonth)
      const in30Days = new Date(today)
      in30Days.setDate(in30Days.getDate() + 30)
      const in30DaysStr = toDateString(in30Days)

      const [
        totalBookingsRes,
        upcomingThisMonthRes,
        paymentsRes,
        pendingBalanceRes,
        upcomingEventsRes,
        pendingChangeRequestsRes,
        pendingMenuRes,
        recentBookingsRes,
        recentPaymentsRes,
        recentChangeRequestsRes,
        recentMenuSuggestionsRes,
      ] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .gte('event_date', todayStr)
          .lte('event_date', endOfMonthStr)
          .neq('status', 'cancelled'),
        supabase.from('payments').select('amount'),
        supabase.from('bookings').select('balance').gt('balance', 0).neq('status', 'cancelled'),
        supabase
          .from('bookings')
          .select('id, booking_code, event_type, event_date, event_time, pax, status, clients(name)')
          .gte('event_date', todayStr)
          .lte('event_date', in30DaysStr)
          .neq('status', 'cancelled')
          .order('event_date', { ascending: true })
          .limit(10),
        supabase.from('change_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('booking_menu_items').select('*', { count: 'exact', head: true }).eq('status', 'suggested'),
        supabase
          .from('bookings')
          .select('id, booking_code, event_type, created_at, clients(name)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('payments')
          .select('id, amount, payment_method, paid_at, booking_id, bookings(booking_code, clients(name))')
          .order('paid_at', { ascending: false })
          .limit(5),
        supabase
          .from('change_requests')
          .select('id, request_type, submitted_at, booking_id, bookings(booking_code, clients(name))')
          .order('submitted_at', { ascending: false })
          .limit(5),
        supabase
          .from('booking_menu_items')
          .select('id, dish_name, created_at, booking_id, bookings(booking_code, clients(name))')
          .eq('suggested_by', 'client')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      if (cancelled) return

      const firstError = [
        totalBookingsRes,
        upcomingThisMonthRes,
        paymentsRes,
        pendingBalanceRes,
        upcomingEventsRes,
        pendingChangeRequestsRes,
        pendingMenuRes,
        recentBookingsRes,
        recentPaymentsRes,
        recentChangeRequestsRes,
        recentMenuSuggestionsRes,
      ]
        .map((res) => res.error)
        .find(Boolean)

      if (firstError) {
        showToast(firstError.message, 'error')
        setLoading(false)
        return
      }

      const totalRevenue = (paymentsRes.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0)
      const pendingBalance = (pendingBalanceRes.data ?? []).reduce((sum, b) => sum + Number(b.balance), 0)

      setMetrics({
        totalBookings: totalBookingsRes.count ?? 0,
        upcomingThisMonth: upcomingThisMonthRes.count ?? 0,
        totalRevenue,
        pendingBalance,
      })

      setAlerts({
        pendingChangeRequests: pendingChangeRequestsRes.count ?? 0,
        pendingMenuSuggestions: pendingMenuRes.count ?? 0,
      })

      setUpcomingEvents(upcomingEventsRes.data ?? [])

      const feed = [
        ...(recentBookingsRes.data ?? []).map((b) => ({
          id: `booking-${b.id}`,
          date: b.created_at,
          icon: CalendarPlus,
          text: `New booking ${b.booking_code} — ${b.event_type} for ${b.clients?.name ?? 'a client'}`,
          link: `/admin/bookings/${b.id}`,
        })),
        ...(recentPaymentsRes.data ?? []).map((p) => ({
          id: `payment-${p.id}`,
          date: p.paid_at,
          icon: Banknote,
          text: `Payment of ${formatCurrency(p.amount)} (${p.payment_method}) — ${p.bookings?.booking_code ?? ''} for ${p.bookings?.clients?.name ?? 'a client'}`,
          link: `/admin/bookings/${p.booking_id}`,
        })),
        ...(recentChangeRequestsRes.data ?? []).map((cr) => ({
          id: `change-${cr.id}`,
          date: cr.submitted_at,
          icon: MessageSquareWarning,
          text: `${REQUEST_TYPE_LABELS[cr.request_type] ?? 'Request'} from ${cr.bookings?.clients?.name ?? 'a client'} — ${cr.bookings?.booking_code ?? ''}`,
          link: `/admin/bookings/${cr.booking_id}`,
        })),
        ...(recentMenuSuggestionsRes.data ?? []).map((m) => ({
          id: `menu-${m.id}`,
          date: m.created_at,
          icon: UtensilsCrossed,
          text: `${m.bookings?.clients?.name ?? 'A client'} suggested "${m.dish_name}" — ${m.bookings?.booking_code ?? ''}`,
          link: `/admin/bookings/${m.booking_id}`,
        })),
      ]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 8)

      setActivity(feed)
      setLoading(false)
    }

    load().catch((err) => {
      if (!cancelled) {
        showToast(err.message, 'error')
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [showToast, refreshKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-wine">Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">Overview of bookings, payments, and activity.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button as={Link} to="/admin/bookings/new">
            <CalendarPlus className="w-4 h-4" />
            New Booking
          </Button>
          <Button as={Link} to="/admin/bookings" variant="secondary">
            <Banknote className="w-4 h-4" />
            Record Payment
          </Button>
          <Button as={Link} to="/admin/bookings" variant="secondary">
            <ClipboardList className="w-4 h-4" />
            Add Update
          </Button>
        </div>
      </div>

      {(alerts.pendingChangeRequests > 0 || alerts.pendingMenuSuggestions > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {alerts.pendingChangeRequests > 0 && (
            <Link
              to="/admin/bookings"
              className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning hover:bg-warning/15 transition-colors"
            >
              <MessageSquareWarning className="w-5 h-5 shrink-0" />
              <span>
                <strong>{alerts.pendingChangeRequests}</strong> pending change request
                {alerts.pendingChangeRequests === 1 ? '' : 's'} awaiting review
              </span>
            </Link>
          )}
          {alerts.pendingMenuSuggestions > 0 && (
            <Link
              to="/admin/bookings"
              className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning hover:bg-warning/15 transition-colors"
            >
              <UtensilsCrossed className="w-5 h-5 shrink-0" />
              <span>
                <strong>{alerts.pendingMenuSuggestions}</strong> menu suggestion
                {alerts.pendingMenuSuggestions === 1 ? '' : 's'} awaiting confirmation
              </span>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays} label="Total Bookings" value={metrics.totalBookings} />
        <StatCard icon={CalendarClock} label="Upcoming This Month" value={metrics.upcomingThisMonth} />
        <StatCard icon={Wallet} label="Revenue Collected" value={formatCurrency(metrics.totalRevenue)} />
        <StatCard icon={AlertCircle} label="Pending Balances" value={formatCurrency(metrics.pendingBalance)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Upcoming Events (Next 30 Days)" className={FESTIVE_CARD_ACCENT}>
          {upcomingEvents.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming events"
              description="Bookings with an event date in the next 30 days will appear here."
            />
          ) : (
            <ul className="divide-y divide-gold/10">
              {upcomingEvents.map((booking) => (
                <li key={booking.id}>
                  <Link
                    to={`/admin/bookings/${booking.id}`}
                    className="flex items-center justify-between gap-4 py-3 -mx-2 px-2 rounded-lg hover:bg-cream/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-dark truncate">
                        {booking.clients?.name ?? 'Unknown client'} — {booking.event_type}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {formatDate(booking.event_date)}
                        {booking.event_time ? ` · ${formatTime(booking.event_time)}` : ''}
                        {booking.pax ? ` · ${booking.pax} pax` : ''}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent Activity" className={FESTIVE_CARD_ACCENT}>
          {activity.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No recent activity"
              description="New bookings, payments, change requests, and menu suggestions will show up here."
            />
          ) : (
            <ul className="space-y-1">
              {activity.map(({ id, icon: Icon, text, link, date }) => (
                <li key={id}>
                  <Link
                    to={link}
                    className="flex items-start gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-cream/60 transition-colors"
                  >
                    <span className="w-8 h-8 rounded-full bg-wine/10 text-wine flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="text-sm text-text-dark block">{text}</span>
                      <span className="text-xs text-text-muted">{formatDateTime(date)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
