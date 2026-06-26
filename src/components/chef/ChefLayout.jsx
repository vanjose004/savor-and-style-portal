import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut, ChefHat } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { BUSINESS } from '../../lib/constants'

export default function ChefLayout() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/chef/login')
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-wine text-warm-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            <div>
              <p className="font-heading font-bold leading-tight">{BUSINESS.name}</p>
              <p className="text-xs text-warm-white/70">Chef Portal{user?.email ? ` · ${user.email}` : ''}</p>
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
