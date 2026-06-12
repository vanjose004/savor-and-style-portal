import { useEffect, useState } from 'react'
import { Receipt } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Card from '../ui/Card'
import Spinner from '../ui/Spinner'
import EmptyState from '../ui/EmptyState'
import PaymentProgressBar from '../ui/PaymentProgressBar'
import { formatCurrency, formatDateTime, getPaymentProgress } from '../../lib/utils'
import { PAYMENT_TYPE_LABELS } from '../../lib/constants'

export default function PaymentStatusCard({ accessToken, booking }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_booking_payments_by_token', { p_access_token: accessToken })
      if (cancelled) return
      if (!error) setPayments(data ?? [])
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [accessToken])

  const { paid, remaining } = getPaymentProgress(booking.total_amount, booking.balance)

  return (
    <Card title="Payment Status">
      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
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

      <PaymentProgressBar totalAmount={booking.total_amount} balance={booking.balance} showLabels={false} />

      <div className="mt-5">
        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner className="w-6 h-6" />
          </div>
        ) : payments.length === 0 ? (
          <EmptyState icon={Receipt} title="No payments yet" description="Your payment history will appear here." />
        ) : (
          <ul className="divide-y divide-gold/10">
            {payments.map((payment) => (
              <li key={payment.id} className="py-3">
                <p className="text-sm font-medium text-text-dark">
                  {formatCurrency(payment.amount)} · {PAYMENT_TYPE_LABELS[payment.payment_type] ?? payment.payment_type}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {payment.payment_method}
                  {payment.reference_number ? ` · Ref: ${payment.reference_number}` : ''}
                  {' · '}
                  {formatDateTime(payment.paid_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
