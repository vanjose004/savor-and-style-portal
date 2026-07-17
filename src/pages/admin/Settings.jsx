import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check } from 'lucide-react'
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

const HOME_CHECKIN_URL = `${BUSINESS.siteUrl}/attendance/home`

export default function Settings() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [qrCopied, setQrCopied] = useState(false)
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

  const handleCopyQr = async () => {
    try {
      await navigator.clipboard.writeText(HOME_CHECKIN_URL)
      setQrCopied(true)
      showToast('Link copied to clipboard.')
      setTimeout(() => setQrCopied(false), 2000)
    } catch {
      showToast('Could not copy link.', 'error')
    }
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

      <Card title="Home Check-in QR">
        <p className="text-xs text-text-muted mb-3">
          Permanent QR code — i-print at i-post sa bahay/home base. Walang expiry, gumagana araw-araw.
        </p>
        <div className="flex justify-center bg-warm-white p-4 rounded-lg border border-gold/20 mb-3 max-w-xs">
          <QRCodeSVG value={HOME_CHECKIN_URL} size={200} />
        </div>
        <p className="text-xs text-text-dark break-all bg-cream rounded-lg px-3 py-2 border border-gold/20 mb-3 max-w-sm">
          {HOME_CHECKIN_URL}
        </p>
        <Button size="sm" variant="secondary" onClick={handleCopyQr}>
          {qrCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {qrCopied ? 'Copied' : 'Copy Link'}
        </Button>
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
