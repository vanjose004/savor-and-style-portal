import { useState } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { UtensilsCrossed } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Card from '../../components/ui/Card'
import { BUSINESS } from '../../lib/constants'

const INVALID_LOGIN_MESSAGE = 'Invalid username or password.'

export default function StaffLogin() {
  const { signIn, user, isStaff, loading } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  if (!loading && user && isStaff) {
    return <Navigate to="/staff/dashboard" replace />
  }

  const onSubmit = async ({ username, password }) => {
    setSubmitting(true)
    setFormError(null)

    // Staff log in with a username, not an email — resolve it to the
    // underlying Supabase Auth email first, then sign in as normal.
    const { data: email, error: lookupError } = await supabase.rpc('get_email_for_username', {
      p_username: username,
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

    navigate('/staff/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <Card className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <UtensilsCrossed className="w-8 h-8 text-wine mb-2" />
          <h1 className="text-xl font-bold text-wine">{BUSINESS.name}</h1>
          <p className="text-sm text-text-muted mt-1">Staff Login</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Username"
            autoComplete="username"
            error={errors.username?.message}
            {...register('username', { required: 'Username is required' })}
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
          New here?{' '}
          <Link to="/staff/register" className="text-wine hover:underline">
            Register
          </Link>
        </p>
      </Card>
    </div>
  )
}
