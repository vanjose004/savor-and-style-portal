import Card from '../ui/Card'
import { formatCurrency } from '../../lib/utils'

/** Read-only breakdown of an event payroll report: staff pay, expenses, and totals. Shared by the TL report view and the admin detail view. */
export default function PayrollSummaryCard({ attendance, expenses, totals }) {
  return (
    <div className="space-y-4">
      <Card title="Staff Pay">
        {attendance.length === 0 ? (
          <p className="text-sm text-text-muted">No staff attendance recorded.</p>
        ) : (
          <ul className="divide-y divide-gold/10">
            {attendance.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-text-dark">{row.staffName}</p>
                  <p className="text-text-muted">
                    {row.role_at_event}
                    {row.ot_hours > 0 ? ` · ${row.ot_hours}h OT` : ''}
                  </p>
                </div>
                <p className="font-medium text-text-dark shrink-0">{formatCurrency(row.total_pay)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="On-site Expenses">
        {expenses.length === 0 ? (
          <p className="text-sm text-text-muted">No on-site expenses recorded.</p>
        ) : (
          <ul className="divide-y divide-gold/10">
            {expenses.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <p className="text-text-dark min-w-0">{row.description}</p>
                <p className="font-medium text-text-dark shrink-0">{formatCurrency(row.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-text-muted">Total Staff Pay</dt>
            <dd className="font-medium text-text-dark">{formatCurrency(totals.total_staff_pay)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-text-muted">Total Expenses</dt>
            <dd className="font-medium text-text-dark">{formatCurrency(totals.total_expenses)}</dd>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gold/10">
            <dt className="font-semibold text-wine">Total Deduction</dt>
            <dd className="font-bold text-wine">{formatCurrency(totals.total_deduction)}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
