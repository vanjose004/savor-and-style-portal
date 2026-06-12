import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Field from '../../components/ui/Field'
import {
  BUSINESS,
  RESERVATION_FEE,
  CREDIT_CARD_FEE_RATE,
  DEFAULT_SERVICE_HOURS,
  EXTRA_HOUR_RATE_PER_STAFF,
  LECHON_CHOPPING_FEE,
} from '../../lib/constants'
import { formatCurrency } from '../../lib/utils'

export default function Settings() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { password: '', confirmPassword: '' } })

  const onChangePassword = async (values) => {
    if (values.password !== values.confirmPassword) {
      showToast('Passwords do not match.', 'error')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password: values.password })
    setSubmitting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast('Password updated.')
    reset({ password: '', confirmPassword: '' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-wine">Settings</h1>
        <p className="text-sm text-text-muted mt-1">Business information and account settings.</p>
      </div>

      <Card title="Business Information">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Business Name" value={BUSINESS.name} />
          <Field label="Legal Name" value={BUSINESS.legalName} />
          <Field label="Address" value={BUSINESS.address} />
          <Field label="Service Area" value={BUSINESS.displayLocation} />
          <Field label="Phone" value={BUSINESS.phone} />
          <Field label="Facebook Page" value={BUSINESS.facebook} />
        </dl>
        <p className="text-xs text-text-muted mt-4">
          To change business information, update src/lib/constants.js in the codebase.
        </p>
      </Card>

      <Card title="Pricing & Fees">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Reservation Fee" value={formatCurrency(RESERVATION_FEE)} />
          <Field label="Credit Card Fee" value={`${CREDIT_CARD_FEE_RATE * 100}%`} />
          <Field label="Default Service Hours" value={`${DEFAULT_SERVICE_HOURS} hours`} />
          <Field label="Extra Hour Rate" value={`${formatCurrency(EXTRA_HOUR_RATE_PER_STAFF)} / staff / hour`} />
          <Field label="Lechon Chopping Fee" value={formatCurrency(LECHON_CHOPPING_FEE)} />
        </dl>
        <p className="text-xs text-text-muted mt-4">
          To change pricing and fees, update src/lib/constants.js in the codebase.
        </p>
      </Card>

      <Card title="Account">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm mb-4">
          <Field label="Email" value={user?.email ?? '—'} />
        </dl>
        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4 max-w-sm">
          <Input
            label="New Password"
            type="password"
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'Must be at least 6 characters' },
            })}
          />
          <Input
            label="Confirm New Password"
            type="password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', { required: 'Please confirm your password' })}
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Updating…' : 'Update Password'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
