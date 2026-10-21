import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Wallet,
  FileText,
  MessageSquare,
  LogOut,
  Heart,
  ClipboardList,
  PiggyBank,
  Truck,
  Crown,
  ListOrdered,
  UtensilsCrossed,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useClientMembership } from '../../hooks/useClientMembership'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'
import { BUSINESS } from '../../lib/constants'
import ClientForceChangePassword from './ClientForceChangePassword'
import Spinner from '../ui/Spinner'

const NAV_ITEMS = [
  { to: '/my-event', label: 'Dashboard', icon: LayoutDashboard, module: null },
  { to: '/my-event/checklist', label: 'Checklist', icon: ClipboardList, module: 'checklist' },
  { to: '/my-event/guests', label: 'Guests', icon: Users, module: 'guests' },
  { to: '/my-event/budget', label: 'Budget', icon: PiggyBank, module: 'budget' },
  { to: '/my-event/payments', label: 'Payments', icon: Wallet, module: 'payments' },
  { to: '/my-event/vendors', label: 'Vendors', icon: Truck, module: 'vendors' },
  { to: '/my-event/entourage', label: 'Entourage', icon: Crown, module: 'entourage' },
  { to: '/my-event/program', label: 'Program', icon: ListOrdered, module: 'program' },
  { to: '/my-event/menu', label: 'Menu', icon: UtensilsCrossed, module: 'menu' },
  { to: '/my-event/documents', label: 'Documents', icon: FileText, module: 'documents' },
  { to: '/my-event/messages', label: 'Messages', icon: MessageSquare, module: 'messages' },
]

export default function ClientPortalLayout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { membership, loading: membershipLoading } = useClientMembership()
  const [modules, setModules] = useState(null)
  const [passwordJustChanged, setPasswordJustChanged] = useState(false)

  useEffect(() => {
    if (!membership?.booking_id) return
    supabase
      .from('booking_portal_settings')
      .select('modules')
      .eq('booking_id', membership.booking_id)
      .maybeSingle()
      .then(({ data }) => setModules(data?.modules ?? {}))
  }, [membership?.booking_id])

  const handleSignOut = async () => {
    await signOut()
    navigate('/my-event/login')
  }

  if (membershipLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (membership?.must_change_password && !passwordJustChanged) {
    return <ClientForceChangePassword onDone={() => setPasswordJustChanged(true)} />
  }

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.module || modules?.[item.module])

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-wine text-warm-white sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            <div>
              <p className="font-heading font-bold leading-tight">My Event Portal</p>
              <p className="text-xs text-warm-white/70">{BUSINESS.name}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-warm-white/80 hover:text-warm-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>

        <nav className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto pb-2 -mt-1">
          {visibleNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/my-event'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  isActive ? 'bg-warm-white text-wine' : 'text-warm-white/80 hover:bg-warm-white/10'
                )
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <Outlet context={{ modules }} />
      </main>
    </div>
  )
}
