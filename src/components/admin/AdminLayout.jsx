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
  Snowflake,
  QrCode,
  Inbox,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { BUSINESS } from '../../lib/constants'
import { cn } from '../../lib/utils'
import Logo from '../ui/Logo'
import NotificationBell from './NotificationBell'
import BookingDetailDrawer from './booking-detail/BookingDetailDrawer'
import ChristmasBackground from './ChristmasBackground'

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/calendar', label: 'Calendar', icon: Calendar },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/admin/upcoming-menus', label: 'Event Menu & Costing', icon: ShoppingCart },
  { to: '/admin/clients', label: 'Clients', icon: Users },
  { to: '/admin/soft-reserves', label: 'Soft Reserves', icon: Inbox },
  { to: '/admin/staff', label: 'Staff', icon: ChefHat },
  { to: '/admin/attendance', label: 'Attendance', icon: QrCode },
  { to: '/admin/payroll', label: 'Payroll', icon: Wallet },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/admin/accounting', label: 'Accounting', icon: PiggyBank },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
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
      <ChristmasBackground />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-wine text-warm-white flex flex-col transform transition-transform duration-200 lg:translate-x-0 lg:static',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Festive top accent — crimson / gold / holly, subtle */}
        <div className="h-1.5 shrink-0 bg-gradient-to-r from-wine via-gold to-success" aria-hidden="true" />

        <div className="px-6 py-5 border-b border-warm-white/10 flex items-center gap-3 relative">
          <Logo className="w-10 h-10 text-warm-white shrink-0" />
          <div>
            <h1 className="font-heading text-xl font-bold leading-tight">Savor and Style</h1>
            <p className="text-xs text-warm-white/70 mt-1">{BUSINESS.displayLocation}</p>
          </div>
          <Snowflake className="w-4 h-4 text-warm-white/25 absolute top-3 right-4" aria-hidden="true" />
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
                    ? 'bg-warm-white/15 text-warm-white'
                    : 'text-warm-white/80 hover:bg-warm-white/10'
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-warm-white/10">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-warm-white/80 hover:bg-warm-white/10 w-full transition-colors"
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

        <main className="flex-1 p-4 lg:p-8 max-w-6xl w-full mx-auto">
          <Outlet context={{ openBookingDrawer, bookingsRefreshKey }} />
        </main>
      </div>

      <BookingDetailDrawer
        bookingId={drawerBookingId}
        open={drawerOpen}
        onClose={closeBookingDrawer}
        onDeleted={handleBookingDeleted}
      />
    </div>
  )
}
