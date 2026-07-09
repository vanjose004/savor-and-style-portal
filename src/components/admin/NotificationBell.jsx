import { useEffect, useState } from 'react'
import { Bell, MessageSquareWarning, UtensilsCrossed } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Spinner from '../ui/Spinner'
import { formatRelativeTime, cn } from '../../lib/utils'
import { CHANGE_REQUEST_TYPE_LABELS } from '../../lib/constants'

const POLL_INTERVAL_MS = 60000
const RECENT_LIMIT = 8

async function fetchNotifications() {
  const [changeRequestsRes, menuSuggestionsRes, unreadChangeRequestsRes, unreadMenuSuggestionsRes] = await Promise.all([
    supabase
      .from('change_requests')
      .select('id, request_type, submitted_at, is_read, booking_id, bookings(booking_code, clients(name))')
      .order('submitted_at', { ascending: false })
      .limit(RECENT_LIMIT),
    supabase
      .from('booking_menu_items')
      .select('id, dish_name, created_at, is_read, booking_id, bookings(booking_code, clients(name))')
      .eq('suggested_by', 'client')
      .order('created_at', { ascending: false })
      .limit(RECENT_LIMIT),
    supabase.from('change_requests').select('*', { count: 'exact', head: true }).eq('is_read', false),
    supabase
      .from('booking_menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('suggested_by', 'client')
      .eq('is_read', false),
  ])

  const notifications = [
    ...(changeRequestsRes.data ?? []).map((row) => ({
      id: `change_request-${row.id}`,
      table: 'change_requests',
      rowId: row.id,
      bookingId: row.booking_id,
      clientName: row.bookings?.clients?.name ?? 'Unknown client',
      typeLabel: CHANGE_REQUEST_TYPE_LABELS[row.request_type] ?? 'Update Request',
      icon: MessageSquareWarning,
      time: row.submitted_at,
      isRead: row.is_read,
    })),
    ...(menuSuggestionsRes.data ?? []).map((row) => ({
      id: `menu_suggestion-${row.id}`,
      table: 'booking_menu_items',
      rowId: row.id,
      bookingId: row.booking_id,
      clientName: row.bookings?.clients?.name ?? 'Unknown client',
      typeLabel: `Menu Suggestion: ${row.dish_name}`,
      icon: UtensilsCrossed,
      time: row.created_at,
      isRead: row.is_read,
    })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time))

  const unreadCount = (unreadChangeRequestsRes.count ?? 0) + (unreadMenuSuggestionsRes.count ?? 0)

  return { notifications, unreadCount }
}

export default function NotificationBell({ onOpenBooking }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const result = await fetchNotifications()
      if (cancelled) return
      setNotifications(result.notifications)
      setUnreadCount(result.unreadCount)
      setLoading(false)
    }

    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)

    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'change_requests' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_menu_items' }, load)
      .subscribe()

    return () => {
      cancelled = true
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  const handleSelect = async (notification) => {
    setOpen(false)
    onOpenBooking(notification.bookingId)

    if (notification.isRead) return

    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))

    await supabase.from(notification.table).update({ is_read: true }).eq('id', notification.rowId)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-lg text-wine hover:bg-wine/10 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-semibold leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 max-w-[90vw] bg-warm-white rounded-xl border border-gold/20 shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gold/10">
              <p className="text-sm font-semibold text-text-dark">Notifications</p>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-gold/10">
              {loading ? (
                <div className="flex justify-center py-6">
                  <Spinner className="w-5 h-5" />
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-6 px-4">No notifications yet.</p>
              ) : (
                notifications.map((notification) => {
                  const Icon = notification.icon
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleSelect(notification)}
                      className={cn(
                        'w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-cream/60 transition-colors',
                        !notification.isRead && 'bg-wine/5'
                      )}
                    >
                      <Icon className="w-4 h-4 text-wine mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-dark truncate">{notification.clientName}</p>
                        <p className="text-xs text-text-muted truncate">{notification.typeLabel}</p>
                        <p className="text-xs text-text-muted mt-0.5">{formatRelativeTime(notification.time)}</p>
                      </div>
                      {!notification.isRead && <span className="w-2 h-2 rounded-full bg-wine mt-1.5 shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
