import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, Receipt, CreditCard, Plus, Minus, AlertCircle, PiggyBank } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import SummaryCard from '../../../components/ui/SummaryCard'
import Spinner from '../../../components/ui/Spinner'
import RecentList from '../../../components/admin/accounting/RecentList'
import IncomeExpenseChart from '../../../components/admin/accounting/IncomeExpenseChart'
import ExpenseCategoryChart from '../../../components/admin/accounting/ExpenseCategoryChart'
import { formatCurrency, formatDate, getLastMonths } from '../../../lib/utils'
import { INCOME_CATEGORY_LABELS, EXPENSE_CATEGORY_LABELS } from '../../../lib/constants'

export default function AccountingDashboard() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [expenses, setExpenses] = useState([])
  const [payables, setPayables] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [recentExpenses, setRecentExpenses] = useState([])
  const [incomeThisYear, setIncomeThisYear] = useState(0)
  const [allTimeIncome, setAllTimeIncome] = useState(0)
  const [allTimeExpenses, setAllTimeExpenses] = useState(0)

  const months = getLastMonths(6)
  const thisMonth = months[months.length - 1]
  const lastMonth = months[months.length - 2]
  const year = new Date().getFullYear()

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      const [txRes, expRes, payRes, recentTxRes, recentExpRes, yearTxRes, allTxRes, allExpRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('id, amount, category, transaction_date')
          .gte('transaction_date', months[0].start)
          .lte('transaction_date', thisMonth.end),
        supabase
          .from('expenses')
          .select('id, amount, category, expense_date')
          .gte('expense_date', months[0].start)
          .lte('expense_date', thisMonth.end),
        supabase.from('payables').select('id, creditor_name, balance, status').neq('status', 'paid'),
        supabase
          .from('transactions')
          .select('id, transaction_code, client_name, category, amount, payment_method, transaction_date')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('expenses')
          .select('id, expense_code, description, category, amount, expense_date')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('transactions')
          .select('amount')
          .gte('transaction_date', `${year}-01-01`)
          .lte('transaction_date', `${year}-12-31`),
        supabase.from('transactions').select('amount'),
        supabase.from('expenses').select('amount'),
      ])

      if (cancelled) return

      for (const res of [txRes, expRes, payRes, recentTxRes, recentExpRes, yearTxRes, allTxRes, allExpRes]) {
        if (res.error) showToast(res.error.message, 'error')
      }

      setTransactions(txRes.data ?? [])
      setExpenses(expRes.data ?? [])
      setPayables(payRes.data ?? [])
      setRecentTransactions(recentTxRes.data ?? [])
      setRecentExpenses(recentExpRes.data ?? [])
      setIncomeThisYear((yearTxRes.data ?? []).reduce((sum, t) => sum + Number(t.amount), 0))
      setAllTimeIncome((allTxRes.data ?? []).reduce((sum, t) => sum + Number(t.amount), 0))
      setAllTimeExpenses((allExpRes.data ?? []).reduce((sum, e) => sum + Number(e.amount), 0))
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
    // months/thisMonth/lastMonth/year are derived from "now" on each render —
    // intentionally only re-fetch on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  const sumByRange = (rows, dateKey, start, end) =>
    rows.filter((row) => row[dateKey] >= start && row[dateKey] <= end).reduce((sum, row) => sum + Number(row.amount), 0)

  const incomeThisMonth = sumByRange(transactions, 'transaction_date', thisMonth.start, thisMonth.end)
  const expensesThisMonth = sumByRange(expenses, 'expense_date', thisMonth.start, thisMonth.end)
  const cashOnHand = allTimeIncome - allTimeExpenses
  const incomeLastMonth = sumByRange(transactions, 'transaction_date', lastMonth.start, lastMonth.end)
  const totalUtangBalance = payables.reduce((sum, p) => sum + Number(p.balance), 0)

  const expensesThisMonthRows = expenses.filter(
    (e) => e.expense_date >= thisMonth.start && e.expense_date <= thisMonth.end
  )
  const categoryTotals = expensesThisMonthRows.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount)
    return acc
  }, {})
  const biggestCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
  const biggestCategory = biggestCategoryEntry
    ? `${EXPENSE_CATEGORY_LABELS[biggestCategoryEntry[0]]} (${formatCurrency(biggestCategoryEntry[1])})`
    : 'None yet'

  const pieData = Object.entries(categoryTotals)
    .map(([category, value]) => ({ name: EXPENSE_CATEGORY_LABELS[category], value }))
    .sort((a, b) => b.value - a.value)

  const chartData = months.map((m) => ({
    label: m.label,
    income: sumByRange(transactions, 'transaction_date', m.start, m.end),
    expenses: sumByRange(expenses, 'expense_date', m.start, m.end),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-wine">Accounting Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">Here's how the business is doing this month.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Wallet} label="Income This Month" value={formatCurrency(incomeThisMonth)} color="success" />
        <SummaryCard icon={Receipt} label="Expenses This Month" value={formatCurrency(expensesThisMonth)} color="danger" />
        <SummaryCard
          icon={PiggyBank}
          label="Cash on Hand"
          value={formatCurrency(cashOnHand)}
          color={cashOnHand >= 0 ? 'success' : 'danger'}
        />
        <SummaryCard icon={CreditCard} label="Total Utang Balance" value={formatCurrency(totalUtangBalance)} color="danger" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button as={Link} to="/admin/accounting/income/new" variant="success">
          <Plus className="w-4 h-4" />
          Record Income
        </Button>
        <Button as={Link} to="/admin/accounting/expenses/new" variant="danger">
          <Minus className="w-4 h-4" />
          Record Expense
        </Button>
        <Button as={Link} to="/admin/accounting/payables" variant="secondary">
          <CreditCard className="w-4 h-4" />
          Record Utang Payment
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Income This Year</p>
          <p className="text-lg font-bold text-text-dark mt-1">{formatCurrency(incomeThisYear)}</p>
          <p className="text-xs text-text-muted mt-1">Last month: {formatCurrency(incomeLastMonth)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Biggest Expense Category</p>
          <p className="text-lg font-bold text-text-dark mt-1">{biggestCategory}</p>
          <p className="text-xs text-text-muted mt-1">This month</p>
        </Card>
        <Card className={payables.length > 0 ? 'border-danger/30 bg-danger/5' : ''}>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide flex items-center gap-1">
            {payables.length > 0 && <AlertCircle className="w-3.5 h-3.5 text-danger" />}
            Unpaid / Partial Utang
          </p>
          <p className="text-lg font-bold text-text-dark mt-1">{payables.length}</p>
          <Link to="/admin/accounting/payables" className="text-xs text-wine hover:text-wine-dark mt-1 inline-block">
            View all →
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Income vs Expenses (Last 6 Months)">
          <IncomeExpenseChart data={chartData} />
        </Card>
        <Card title="Expense Breakdown This Month">
          <ExpenseCategoryChart data={pieData} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentList
          title="Recent Income"
          actions={
            <Link to="/admin/accounting/income" className="text-sm text-wine hover:text-wine-dark">
              View all
            </Link>
          }
          items={recentTransactions}
          emptyMessage="No income recorded yet."
          renderItem={(item) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-dark truncate">{item.client_name}</p>
                <p className="text-xs text-text-muted">
                  {INCOME_CATEGORY_LABELS[item.category]} · {formatDate(item.transaction_date)}
                </p>
              </div>
              <p className="text-sm font-semibold text-success shrink-0">+{formatCurrency(item.amount)}</p>
            </div>
          )}
        />
        <RecentList
          title="Recent Expenses"
          actions={
            <Link to="/admin/accounting/expenses" className="text-sm text-wine hover:text-wine-dark">
              View all
            </Link>
          }
          items={recentExpenses}
          emptyMessage="No expenses recorded yet."
          renderItem={(item) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-dark truncate">{item.description}</p>
                <p className="text-xs text-text-muted">
                  {EXPENSE_CATEGORY_LABELS[item.category]} · {formatDate(item.expense_date)}
                </p>
              </div>
              <p className="text-sm font-semibold text-danger shrink-0">-{formatCurrency(item.amount)}</p>
            </div>
          )}
        />
      </div>
    </div>
  )
}
