import { Receipt } from 'lucide-react'
import Card from '../ui/Card'
import PaymentProgressBar from '../ui/PaymentProgressBar'
import { formatCurrency } from '../../lib/utils'

export default function DemoPaymentCard({ totalAmount, paid, balance }) {
  return (
    <Card title="Payment Status">
      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div>
          <p className="text-text-muted">Total</p>
          <p className="font-semibold text-text-dark">{formatCurrency(totalAmount)}</p>
        </div>
        <div>
          <p className="text-text-muted">Paid</p>
          <p className="font-semibold text-success">{formatCurrency(paid)}</p>
        </div>
        <div>
          <p className="text-text-muted">Balance</p>
          <p className="font-semibold text-danger">{formatCurrency(balance)}</p>
        </div>
      </div>

      <PaymentProgressBar totalAmount={totalAmount} balance={balance} showLabels={false} />

      <div className="mt-5">
        <ul className="divide-y divide-gold/10">
          <li className="py-3 flex items-start gap-2">
            <Receipt className="w-4 h-4 text-wine shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-dark">{formatCurrency(paid)} · Reservation Fee</p>
              <p className="text-xs text-text-muted mt-0.5">GCash · Sample payment for demo purposes</p>
            </div>
          </li>
        </ul>
      </div>
    </Card>
  )
}
