import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, CreditCard, Calendar, Pencil } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Select from '../../../components/ui/Select'
import Badge from '../../../components/ui/Badge'
import Spinner from '../../../components/ui/Spinner'
import EmptyState from '../../../components/ui/EmptyState'
import ProgressBar from '../../../components/ui/ProgressBar'
import EditPayableModal from '../../../components/admin/accounting/EditPayableModal'
import { formatCurrency, formatDate, getPayableProgress } from '../../../lib/utils'
import { PAYABLE_STATUSES, PAYABLE_STATUS_LABELS, PAYABLE_STATUS_COLORS } from '../../../lib/constants'

const STATUS_OPTIONS = PAYABLE_STATUSES.map((s) => ({ value: s, label: PAYABLE_STATUS_LABELS[s] }))

const SORT_OPTIONS = [
  { value: 'due_date', label: 'Due Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'status', label: 'Status' },
]

const STATUS_ORDER = { unpaid: 0, partial: 1, paid: 2 }

export default function Payables() {
  const { showToast } = useToast()
  const [payables, setPayables] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('due_date')
  const [editTarget, setEditTarget] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      let query = supabase.from('payables').select('*')
      if (statusFilter) query = query.eq('status', statusFilter)

      const { data, error } = await query

      if (cancelled) return

      if (error) {
        showToast(error.message, 'error')
      } else {
        setPayables(data ?? [])
      }
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [statusFilter, showToast])

  const sorted = [...payables].sort((a, b) => {
    if (sortBy === 'amount') return Number(b.total_amount) - Number(a.total_amount)
    if (sortBy === 'status') return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date.localeCompare(b.due_date)
  })

  const totalBalance = payables.reduce((sum, p) => sum + Number(p.balance), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-wine">Utang / Payables</h1>
          <p className="text-sm text-text-muted mt-1">Money the business owes to suppliers and others.</p>
        </div>
        <Button as={Link} to="/admin/accounting/payables/new" variant="primary">
          <Plus className="w-4 h-4" />
          Add Utang
        </Button>
      </div>

      <Card className="border-danger/20 bg-danger/5">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Total Outstanding Balance</p>
        <p className="text-2xl font-bold text-danger mt-1">{formatCurrency(totalBalance)}</p>
      </Card>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Status"
            placeholder="All statuses"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <Select label="Sort by" options={SORT_OPTIONS} value={sortBy} onChange={(e) => setSortBy(e.target.value)} />
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="w-8 h-8" />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No utang recorded"
          description={
            statusFilter ? 'Try a different status filter.' : 'Add your first utang entry to start tracking what the business owes.'
          }
          action={
            !statusFilter && (
              <Button as={Link} to="/admin/accounting/payables/new" variant="primary">
                <Plus className="w-4 h-4" />
                Add Utang
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((p) => (
            <Link key={p.id} to={`/admin/accounting/payables/${p.id}`}>
              <Card className="h-full hover:border-wine/40 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-text-dark">{p.creditor_name}</p>
                    <p className="text-sm text-text-muted">{p.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge color={PAYABLE_STATUS_COLORS[p.status]}>{PAYABLE_STATUS_LABELS[p.status]}</Badge>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setEditTarget(p)
                      }}
                      aria-label="Edit utang"
                      className="text-text-muted hover:text-wine transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Total</span>
                    <span className="font-medium text-text-dark">{formatCurrency(p.total_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Paid</span>
                    <span className="font-medium text-success">{formatCurrency(p.amount_paid)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Balance</span>
                    <span className="font-semibold text-danger">{formatCurrency(p.balance)}</span>
                  </div>
                </div>

                <ProgressBar
                  percent={getPayableProgress(p.total_amount, p.amount_paid)}
                  color={PAYABLE_STATUS_COLORS[p.status]}
                  className="mt-3"
                />

                {p.due_date && (
                  <p className="flex items-center gap-1 text-xs text-text-muted mt-3">
                    <Calendar className="w-3.5 h-3.5" />
                    Due {formatDate(p.due_date)}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <EditPayableModal
        payable={editTarget}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={(updated) => {
          setPayables((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
          setEditTarget(null)
        }}
      />
    </div>
  )
}
