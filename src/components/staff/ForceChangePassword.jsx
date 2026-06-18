import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { KeyRound } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Card from '../ui/Card'

/** Blocks staff portal access until a forced-temp-password user picks their own. */
export default function ForceChangePassword({ onDone }) {
  const { showToast } = useToast()
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm()

  const onSubmit = async ({ password }) => {
    setSubmitting(true)
    setFormError(null)

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setFormError(updateError.message)
      setSubmitting(false)
      return
    }

    const { error: clearError } = await supabase.rpc('staff_clear_must_change_password')
    if (clearError) {
      setFormError(clearError.message)
      setSubmitting(false)
      return
    }

    showToast('Password updated.')
    onDone()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <Card className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <KeyRound className="w-8 h-8 text-wine mb-2" />
          <h1 className="text-xl font-bold text-wine">Set a New Password</h1>
          <p className="text-sm text-text-muted mt-1">
            You're using a temporary password. Choose your own before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'Must be at least 6 characters' },
            })}
          />
          <Input
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) => value === watch('password') || 'Passwords do not match',
            })}
          />

          {formError && <p className="text-sm text-danger">{formError}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Password'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
