import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Upload, Receipt } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { formatCurrency, formatDateTime, getPaymentProgress } from '../../lib/utils'
import { PAYMENT_METHODS, PAYMENT_SUBMISSION_STATUS_LABELS } from '../../lib/constants'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const SUBMISSION_BADGE_COLOR = {
  pending_verification: 'warning',
  verified: 'success',
  rejected: 'danger',
}

export default function Payments() {
  const { showToast } = useToast()
  const [booking, setBooking] = useState(null)
  const [payments, setPayments] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { method: PAYMENT_METHODS[0] } })

  const loadAll = async (bookingId) => {
    const [{ data: paymentRows }, { data: submissionRows }] = await Promise.all([
      supabase.rpc('get_my_payments'),
      supabase.from('payment_submissions').select('*').eq('booking_id', bookingId).order('created_at', { ascending: false }),
    ])
    setPayments(paymentRows ?? [])
    setSubmissions(submissionRows ?? [])
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data: bookingRows } = await supabase.rpc('get_my_booking_summary')
      const current = bookingRows?.[0]
      if (cancelled || !current) {
        setLoading(false)
        return
      }
      setBooking(current)
      await loadAll(current.id)
      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const onSubmit = async (values) => {
    if (!file) {
      showToast('Please attach a screenshot of your payment.', 'error')
      return
    }

    setSubmitting(true)

    const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
    const path = `${booking.id}/${crypto.randomUUID()}${ext}`

    const { error: uploadError } = await supabase.storage.from('portal-payments').upload(path, file)
    if (uploadError) {
      setSubmitting(false)
      showToast(uploadError.message, 'error')
      return
    }

    const { error: insertError } = await supabase.from('payment_submissions').insert({
      booking_id: booking.id,
      amount: values.amount,
      method: values.method,
      reference_no: values.reference_no || null,
      proof_path: path,
    })

    setSubmitting(false)

    if (insertError) {
      showToast(insertError.message, 'error')
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    fetch('/api/notify-payment-proof', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData?.session?.access_token}` },
      body: JSON.stringify({ bookingId: booking.id, amount: values.amount, method: values.method }),
    }).catch(() => {})

    reset({ method: PAYMENT_METHODS[0] })
    setFile(null)
    showToast('Payment proof submitted — we will verify it shortly.')
    loadAll(booking.id)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!booking) return null

  const { paid, remaining } = getPaymentProgress(booking.total_amount, booking.balance)

  return (
    <div className="space-y-6">
      <Card title="Payment Status">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-text-muted">Total</p>
            <p className="font-semibold text-text-dark">{formatCurrency(booking.total_amount)}</p>
          </div>
          <div>
            <p className="text-text-muted">Paid</p>
            <p className="font-semibold text-success">{formatCurrency(paid)}</p>
          </div>
          <div>
            <p className="text-text-muted">Balance</p>
            <p className="font-semibold text-danger">{formatCurrency(remaining)}</p>
          </div>
        </div>
      </Card>

      <Card title="Submit Proof of Payment">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              error={errors.amount?.message}
              {...register('amount', { required: 'Amount is required', min: { value: 1, message: 'Enter a valid amount' } })}
            />
            <Select label="Method" options={PAYMENT_METHODS} {...register('method')} />
          </div>
          <Input label="Reference No. (optional)" {...register('reference_no')} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-dark">Screenshot</label>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              <Upload className="w-4 h-4" />
              {submitting ? 'Submitting…' : 'Submit'}
            </Button>
          </div>
        </form>

        {submissions.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-gold/10 pt-4">
            {submissions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-text-dark">
                  {formatCurrency(s.amount)} · {s.method} · {formatDateTime(s.created_at)}
                </span>
                <Badge color={SUBMISSION_BADGE_COLOR[s.status]}>{PAYMENT_SUBMISSION_STATUS_LABELS[s.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Payment History">
        {payments.length === 0 ? (
          <EmptyState icon={Receipt} title="No payments yet" description="Your verified payment history will appear here." />
        ) : (
          <ul className="divide-y divide-gold/10">
            {payments.map((p) => (
              <li key={p.id} className="py-3">
                <p className="text-sm font-medium text-text-dark">{formatCurrency(p.amount)}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {p.payment_method}
                  {p.reference_number ? ` · Ref: ${p.reference_number}` : ''} · {formatDateTime(p.paid_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
