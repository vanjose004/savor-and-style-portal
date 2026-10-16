import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '../../../lib/utils'

// Recharts needs literal color values (SVG fill/style props, not Tailwind
// classes), so this can't read the --color-* custom properties directly —
// these are the brand palette's hex values, hardcoded here on purpose.
const COLORS = [
  '#722F37', // wine
  '#C9A84C', // gold
  '#2D6A4F', // success
  '#B5770D', // warning
  '#8B1A1A', // danger
  '#4A1A20', // wine-dark
  '#6B6B6B', // muted
  '#A8C3B5',
  '#D9B8BC',
  '#E8D9A0',
]

/** Expense breakdown pie chart by category. `data` is an array of { name, value }. */
export default function ExpenseCategoryChart({ data }) {
  if (data.length === 0) {
    return <p className="text-sm text-text-muted text-center py-16">No expenses recorded this month yet.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
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
      </PieChart>
    </ResponsiveContainer>
  )
}
