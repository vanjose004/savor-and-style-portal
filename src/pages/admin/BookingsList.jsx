import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { BOOKING_STATUSES, EVENT_TYPES } from '../../lib/constants'
import { formatCurrency, getDaysUntil, getPaymentProgress } from '../../lib/utils'

const STATUS_OPTIONS = BOOKING_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}))

function getCountdown(eventDate) {
  const days = getDaysUntil(eventDate)
  if (days === null) return { label: '—', color: 'default' }

  const label = days < 0 ? 'OVERDUE' : days === 0 ? 'TODAY' : days === 1 ? 'TOMORROW' : `${days} days away`
  const color = days <= 3 ? 'danger' : days <= 7 ? 'warning' : 'success'
  return { label, color }
}

export default function BookingsList() {
  const { showToast } = useToast()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState({ status: '', eventType: '', dateFrom: '', dateTo: '', search: '' })
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
        .from('bookings')
        .select(
          'id, booking_code, event_type, event_date, event_time, pax, status, total_amount, balance, clients!inner(name)'
        )
        .order('event_date', { ascending: true })

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.eventType) query = query.eq('event_type', filters.eventType)
      if (filters.dateFrom) query = query.gte('event_date', filters.dateFrom)
      if (filters.dateTo) query = query.lte('event_date', filters.dateTo)
      if (filters.search) query = query.ilike('clients.name', `%${filters.search}%`)

      const { data, error } = await query

      if (cancelled) return

      if (error) {
        showToast(error.message, 'error')
      } else {
        setBookings(data ?? [])
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
    setFilters({ status: '', eventType: '', dateFrom: '', dateTo: '', search: '' })
  }

  const hasActiveFilters = Boolean(
    filters.status || filters.eventType || filters.dateFrom || filters.dateTo || filters.search
  )

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('bookings').delete().eq('id', deleteTarget.id)
    setDeleting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    setBookings((prev) => prev.filter((b) => b.id !== deleteTarget.id))
    setDeleteTarget(null)
    showToast('Booking deleted.')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-wine">Bookings</h1>
          <p className="text-sm text-text-muted mt-1">View, filter, and manage all bookings.</p>
        </div>
        <Button as={Link} to="/admin/bookings/new">
          <Plus className="w-4 h-4" />
          New Booking
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            label="Search by client"
            placeholder="Client name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            label="Status"
            placeholder="All statuses"
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          />
          <Select
            label="Event type"
            placeholder="All event types"
            options={EVENT_TYPES}
            value={filters.eventType}
            onChange={(e) => setFilters((prev) => ({ ...prev, eventType: e.target.value }))}
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
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No bookings found"
          description={
            hasActiveFilters
              ? 'Try adjusting or clearing your filters.'
              : 'Create your first booking to get started.'
          }
          action={
            !hasActiveFilters && (
              <Button as={Link} to="/admin/bookings/new">
                <Plus className="w-4 h-4" />
                New Booking
              </Button>
            )
          }
        />
      ) : (
        <div className="bg-warm-white rounded-xl border border-gold/20 shadow-sm divide-y divide-gold/10">
          {bookings.map((booking) => {
            const countdown = getCountdown(booking.event_date)
            const { paid, remaining } = getPaymentProgress(booking.total_amount, booking.balance)

            return (
              <div key={booking.id} className="flex items-center gap-3 px-4 py-3 hover:bg-cream/50 transition-colors">
                <Badge color={countdown.color} className="shrink-0 w-24 justify-center">
                  {countdown.label}
                </Badge>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-dark truncate">
                    {booking.clients?.name ?? 'Unknown client'}
                  </p>
                  <p className="text-xs text-text-muted truncate">{booking.event_type}</p>
                </div>

                <div className="hidden sm:block w-16 text-right text-sm text-text-dark shrink-0">
                  {booking.pax ?? '—'} pax
                </div>

                <div className="hidden md:block w-28 text-right shrink-0">
                  <p className="text-xs text-text-muted">Paid</p>
                  <p className="text-sm font-medium text-success">{formatCurrency(paid)}</p>
                </div>

                <div className="hidden md:block w-28 text-right shrink-0">
                  <p className="text-xs text-text-muted">Balance</p>
                  <p className="text-sm font-medium text-danger">{formatCurrency(remaining)}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button as={Link} to={`/admin/bookings/${booking.id}`} variant="secondary" size="sm">
                    View
                  </Button>
                  <Button
                    as={Link}
                    to={`/admin/bookings/${booking.id}/edit`}
                    variant="ghost"
                    size="sm"
                    aria-label="Edit booking"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger/10"
                    aria-label="Delete booking"
                    onClick={() => setDeleteTarget(booking)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Booking"
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
          Are you sure you want to delete booking <strong>{deleteTarget?.booking_code}</strong> for{' '}
          <strong>{deleteTarget?.clients?.name}</strong>? This will permanently remove the booking and
          all associated payments, menu items, and updates. This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
