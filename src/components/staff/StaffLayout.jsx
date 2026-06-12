import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut, UtensilsCrossed } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useStaffProfile } from '../../hooks/useStaffProfile'
import { BUSINESS } from '../../lib/constants'

export default function StaffLayout() {
  const { signOut } = useAuth()
  const { profile } = useStaffProfile()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/staff/login')
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
