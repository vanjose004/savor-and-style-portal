import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ChefHat } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Card from '../../components/ui/Card'
import { BUSINESS } from '../../lib/constants'

const INVALID_LOGIN_MESSAGE = 'Invalid email or password.'

export default function ChefLogin() {
  const { signIn, user, isChef, loading } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  if (!loading && user && isChef) {
    return <Navigate to="/chef/dashboard" replace />
  }

  const onSubmit = async ({ email, password }) => {
    setSubmitting(true)
    setFormError(null)

    const { error } = await signIn(email, password)

    if (error) {
      setFormError(INVALID_LOGIN_MESSAGE)
      setSubmitting(false)
      return
    }

    navigate('/chef/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <Card className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <ChefHat className="w-8 h-8 text-wine mb-2" />
          <h1 className="text-xl font-bold text-wine">{BUSINESS.name}</h1>
          <p className="text-sm text-text-muted mt-1">Chef Portal Login</p>
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
