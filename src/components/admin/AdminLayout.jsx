import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Users,
  ChefHat,
  UtensilsCrossed,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Menu as MenuIcon,
  Wallet,
  PiggyBank,
  QrCode,
  Inbox,
  Image as ImageIcon,
  MessageCircle,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { BUSINESS } from '../../lib/constants'
import { cn } from '../../lib/utils'
import Logo from '../ui/Logo'
import NotificationBell from './NotificationBell'
import BookingDetailDrawer from './booking-detail/BookingDetailDrawer'

// Grab/Shopee-style persistent bottom bar for mobile — a quick-access
// subset of NAV_ITEMS, not a replacement for it. "More" reuses the
// existing slide-out sidebar (setMobileOpen) instead of a separate page,
// so the full nav list stays in one place.
const BOTTOM_NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/admin/accounting', label: 'Payments', icon: Wallet },
]

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/calendar', label: 'Calendar', icon: Calendar },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/admin/upcoming-menus', label: 'Event Menu & Costing', icon: ShoppingCart },
  { to: '/admin/clients', label: 'Clients', icon: Users },
  { to: '/admin/soft-reserves', label: 'Soft Reserves', icon: Inbox },
  { to: '/admin/gallery', label: 'Gallery', icon: ImageIcon },
  { to: '/admin/staff', label: 'Staff', icon: ChefHat },
  { to: '/admin/attendance', label: 'Attendance', icon: QrCode },
  { to: '/admin/payroll', label: 'Payroll', icon: Wallet },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/admin/addon-catalog', label: 'Add-On Catalog', icon: Sparkles },
  { to: '/admin/accounting', label: 'Accounting', icon: PiggyBank },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/chatbot-settings', label: 'Chatbot Settings', icon: MessageCircle },
  { to: '/admin/messenger-bot', label: 'Messenger Bot', icon: MessageSquare },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [drawerBookingId, setDrawerBookingId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [bookingsRefreshKey, setBookingsRefreshKey] = useState(0)

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login')
  }

  const openBookingDrawer = (bookingId) => {
    setDrawerBookingId(bookingId)
    setDrawerOpen(true)
  }

  const closeBookingDrawer = () => setDrawerOpen(false)

  const handleBookingDeleted = () => setBookingsRefreshKey((prev) => prev + 1)

  return (
    <div className="admin-shell min-h-screen flex bg-cream">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-warm-white text-text-dark border-r border-gold/10 flex flex-col transform transition-transform duration-200 lg:translate-x-0 lg:static',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-[2px] shrink-0 bg-wine" aria-hidden="true" />

        <div className="px-6 py-5 border-b border-gold/10 flex items-center gap-3">
          <Logo className="w-10 h-10 text-wine shrink-0" />
          <div>
            <h1 className="font-heading text-xl font-bold leading-tight">Savor and Style</h1>
            <p className="text-xs text-text-muted mt-1">{BUSINESS.displayLocation}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-wine/10 text-wine'
                    : 'text-text-muted hover:bg-wine/5 hover:text-wine'
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gold/10">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-text-muted hover:bg-wine/5 hover:text-wine w-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center px-4 lg:px-8 py-3 bg-warm-white border-b border-gold/20 sticky top-0 z-20">
          <div className="flex items-center gap-2 lg:hidden">
            <Logo className="w-8 h-8 text-wine shrink-0" />
            <h1 className="font-heading text-lg font-bold text-wine">Savor and Style</h1>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <NotificationBell onOpenBooking={openBookingDrawer} />
            <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="lg:hidden">
              <MenuIcon className="w-6 h-6 text-wine" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 pb-20 lg:p-8 lg:pb-8 max-w-6xl w-full mx-auto">
          <Outlet context={{ openBookingDrawer, bookingsRefreshKey }} />
        </main>
      </div>

      {!mobileOpen && (
        <nav className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-warm-white border-t border-gold/20 flex items-stretch pb-[env(safe-area-inset-bottom)]">
          {BOTTOM_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                  isActive ? 'text-wine' : 'text-text-muted'
                )
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-text-muted transition-colors"
          >
            <MenuIcon className="w-5 h-5" />
            More
          </button>
        </nav>
      )}

      <BookingDetailDrawer
        bookingId={drawerBookingId}
        open={drawerOpen}
        onClose={closeBookingDrawer}
        onDeleted={handleBookingDeleted}
      />
    </div>
  )
}
