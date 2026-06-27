import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '../../../lib/utils'

/** Monthly income vs expenses bar chart. `data` is an array of { label, income, expenses }. */
export default function IncomeExpenseChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#C9A84C33" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6B6B6B' }} />
        <YAxis
          tick={{ fontSize: 12, fill: '#6B6B6B' }}
          tickFormatter={(value) => `₱${Math.round(value / 1000)}k`}
          width={48}
        />
        <Tooltip formatter={(value) => formatCurrency(value)} />
        <Legend />
        <Bar dataKey="income" name="Income" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="#8B1A1A" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
