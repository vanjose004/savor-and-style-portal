import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '../../../lib/utils'

// Recharts needs literal color values (SVG fill/style props, not Tailwind
// classes), so this can't read the --color-* custom properties the rest of
// the admin theme uses — these are the admin night-sky palette's hex
// values, hardcoded here on purpose. Admin-only file (accounting), never
// rendered on client-facing pages.
const COLORS = [
  '#d4a843', // gold
  '#8c93b8', // soft blue-gray
  '#e0b74f', // bright gold
  '#c9932c', // warm gold
  '#e8a0a0', // dusty rose
  '#6b7aa8', // steel blue
  '#d9a441', // amber
  '#a8785c', // copper
  '#4a5578', // deep indigo
  '#f2e6c9', // warm cream
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
