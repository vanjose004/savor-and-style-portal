import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Receipt, Trash2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Modal from '../../../components/ui/Modal'
import Badge from '../../../components/ui/Badge'
import Spinner from '../../../components/ui/Spinner'
import EmptyState from '../../../components/ui/EmptyState'
import { formatCurrency, formatDate } from '../../../lib/utils'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from '../../../lib/constants'

const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((c) => ({ value: c, label: EXPENSE_CATEGORY_LABELS[c] }))

const TYPE_OPTIONS = [
  { value: 'event', label: 'Event Expenses' },
  { value: 'general', label: 'General Expenses' },
]

export default function Expenses() {
  const { showToast } = useToast()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState({ category: '', type: '', dateFrom: '', dateTo: '', search: '' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput.trim() }))
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      let query = supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.category) query = query.eq('category', filters.category)
      if (filters.type === 'event') query = query.eq('is_event_expense', true)
      if (filters.type === 'general') query = query.eq('is_event_expense', false)
      if (filters.dateFrom) query = query.gte('expense_date', filters.dateFrom)
      if (filters.dateTo) query = query.lte('expense_date', filters.dateTo)
      if (filters.search) {
        query = query.ilike('description', `%${filters.search}%`)
      }

      const { data, error } = await query

      if (cancelled) return

      if (error) {
        showToast(error.message, 'error')
      } else {
        setExpenses(data ?? [])
      }
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [filters, showToast])

  const handleClearFilters = () => {
    setSearchInput('')
    setFilters({ category: '', type: '', dateFrom: '', dateTo: '', search: '' })
  }

  const hasActiveFilters = Boolean(filters.category || filters.type || filters.dateFrom || filters.dateTo || filters.search)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('expenses').delete().eq('id', deleteTarget.id)
    setDeleting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    setExpenses((prev) => prev.filter((e) => e.id !== deleteTarget.id))
    setDeleteTarget(null)
    showToast('Expense deleted.')
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-wine">Expenses</h1>
          <p className="text-sm text-text-muted mt-1">All money going out of the business.</p>
        </div>
        <Button as={Link} to="/admin/accounting/expenses/new" variant="danger">
          <Plus className="w-4 h-4" />
          Record Expense
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            label="Search"
            placeholder="Search description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            label="Category"
            placeholder="All categories"
            options={CATEGORY_OPTIONS}
            value={filters.category}
            onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
          />
          <Select
            label="Type"
            placeholder="Event & General"
            options={TYPE_OPTIONS}
            value={filters.type}
            onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
          />
          <Input
            type="date"
            label="From date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
          />
          <Input
            type="date"
            label="To date"
            value={filters.dateTo}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
          />
        </div>
        {hasActiveFilters && (
          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="w-8 h-8" />
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses recorded"
          description={hasActiveFilters ? 'Try adjusting or clearing your filters.' : 'Record your first expense to get started.'}
          action={
            !hasActiveFilters && (
              <Button as={Link} to="/admin/accounting/expenses/new" variant="danger">
                <Plus className="w-4 h-4" />
                Record Expense
              </Button>
            )
          }
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream text-text-muted">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Date</th>
                  <th className="text-left font-medium px-4 py-3">Description</th>
                  <th className="text-left font-medium px-4 py-3">Category</th>
                  <th className="text-left font-medium px-4 py-3">Type</th>
                  <th className="text-right font-medium px-4 py-3">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/10">
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-text-muted">{formatDate(e.expense_date)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-dark">{e.description}</p>
                      {e.booking_ref && <p className="text-xs text-text-muted">{e.booking_ref}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color="danger">{EXPENSE_CATEGORY_LABELS[e.category]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={e.is_event_expense ? 'gold' : 'default'}>{e.is_event_expense ? 'Event' : 'General'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-danger whitespace-nowrap">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeleteTarget(e)}
                        aria-label="Delete expense"
                        className="text-text-muted hover:text-danger transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gold/20 bg-cream/50">
                  <td colSpan={4} className="px-4 py-3 text-right font-semibold text-text-dark">
                    Total Expenses
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-danger whitespace-nowrap">{formatCurrency(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Expense"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-dark">
          Are you sure you want to delete the expense <strong>{deleteTarget?.description}</strong> of{' '}
          <strong>{formatCurrency(deleteTarget?.amount)}</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
