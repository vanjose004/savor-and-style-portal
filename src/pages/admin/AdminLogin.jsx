import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { UtensilsCrossed } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Card from '../../components/ui/Card'
import { BUSINESS } from '../../lib/constants'

export default function AdminLogin() {
  const { signIn, user, isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  if (!loading && user && isAdmin) {
    return <Navigate to="/admin/dashboard" replace />
  }

  const onSubmit = async ({ email, password }) => {
    setSubmitting(true)
    setFormError(null)

    const { error } = await signIn(email, password)

    if (error) {
      setFormError(error.message)
      setSubmitting(false)
      return
    }

    navigate('/admin/dashboard')
  }

  return (
    <div className="admin-shell min-h-screen flex items-center justify-center bg-cream px-4">
      <Card className="w-full max-w-sm relative overflow-hidden before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gold">
        <div className="flex flex-col items-center text-center mb-6">
          <UtensilsCrossed className="w-8 h-8 text-wine mb-2" />
          <h1 className="text-xl font-bold text-wine">{BUSINESS.name}</h1>
          <p className="text-sm text-text-muted mt-1">Admin Login</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', { required: 'Email is required' })}
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
      </Card>
    </div>
  )
}
