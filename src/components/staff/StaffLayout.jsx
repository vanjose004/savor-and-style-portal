import { useState } from 'react'
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, UtensilsCrossed } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useStaffProfile } from '../../hooks/useStaffProfile'
import { BUSINESS } from '../../lib/constants'
import ForceChangePassword from './ForceChangePassword'
import Spinner from '../ui/Spinner'

// Drivers are a view-only role scoped to exactly one page — every other
// /staff/* route (dashboard, payroll, event detail/menu/costing) bounces
// back here. This is a UX convenience, not the security boundary: the
// real restriction is driver_event_schedule's is_driver()-gated view and
// the staff RLS policies, which a driver can't bypass just by guessing a
// URL even if this redirect weren't here.
const DRIVER_ONLY_PATH = '/staff/driver-schedule'

export default function StaffLayout() {
  const { signOut } = useAuth()
  const { profile, loading: profileLoading } = useStaffProfile()
  const [passwordJustChanged, setPasswordJustChanged] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/staff/login')
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (profile?.must_change_password && !passwordJustChanged) {
    return <ForceChangePassword onDone={() => setPasswordJustChanged(true)} />
  }

  if (profile?.role === 'driver' && location.pathname !== DRIVER_ONLY_PATH) {
    return <Navigate to={DRIVER_ONLY_PATH} replace />
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-wine text-warm-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5" />
            <div>
              <p className="font-heading font-bold leading-tight">{BUSINESS.name}</p>
              {profile?.name && <p className="text-xs text-warm-white/70">Hi, {profile.name}</p>}
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
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
