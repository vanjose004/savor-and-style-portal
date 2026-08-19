import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '../../../lib/utils'

/** Monthly income vs expenses bar chart. `data` is an array of { label, income, expenses }. */
export default function IncomeExpenseChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        {/* Admin-only file — reads the --color-* custom properties directly
            since it always renders inside .admin-shell, same reasoning as
            ExpenseCategoryChart. */}
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gold)" strokeOpacity={0.2} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
        <YAxis
          tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
          tickFormatter={(value) => `₱${Math.round(value / 1000)}k`}
          width={48}
        />
        <Tooltip
          formatter={(value) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: 'var(--color-warm-white)',
            borderColor: 'var(--color-gold)',
            borderRadius: 8,
            color: 'var(--color-text-dark)',
          }}
          labelStyle={{ color: 'var(--color-text-dark)' }}
          itemStyle={{ color: 'var(--color-text-dark)' }}
        />
        <Legend wrapperStyle={{ color: 'var(--color-text-dark)' }} />
        <Bar dataKey="income" name="Income" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
