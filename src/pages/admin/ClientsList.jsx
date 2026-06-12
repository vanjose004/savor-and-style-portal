import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { formatCurrency } from '../../lib/utils'

export default function ClientsList() {
  const { showToast } = useToast()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      let query = supabase
        .from('clients')
        .select('id, name, phone, email, bookings(id, total_amount, balance, status)')
        .order('name')

      if (search) query = query.ilike('name', `%${search}%`)

      const { data, error } = await query

      if (cancelled) return
      if (error) {
        showToast(error.message, 'error')
      } else {
        setClients(data ?? [])
      }
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [search, showToast])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-wine">Clients</h1>
        <p className="text-sm text-text-muted mt-1">All clients and their booking history.</p>
      </div>

      <Card>
        <Input
          label="Search by name"
          placeholder="Client name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="w-8 h-8" />
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients found"
          description="Clients are added automatically when you create a booking."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clients.map((client) => {
            const bookings = client.bookings ?? []
            const outstanding = bookings
              .filter((b) => b.status !== 'cancelled')
              .reduce((sum, b) => sum + Number(b.balance), 0)

            return (
              <Link key={client.id} to={`/admin/clients/${client.id}`}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-text-dark truncate">{client.name}</h3>
                      <p className="text-sm text-text-muted truncate">{client.phone || client.email || '—'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted shrink-0 mt-1" />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gold/10 text-sm">
                    <span className="text-text-muted">
                      {bookings.length} booking{bookings.length === 1 ? '' : 's'}
                    </span>
                    <span className={outstanding > 0 ? 'text-danger font-medium' : 'text-text-muted'}>
                      {outstanding > 0 ? `${formatCurrency(outstanding)} due` : 'No balance due'}
                    </span>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
