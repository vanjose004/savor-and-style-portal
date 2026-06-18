import { Plus, X } from 'lucide-react'
import Card from '../../ui/Card'
import Input from '../../ui/Input'
import Button from '../../ui/Button'
import { formatCurrency } from '../../../lib/utils'

/** Step 2 of TL payroll submission: on-site expense rows (description + amount + optional receipt photo link). */
export default function ExpensesStep({ rows, onChange }) {
  const addRow = () => {
    onChange([...rows, { key: crypto.randomUUID(), description: '', amount: '', photoUrl: '' }])
  }

  const updateRow = (key, patch) => {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const removeRow = (key) => {
    onChange(rows.filter((row) => row.key !== key))
  }

  const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)

  return (
    <Card title="On-site Expenses">
      <div className="space-y-4">
        {rows.length === 0 && <p className="text-sm text-text-muted">No expenses added yet.</p>}

        {rows.map((row) => (
          <div key={row.key} className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Description"
                value={row.description}
                onChange={(e) => updateRow(row.key, { description: e.target.value })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={row.amount}
                  onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                />
                <Input
                  placeholder="Receipt photo link (optional)"
                  value={row.photoUrl}
                  onChange={(e) => updateRow(row.key, { photoUrl: e.target.value })}
                />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger/10 mt-1"
              aria-label="Remove expense"
              onClick={() => removeRow(row.key)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}

        <Button variant="secondary" size="sm" onClick={addRow}>
          <Plus className="w-4 h-4" /> Add Expense
        </Button>

        <div className="flex items-center justify-between pt-3 border-t border-gold/10 text-sm">
          <span className="text-text-muted">Running Total</span>
          <span className="font-semibold text-wine">{formatCurrency(total)}</span>
        </div>
      </div>
    </Card>
  )
}
