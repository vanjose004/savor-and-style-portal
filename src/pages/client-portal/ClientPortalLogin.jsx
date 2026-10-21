import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Heart } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Card from '../../components/ui/Card'
import { BUSINESS } from '../../lib/constants'

const INVALID_LOGIN_MESSAGE = 'Invalid booking code or password.'

export default function ClientPortalLogin() {
  const { signIn, user, isClient, loading } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  if (!loading && user && isClient) {
    return <Navigate to="/my-event" replace />
  }

  const onSubmit = async ({ bookingCode, password }) => {
    setSubmitting(true)
    setFormError(null)

    // Clients log in with their booking code instead of an email — resolve
    // it to the underlying Supabase Auth email first, same approach as
    // staff username login (get_email_for_username).
    const { data: email, error: lookupError } = await supabase.rpc('get_email_for_booking_code', {
      p_code: bookingCode,
    })

    if (lookupError || !email) {
      setFormError(INVALID_LOGIN_MESSAGE)
      setSubmitting(false)
      return
    }

    const { error } = await signIn(email, password)

    if (error) {
      setFormError(INVALID_LOGIN_MESSAGE)
      setSubmitting(false)
      return
    }

    supabase.rpc('client_touch_last_login')
    navigate('/my-event')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <Card className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <Heart className="w-8 h-8 text-wine mb-2" />
          <h1 className="text-xl font-bold text-wine">My Event Portal</h1>
          <p className="text-sm text-text-muted mt-1">{BUSINESS.name}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Booking Code"
            autoComplete="username"
            placeholder="SS-2026-001"
            error={errors.bookingCode?.message}
            {...register('bookingCode', { required: 'Booking code is required' })}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password', { required: 'Password is required' })}
          />

          {formError && <p className="text-sm text-danger">{formError}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <p className="text-sm text-text-muted text-center mt-4">
          Don't have access yet? Contact your coordinator.
        </p>
      </Card>
    </div>
  )
}
