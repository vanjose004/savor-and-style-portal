import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { UtensilsCrossed, CheckCircle2 } from 'lucide-react'
import { createStaffSignupClient } from '../../lib/supabase'
import { suggestUsername, findAvailableUsername } from '../../utils/username'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Card from '../../components/ui/Card'
import { BUSINESS, STAFF_ROLES, STAFF_ROLE_LABELS } from '../../lib/constants'

const ROLE_OPTIONS = STAFF_ROLES.map((value) => ({ value, label: STAFF_ROLE_LABELS[value] }))

export default function StaffRegister() {
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: { name: '', email: '', phone: '', role: STAFF_ROLES[0], password: '' },
  })

  const onSubmit = async (values) => {
    setSubmitting(true)
    setFormError(null)

    try {
      const baseUsername = suggestUsername(values.name)
      const username = await findAvailableUsername(baseUsername)

      // Non-persisting client: this is a public page, so signing up here
      // must never log the visitor into the app — they stay pending until
      // an admin approves them.
      const signupClient = createStaffSignupClient()
      const { data, error: signupError } = await signupClient.auth.signUp({
        email: values.email.trim(),
        password: values.password,
      })

      if (signupError) {
        setFormError(signupError.message)
        setSubmitting(false)
        return
      }

      const { error: insertError } = await signupClient.from('staff').insert({
        id: data.user.id,
        name: values.name.trim(),
        role: values.role,
        phone: values.phone?.trim() || null,
        email: values.email.trim(),
        username,
        is_active: false,
        pending_approval: true,
        must_change_password: false,
      })

      if (insertError) {
        setFormError(insertError.message)
        setSubmitting(false)
        return
      }

      setSubmitted(true)
    } catch (err) {
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-4">
        <Card className="w-full max-w-sm text-center">
          <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3" />
          <h1 className="text-xl font-bold text-wine">Pending Approval</h1>
          <p className="text-sm text-text-muted mt-2">
            Your account has been created and is waiting for an admin to approve it. You'll be able to sign in once
            it's approved.
          </p>
          <Link to="/staff/login" className="inline-block mt-6 text-sm text-wine hover:underline">
            Back to login
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <Card className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <UtensilsCrossed className="w-8 h-8 text-wine mb-2" />
          <h1 className="text-xl font-bold text-wine">{BUSINESS.name}</h1>
          <p className="text-sm text-text-muted mt-1">Staff Registration</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full Name"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', { required: 'Email is required' })}
          />
          <Input label="Phone" autoComplete="tel" {...register('phone')} />
          <Select label="Role" options={ROLE_OPTIONS} {...register('role', { required: true })} />
          <Input
            label="Password"
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
            {submitting ? 'Submitting…' : 'Register'}
          </Button>
        </form>

        <p className="text-sm text-text-muted text-center mt-4">
          Already have an account?{' '}
          <Link to="/staff/login" className="text-wine hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  )
}
