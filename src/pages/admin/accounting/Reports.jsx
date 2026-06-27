import { useEffect, useState } from 'react'
import { Printer, FileDown, Wallet, Receipt, TrendingUp, TrendingDown } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Select from '../../../components/ui/Select'
import Badge from '../../../components/ui/Badge'
import Spinner from '../../../components/ui/Spinner'
import SummaryCard from '../../../components/ui/SummaryCard'
import { formatCurrency, formatDate, getMonthBounds } from '../../../lib/utils'
import {
  BUSINESS,
  MONTH_OPTIONS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORY_LABELS,
  EXPENSE_CATEGORY_LABELS,
  PAYABLE_STATUS_LABELS,
  PAYABLE_STATUS_COLORS,
} from '../../../lib/constants'

const now = new Date()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

export default function Reports() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [expenses, setExpenses] = useState([])
  const [payables, setPayables] = useState([])
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      const [txRes, expRes, payRes] = await Promise.all([
        supabase.from('transactions').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('payables').select('*'),
      ])

      if (cancelled) return

      for (const res of [txRes, expRes, payRes]) {
        if (res.error) showToast(res.error.message, 'error')
      }

      setTransactions(txRes.data ?? [])
      setExpenses(expRes.data ?? [])
      setPayables(payRes.data ?? [])
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [showToast])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  const { start: monthStart, end: monthEnd } = getMonthBounds(new Date(year, month, 1))
  const monthLabel = `${MONTH_OPTIONS[month].label} ${year}`

  const monthTransactions = transactions.filter((t) => t.transaction_date >= monthStart && t.transaction_date <= monthEnd)
  const monthExpenses = expenses.filter((e) => e.expense_date >= monthStart && e.expense_date <= monthEnd)

  const totalIncome = monthTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const netProfit = totalIncome - totalExpenses

  const expensesByCategory = EXPENSE_CATEGORIES.map((category) => ({
    category,
    label: EXPENSE_CATEGORY_LABELS[category],
    amount: monthExpenses.filter((e) => e.category === category).reduce((sum, e) => sum + Number(e.amount), 0),
  }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const monthEntries = [
    ...monthTransactions.map((t) => ({
      id: `t-${t.id}`,
      date: t.transaction_date,
      type: 'income',
      label: t.client_name,
      category: INCOME_CATEGORY_LABELS[t.category],
      amount: Number(t.amount),
    })),
    ...monthExpenses.map((e) => ({
      id: `e-${e.id}`,
      date: e.expense_date,
      type: 'expense',
      label: e.description,
      category: EXPENSE_CATEGORY_LABELS[e.category],
      amount: Number(e.amount),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const eventMap = new Map()
  transactions.forEach((t) => {
    if (!t.booking_ref) return
    const entry = eventMap.get(t.booking_ref) || { bookingRef: t.booking_ref, income: 0, expenses: 0 }
    entry.income += Number(t.amount)
    eventMap.set(t.booking_ref, entry)
  })
  expenses.forEach((e) => {
    if (!e.booking_ref) return
    const entry = eventMap.get(e.booking_ref) || { bookingRef: e.booking_ref, income: 0, expenses: 0 }
    entry.expenses += Number(e.amount)
    eventMap.set(e.booking_ref, entry)
  })
  const eventRows = Array.from(eventMap.values())
    .map((e) => ({ ...e, profit: e.income - e.expenses }))
    .sort((a, b) => a.bookingRef.localeCompare(b.bookingRef))

  const outstandingPayables = payables.filter((p) => p.status !== 'paid').sort((a, b) => Number(b.balance) - Number(a.balance))
  const totalOutstanding = outstandingPayables.reduce((sum, p) => sum + Number(p.balance), 0)

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPdf = () => {
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text(BUSINESS.name, 14, 18)
    doc.setFontSize(11)
    doc.text(`Accounting Report — ${monthLabel}`, 14, 26)

    autoTable(doc, {
      startY: 34,
      head: [['Monthly Summary', '']],
      body: [
        ['Total Income', formatCurrency(totalIncome)],
        ['Total Expenses', formatCurrency(totalExpenses)],
        ['Net Profit / Loss', formatCurrency(netProfit)],
      ],
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Expense Category', 'Amount']],
      body: expensesByCategory.length ? expensesByCategory.map((c) => [c.label, formatCurrency(c.amount)]) : [['No expenses recorded this month', '']],
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Date', 'Type', 'Description', 'Category', 'Amount']],
      body: monthEntries.length
        ? monthEntries.map((e) => [formatDate(e.date), e.type === 'income' ? 'Income' : 'Expense', e.label, e.category, formatCurrency(e.amount)])
        : [['—', '—', 'No transactions recorded this month', '—', '—']],
    })

    doc.addPage()
    doc.setFontSize(14)
    doc.text('Event Profitability', 14, 18)
    autoTable(doc, {
      startY: 26,
      head: [['Booking Ref', 'Income', 'Expenses', 'Profit / Loss']],
      body: eventRows.length
        ? eventRows.map((e) => [e.bookingRef, formatCurrency(e.income), formatCurrency(e.expenses), formatCurrency(e.profit)])
        : [['—', '—', '—', 'No event-linked records yet']],
    })

    doc.setFontSize(14)
    doc.text('Utang / Payables Summary', 14, doc.lastAutoTable.finalY + 14)
    doc.setFontSize(10)
    doc.text(`Total Outstanding: ${formatCurrency(totalOutstanding)}`, 14, doc.lastAutoTable.finalY + 20)
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 26,
      head: [['Creditor', 'Description', 'Total', 'Paid', 'Balance', 'Status']],
      body: outstandingPayables.length
        ? outstandingPayables.map((p) => [
            p.creditor_name,
            p.description,
            formatCurrency(p.total_amount),
            formatCurrency(p.amount_paid),
            formatCurrency(p.balance),
            PAYABLE_STATUS_LABELS[p.status],
          ])
        : [['—', 'No outstanding utang', '—', '—', '—', '—']],
    })

    doc.save(`savor-and-style-report-${year}-${String(month + 1).padStart(2, '0')}.pdf`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-wine">Financial Reports</h1>
          <p className="text-sm text-text-muted mt-1">Monthly summary, event profitability, and utang overview.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="secondary" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button variant="primary" onClick={handleDownloadPdf}>
            <FileDown className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      </div>

      <Card className="print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Month" options={MONTH_OPTIONS} value={month} onChange={(e) => setMonth(Number(e.target.value))} />
          <Select
            label="Year"
            options={YEAR_OPTIONS.map((y) => ({ value: y, label: String(y) }))}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="font-heading text-lg font-semibold text-wine">Monthly Summary — {monthLabel}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard icon={Wallet} label="Total Income" value={formatCurrency(totalIncome)} color="success" />
          <SummaryCard icon={Receipt} label="Total Expenses" value={formatCurrency(totalExpenses)} color="danger" />
          <SummaryCard
            icon={netProfit >= 0 ? TrendingUp : TrendingDown}
            label="Net Profit / Loss"
            value={formatCurrency(netProfit)}
            color={netProfit >= 0 ? 'success' : 'danger'}
          />
        </div>

        <Card title="Expenses by Category">
          {expensesByCategory.length === 0 ? (
            <p className="text-sm text-text-muted">No expenses recorded this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-text-muted">
                  <tr>
                    <th className="text-left font-medium px-2 py-2">Category</th>
                    <th className="text-right font-medium px-2 py-2">Amount</th>
                    <th className="text-right font-medium px-2 py-2">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/10">
                  {expensesByCategory.map((c) => (
                    <tr key={c.category}>
                      <td className="px-2 py-2 text-text-dark">{c.label}</td>
                      <td className="px-2 py-2 text-right font-medium text-danger whitespace-nowrap">{formatCurrency(c.amount)}</td>
                      <td className="px-2 py-2 text-right text-text-muted whitespace-nowrap">
                        {totalExpenses > 0 ? `${Math.round((c.amount / totalExpenses) * 100)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gold/20">
                    <td className="px-2 py-2 font-semibold text-text-dark">Total Expenses</td>
                    <td className="px-2 py-2 text-right font-bold text-danger whitespace-nowrap">{formatCurrency(totalExpenses)}</td>
                    <td className="px-2 py-2 text-right text-text-muted">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        <Card title="All Transactions">
          {monthEntries.length === 0 ? (
            <p className="text-sm text-text-muted">No income or expenses recorded this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-text-muted">
                  <tr>
                    <th className="text-left font-medium px-2 py-2">Date</th>
                    <th className="text-left font-medium px-2 py-2">Type</th>
                    <th className="text-left font-medium px-2 py-2">Description</th>
                    <th className="text-left font-medium px-2 py-2">Category</th>
                    <th className="text-right font-medium px-2 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/10">
                  {monthEntries.map((e) => (
                    <tr key={e.id}>
                      <td className="px-2 py-2 whitespace-nowrap text-text-muted">{formatDate(e.date)}</td>
                      <td className="px-2 py-2">
                        <Badge color={e.type === 'income' ? 'success' : 'danger'}>{e.type === 'income' ? 'Income' : 'Expense'}</Badge>
                      </td>
                      <td className="px-2 py-2 text-text-dark">{e.label}</td>
                      <td className="px-2 py-2 text-text-muted">{e.category}</td>
                      <td className={`px-2 py-2 text-right font-medium whitespace-nowrap ${e.type === 'income' ? 'text-success' : 'text-danger'}`}>
                        {e.type === 'income' ? '+' : '-'}
                        {formatCurrency(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading text-lg font-semibold text-wine">Event Profitability</h2>
        <Card>
          {eventRows.length === 0 ? (
            <p className="text-sm text-text-muted">No income or expenses linked to a booking reference yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-text-muted">
                  <tr>
                    <th className="text-left font-medium px-2 py-2">Booking Ref</th>
                    <th className="text-right font-medium px-2 py-2">Income</th>
                    <th className="text-right font-medium px-2 py-2">Expenses</th>
                    <th className="text-right font-medium px-2 py-2">Profit / Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/10">
                  {eventRows.map((e) => (
                    <tr key={e.bookingRef}>
                      <td className="px-2 py-2 font-medium text-text-dark">{e.bookingRef}</td>
                      <td className="px-2 py-2 text-right text-success whitespace-nowrap">{formatCurrency(e.income)}</td>
                      <td className="px-2 py-2 text-right text-danger whitespace-nowrap">{formatCurrency(e.expenses)}</td>
                      <td className={`px-2 py-2 text-right font-semibold whitespace-nowrap ${e.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(e.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading text-lg font-semibold text-wine">Utang Summary</h2>
        <Card className="border-danger/20 bg-danger/5">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Total Outstanding Utang</p>
          <p className="text-2xl font-bold text-danger mt-1">{formatCurrency(totalOutstanding)}</p>
        </Card>
        <Card title="Creditors">
          {outstandingPayables.length === 0 ? (
            <p className="text-sm text-text-muted">No outstanding utang.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-text-muted">
                  <tr>
                    <th className="text-left font-medium px-2 py-2">Creditor</th>
                    <th className="text-left font-medium px-2 py-2">Description</th>
                    <th className="text-right font-medium px-2 py-2">Balance</th>
                    <th className="text-left font-medium px-2 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/10">
                  {outstandingPayables.map((p) => (
                    <tr key={p.id}>
                      <td className="px-2 py-2 font-medium text-text-dark">{p.creditor_name}</td>
                      <td className="px-2 py-2 text-text-muted">{p.description}</td>
                      <td className="px-2 py-2 text-right font-semibold text-danger whitespace-nowrap">{formatCurrency(p.balance)}</td>
                      <td className="px-2 py-2">
                        <Badge color={PAYABLE_STATUS_COLORS[p.status]}>{PAYABLE_STATUS_LABELS[p.status]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
