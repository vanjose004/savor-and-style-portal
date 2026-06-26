import { useEffect, useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import ChefEventCard from '../../components/chef/ChefEventCard'
import { formatDate } from '../../lib/utils'
import { cn } from '../../lib/utils'

const FILTERS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
]

export default function ChefDashboard() {
  const { showToast } = useToast()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('upcoming')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('chef_confirmed_bookings')
        .select('*')
        .order('event_date', { ascending: true })

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
  }, [showToast])

  const visibleBookings = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)

    let filtered = bookings
    if (filter === 'upcoming') filtered = bookings.filter((b) => b.event_date >= today)
    if (filter === 'past') filtered = bookings.filter((b) => b.event_date < today).reverse()

    const term = search.trim().toLowerCase()
    if (!term) return filtered

    return filtered.filter(
      (b) =>
        b.client_name?.toLowerCase().includes(term) ||
        b.event_date?.includes(term) ||
        formatDate(b.event_date).toLowerCase().includes(term)
    )
  }, [bookings, filter, search])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-wine">Confirmed Bookings</h1>
        <p className="text-sm text-text-muted mt-1">All confirmed events, soonest first.</p>
      </div>

      <Input
        placeholder="Search by client name or date..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            type="button"
            variant={filter === f.value ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter(f.value)}
            className={cn(filter !== f.value && 'text-text-muted')}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="w-8 h-8" />
        </div>
      ) : visibleBookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No bookings found"
          description="Confirmed bookings matching this filter will appear here."
        />
      ) : (
        <div className="space-y-3">
          {visibleBookings.map((booking) => (
            <ChefEventCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  )
}
