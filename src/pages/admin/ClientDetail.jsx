import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, CalendarDays, Wallet, Receipt } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import StatusBadge from '../../components/ui/StatusBadge'
import StatCard from '../../components/ui/StatCard'
import PaymentProgressBar from '../../components/ui/PaymentProgressBar'
import EmptyState from '../../components/ui/EmptyState'
import Field from '../../components/ui/Field'
import EditClientModal from '../../components/admin/clients/EditClientModal'
import { formatCurrency, formatDate, formatTime } from '../../lib/utils'

export default function ClientDetail() {
  const { id } = useParams()
  const { showToast } = useToast()
  const [client, setClient] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  const load = useCallback(async () => {
    const [clientRes, bookingsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase
        .from('bookings')
        .select('id, booking_code, event_type, event_date, event_time, status, total_amount, balance')
        .eq('client_id', id)
        .order('event_date', { ascending: false }),
    ])

    if (clientRes.error) {
      showToast(clientRes.error.message, 'error')
      return
    }
    setClient(clientRes.data)
    if (!bookingsRes.error) setBookings(bookingsRes.data ?? [])
  }, [id, showToast])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!client) {
    return <p className="text-sm text-text-muted">Client not found.</p>
  }

  const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.total_amount), 0)
  const outstanding = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + Number(b.balance), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link to="/admin/clients" className="inline-flex items-center gap-1 text-sm text-wine hover:underline mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Clients
          </Link>
          <h1 className="font-heading text-2xl font-bold text-wine">{client.name}</h1>
        </div>
        <Button variant="secondary" onClick={() => setEditOpen(true)}>
          <Pencil className="w-4 h-4" /> Edit Client
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={CalendarDays} label="Bookings" value={bookings.length} />
        <StatCard icon={Wallet} label="Total Revenue" value={formatCurrency(totalRevenue)} />
        <StatCard icon={Receipt} label="Outstanding Balance" value={formatCurrency(outstanding)} />
      </div>

      <Card title="Contact Information">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Phone" value={client.phone || '—'} />
          <Field label="Email" value={client.email || '—'} />
          <Field label="Address" value={client.address || '—'} />
          <Field label="Client Since" value={formatDate(client.created_at?.slice(0, 10))} />
        </dl>
      </Card>

      <Card title="Booking History">
        {bookings.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No bookings yet"
            description="Bookings for this client will appear here."
          />
        ) : (
          <ul className="divide-y divide-gold/10">
            {bookings.map((booking) => (
              <li key={booking.id}>
                <Link
                  to={`/admin/bookings/${booking.id}`}
                  className="flex items-center justify-between gap-4 py-3 -mx-2 px-2 rounded-lg hover:bg-cream/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-dark">
                      {booking.booking_code} · {booking.event_type}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {formatDate(booking.event_date)}
                      {booking.event_time ? ` · ${formatTime(booking.event_time)}` : ''}
                    </p>
                    <div className="mt-2 max-w-xs">
                      <PaymentProgressBar totalAmount={booking.total_amount} balance={booking.balance} showLabels={false} />
                    </div>
                  </div>
                  <StatusBadge status={booking.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <EditClientModal open={editOpen} onClose={() => setEditOpen(false)} client={client} onSaved={load} />
    </div>
  )
}
