import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../ui/Spinner'

export default function RequireChef() {
  const { user, isChef, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!user || !isChef) {
    return <Navigate to="/chef/login" replace />
  }

  return <Outlet />
}
