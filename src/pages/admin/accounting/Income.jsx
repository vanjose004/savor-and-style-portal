import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Wallet, Trash2 } from 'lucide-react'
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
import { INCOME_CATEGORIES, INCOME_CATEGORY_LABELS, INCOME_PAYMENT_METHODS } from '../../../lib/constants'

const CATEGORY_OPTIONS = INCOME_CATEGORIES.map((c) => ({ value: c, label: INCOME_CATEGORY_LABELS[c] }))

export default function Income() {
  const { showToast } = useToast()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState({ category: '', paymentMethod: '', dateFrom: '', dateTo: '', search: '' })
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
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.category) query = query.eq('category', filters.category)
      if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod)
      if (filters.dateFrom) query = query.gte('transaction_date', filters.dateFrom)
      if (filters.dateTo) query = query.lte('transaction_date', filters.dateTo)
      if (filters.search) {
        query = query.or(`client_name.ilike.%${filters.search}%,booking_ref.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (cancelled) return

      if (error) {
        showToast(error.message, 'error')
      } else {
        setTransactions(data ?? [])
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
    setFilters({ category: '', paymentMethod: '', dateFrom: '', dateTo: '', search: '' })
  }

  const hasActiveFilters = Boolean(
    filters.category || filters.paymentMethod || filters.dateFrom || filters.dateTo || filters.search
  )

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('transactions').delete().eq('id', deleteTarget.id)
    setDeleting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    setTransactions((prev) => prev.filter((t) => t.id !== deleteTarget.id))
    setDeleteTarget(null)
    showToast('Income entry deleted.')
  }

  const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-wine">Income</h1>
          <p className="text-sm text-text-muted mt-1">All money coming into the business.</p>
        </div>
        <Button as={Link} to="/admin/accounting/income/new" variant="success">
          <Plus className="w-4 h-4" />
          Record Income
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            label="Search"
            placeholder="Client or booking ref..."
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
            label="Payment Method"
            placeholder="All methods"
            options={INCOME_PAYMENT_METHODS}
            value={filters.paymentMethod}
            onChange={(e) => setFilters((prev) => ({ ...prev, paymentMethod: e.target.value }))}
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
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No income recorded"
          description={hasActiveFilters ? 'Try adjusting or clearing your filters.' : 'Record your first income entry to get started.'}
          action={
            !hasActiveFilters && (
              <Button as={Link} to="/admin/accounting/income/new" variant="success">
                <Plus className="w-4 h-4" />
                Record Income
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
                  <th className="text-left font-medium px-4 py-3">Client</th>
                  <th className="text-left font-medium px-4 py-3">Category</th>
                  <th className="text-left font-medium px-4 py-3">Payment Method</th>
                  <th className="text-right font-medium px-4 py-3">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/10">
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-text-muted">{formatDate(t.transaction_date)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-dark">{t.client_name}</p>
                      {t.booking_ref && <p className="text-xs text-text-muted">{t.booking_ref}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color="success">{INCOME_CATEGORY_LABELS[t.category]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{t.payment_method}</td>
                    <td className="px-4 py-3 text-right font-semibold text-success whitespace-nowrap">
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeleteTarget(t)}
                        aria-label="Delete income entry"
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
                    Total Income
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-success whitespace-nowrap">{formatCurrency(total)}</td>
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
        title="Delete Income Entry"
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
          Are you sure you want to delete this income entry of <strong>{formatCurrency(deleteTarget?.amount)}</strong> from{' '}
          <strong>{deleteTarget?.client_name}</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
