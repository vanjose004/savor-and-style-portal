import { formatCurrency, getPaymentProgress } from '../../lib/utils'

export default function PaymentProgressBar({ totalAmount, balance, showLabels = true }) {
  const { paid, remaining, percent } = getPaymentProgress(totalAmount, balance)

  return (
    <div>
      {showLabels && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-text-muted">Paid: {formatCurrency(paid)}</span>
          <span className="text-text-muted">Balance: {formatCurrency(remaining)}</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-cream overflow-hidden">
        <div
          className="h-full bg-success rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabels && <div className="text-right text-xs text-text-muted mt-1">{percent}% paid</div>}
    </div>
  )
}
