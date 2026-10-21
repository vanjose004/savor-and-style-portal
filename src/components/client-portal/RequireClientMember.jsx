import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../ui/Spinner'

export default function RequireClientMember() {
  const { user, isClient, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!user || !isClient) {
    return <Navigate to="/my-event/login" replace />
  }

  return <Outlet />
}
