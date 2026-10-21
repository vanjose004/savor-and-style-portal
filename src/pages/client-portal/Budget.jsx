import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, Trash2, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { formatCurrency, getPaymentProgress } from '../../lib/utils'
import { WEDDING_BUDGET_CATEGORIES, PORTAL_EXPENSE_STATUSES, PORTAL_EXPENSE_STATUS_LABELS } from '../../lib/constants'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'

const CHART_COLORS = ['#722F37', '#C9A84C', '#2D6A4F', '#B5770D', '#8B1A1A', '#4A1A20', '#6B6B6B', '#A8C3B5', '#D9B8BC', '#E8D9A0', '#8c93b8', '#d4a843']

export default function Budget() {
  const { showToast } = useToast()
  const [booking, setBooking] = useState(null)
  const [budget, setBudget] = useState(null)
  const [categories, setCategories] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTotal, setEditingTotal] = useState(false)
  const [totalInput, setTotalInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { status: 'planned' } })

  const loadAll = async (bookingId) => {
    const [budgetRes, categoriesRes, expensesRes] = await Promise.all([
      supabase.from('portal_budget').select('*').eq('booking_id', bookingId).maybeSingle(),
      supabase.from('portal_budget_categories').select('*').eq('booking_id', bookingId).order('sort'),
      supabase.from('portal_expenses').select('*').eq('booking_id', bookingId).order('created_at', { ascending: false }),
    ])

    let categoryRows = categoriesRes.data ?? []
    if (categoryRows.length === 0) {
      const seeded = WEDDING_BUDGET_CATEGORIES.map((name, index) => ({ booking_id: bookingId, name, sort: index }))
      const { data: inserted } = await supabase.from('portal_budget_categories').insert(seeded).select('*')
      categoryRows = inserted ?? []
    }

    setBudget(budgetRes.data)
    setCategories(categoryRows)
    setExpenses(expensesRes.data ?? [])
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data: bookingRows } = await supabase.rpc('get_my_booking_summary')
      const current = bookingRows?.[0]
      if (cancelled || !current) {
        setLoading(false)
        return
      }
      setBooking(current)
      await loadAll(current.id)
      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const saveTotalBudget = async () => {
    const value = Number(totalInput) || null
    const { error } = await supabase
      .from('portal_budget')
      .upsert({ booking_id: booking.id, total_budget: value }, { onConflict: 'booking_id' })
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setBudget((prev) => ({ ...(prev ?? {}), booking_id: booking.id, total_budget: value }))
    setEditingTotal(false)
  }

  const onAddExpense = async (values) => {
    setSubmitting(true)
    const { error } = await supabase.from('portal_expenses').insert({
      booking_id: booking.id,
      category_id: values.category_id || null,
      item: values.item,
      estimated: values.estimated || null,
      status: values.status,
    })
    setSubmitting(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    reset({ status: 'planned' })
    loadAll(booking.id)
  }

  const deleteExpense = async (id) => {
    const { error } = await supabase.from('portal_expenses').delete().eq('id', id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadAll(booking.id)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!booking) return null

  const { paid: savorPaid } = getPaymentProgress(booking.total_amount, booking.balance)
  const otherEstimated = expenses.reduce((sum, e) => sum + Number(e.actual ?? e.estimated ?? 0), 0)
  const otherPaid = expenses.reduce((sum, e) => sum + Number(e.paid ?? 0), 0)
  const grandEstimated = otherEstimated + Number(booking.total_amount)
  const grandPaid = otherPaid + savorPaid
  const totalBudget = budget?.total_budget

  const categoryTotals = categories
    .map((cat) => ({
      name: cat.name,
      value: expenses.filter((e) => e.category_id === cat.id).reduce((sum, e) => sum + Number(e.actual ?? e.estimated ?? 0), 0),
    }))
    .filter((c) => c.value > 0)
  const chartData = [{ name: 'Savor & Style', value: Number(booking.total_amount) }, ...categoryTotals]

  return (
    <div className="space-y-6">
      <Card title="Budget Overview">
        <div className="grid grid-cols-3 gap-4 text-sm mb-4">
          <div>
            <p className="text-text-muted">Your Budget</p>
            {editingTotal ? (
              <div className="flex gap-1 mt-1">
                <Input
                  type="number"
                  className="w-24"
                  defaultValue={totalBudget ?? ''}
                  onChange={(e) => setTotalInput(e.target.value)}
                  autoFocus
                />
                <Button size="sm" onClick={saveTotalBudget}>
                  Save
                </Button>
              </div>
            ) : (
              <p className="font-semibold text-text-dark cursor-pointer" onClick={() => setEditingTotal(true)}>
                {totalBudget ? formatCurrency(totalBudget) : 'Tap to set'}
              </p>
            )}
          </div>
          <div>
            <p className="text-text-muted">Est. Total</p>
            <p className="font-semibold text-text-dark">{formatCurrency(grandEstimated)}</p>
          </div>
          <div>
            <p className="text-text-muted">Paid So Far</p>
            <p className="font-semibold text-success">{formatCurrency(grandPaid)}</p>
          </div>
        </div>

        {chartData.length > 1 && (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {chartData.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="Savor & Style (Locked)">
        <div className="flex items-center justify-between gap-3 bg-cream rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-text-muted" />
            <span className="text-sm text-text-dark">Catering package</span>
          </div>
          <span className="text-sm font-semibold text-text-dark">
            {formatCurrency(booking.total_amount)} · {formatCurrency(savorPaid)} paid
          </span>
        </div>
        <p className="text-xs text-text-muted mt-2">
          This line syncs automatically from your booking — see the Payments page to add or verify payments.
        </p>
      </Card>

      <Card title="Other Expenses">
        <form onSubmit={handleSubmit(onAddExpense)} className="grid grid-cols-2 gap-3 mb-4">
          <Input
            placeholder="Item"
            className="col-span-2"
            error={errors.item?.message}
            {...register('item', { required: 'Enter an item' })}
          />
          <Select placeholder="Category (optional)" options={categories.map((c) => ({ value: c.id, label: c.name }))} {...register('category_id')} />
          <Input type="number" placeholder="Estimated cost" {...register('estimated')} />
          <Select
            className="col-span-2"
            options={PORTAL_EXPENSE_STATUSES.map((value) => ({ value, label: PORTAL_EXPENSE_STATUS_LABELS[value] }))}
            {...register('status')}
          />
          <div className="col-span-2 flex justify-end">
            <Button type="submit" size="sm" disabled={submitting}>
              <Plus className="w-4 h-4" />
              Add Expense
            </Button>
          </div>
        </form>

        {expenses.length > 0 && (
          <ul className="divide-y divide-gold/10">
            {expenses.map((e) => (
              <li key={e.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-dark truncate">{e.item}</p>
                  <p className="text-xs text-text-muted">
                    {categories.find((c) => c.id === e.category_id)?.name ?? 'Uncategorized'}
                    {e.estimated ? ` · ${formatCurrency(e.estimated)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge color="gold">{PORTAL_EXPENSE_STATUS_LABELS[e.status]}</Badge>
                  <button onClick={() => deleteExpense(e.id)} aria-label="Remove expense">
                    <Trash2 className="w-4 h-4 text-danger" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
