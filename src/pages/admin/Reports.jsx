import { useEffect, useState } from 'react'
import { CalendarDays, Wallet, AlertCircle, Receipt } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import StatCard from '../../components/ui/StatCard'
import Spinner from '../../components/ui/Spinner'
import { formatCurrency } from '../../lib/utils'
import { BOOKING_STATUSES, EVENT_TYPES, PAYMENT_METHODS } from '../../lib/constants'

function defaultRange() {
  const year = new Date().getFullYear()
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

export default function Reports() {
  const { showToast } = useToast()
  const [range, setRange] = useState(defaultRange)
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState([])
  const [payments, setPayments] = useState([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const [bookingsRes, paymentsRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, event_type, status, total_amount, balance, event_date')
          .gte('event_date', range.from)
          .lte('event_date', range.to),
        supabase
          .from('payments')
          .select('amount, payment_method, paid_at')
          .gte('paid_at', range.from)
          .lte('paid_at', `${range.to}T23:59:59`),
      ])

      if (cancelled) return

      if (bookingsRes.error) {
        showToast(bookingsRes.error.message, 'error')
      } else {
        setBookings(bookingsRes.data ?? [])
      }

      if (paymentsRes.error) {
        showToast(paymentsRes.error.message, 'error')
      } else {
        setPayments(paymentsRes.data ?? [])
      }

      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [range, showToast])

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const pendingBalance = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + Number(b.balance), 0)
  const totalContractValue = bookings.reduce((sum, b) => sum + Number(b.total_amount), 0)

  const statusBreakdown = BOOKING_STATUSES.map((status) => {
    const matching = bookings.filter((b) => b.status === status)
    return {
      key: status,
      label: status,
      count: matching.length,
      total: matching.reduce((sum, b) => sum + Number(b.total_amount), 0),
    }
  })

  const eventTypeBreakdown = EVENT_TYPES.map((eventType) => {
    const matching = bookings.filter((b) => b.event_type === eventType)
    return {
      key: eventType,
      label: eventType,
      count: matching.length,
      total: matching.reduce((sum, b) => sum + Number(b.total_amount), 0),
    }
  }).filter((row) => row.count > 0)

  const paymentMethodBreakdown = PAYMENT_METHODS.map((method) => {
    const matching = payments.filter((p) => p.payment_method === method)
    return {
      key: method,
      label: method,
      count: matching.length,
      total: matching.reduce((sum, p) => sum + Number(p.amount), 0),
    }
  }).filter((row) => row.count > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-wine">Reports</h1>
        <p className="text-sm text-text-muted mt-1">Revenue and booking summaries for a date range.</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
          <Input
            type="date"
            label="From"
            value={range.from}
            onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))}
          />
          <Input
            type="date"
            label="To"
            value={range.to}
            onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))}
          />
        </div>
        <p className="text-xs text-text-muted mt-3">
          Bookings are filtered by event date; revenue is filtered by payment date.
        </p>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="w-8 h-8" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={CalendarDays} label="Bookings in Range" value={bookings.length} />
            <StatCard icon={Wallet} label="Revenue Collected" value={formatCurrency(totalRevenue)} />
            <StatCard icon={AlertCircle} label="Pending Balances" value={formatCurrency(pendingBalance)} />
            <StatCard icon={Receipt} label="Total Contract Value" value={formatCurrency(totalContractValue)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Bookings by Status">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted border-b border-gold/10">
                    <th className="font-medium pb-2">Status</th>
                    <th className="font-medium pb-2 text-right">Count</th>
                    <th className="font-medium pb-2 text-right">Contract Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/10">
                  {statusBreakdown.map((row) => (
                    <tr key={row.key}>
                      <td className="py-2 capitalize text-text-dark">{row.label}</td>
                      <td className="py-2 text-right text-text-dark">{row.count}</td>
                      <td className="py-2 text-right text-text-dark">{formatCurrency(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card title="Bookings by Event Type">
              {eventTypeBreakdown.length === 0 ? (
                <p className="text-sm text-text-muted">No bookings in this range.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-text-muted border-b border-gold/10">
                      <th className="font-medium pb-2">Event Type</th>
                      <th className="font-medium pb-2 text-right">Count</th>
                      <th className="font-medium pb-2 text-right">Contract Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/10">
                    {eventTypeBreakdown.map((row) => (
                      <tr key={row.key}>
                        <td className="py-2 text-text-dark">{row.label}</td>
                        <td className="py-2 text-right text-text-dark">{row.count}</td>
                        <td className="py-2 text-right text-text-dark">{formatCurrency(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>

          <Card title="Revenue by Payment Method">
            {paymentMethodBreakdown.length === 0 ? (
              <p className="text-sm text-text-muted">No payments in this range.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted border-b border-gold/10">
                    <th className="font-medium pb-2">Method</th>
                    <th className="font-medium pb-2 text-right">Count</th>
                    <th className="font-medium pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/10">
                  {paymentMethodBreakdown.map((row) => (
                    <tr key={row.key}>
                      <td className="py-2 text-text-dark">{row.label}</td>
                      <td className="py-2 text-right text-text-dark">{row.count}</td>
                      <td className="py-2 text-right text-text-dark">{formatCurrency(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
