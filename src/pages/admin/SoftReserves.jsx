import { useEffect, useState } from 'react'
import { Inbox, Phone, Mail, Users, CalendarDays } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { formatDate, formatRelativeTime } from '../../lib/utils'
import { SOFT_RESERVE_STATUSES, SOFT_RESERVE_STATUS_LABELS, SOFT_RESERVE_STATUS_COLORS } from '../../lib/constants'

const STATUS_OPTIONS = SOFT_RESERVE_STATUSES.map((s) => ({ value: s, label: SOFT_RESERVE_STATUS_LABELS[s] }))

export default function SoftReserves() {
  const { showToast } = useToast()
  const [reserves, setReserves] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
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

      let query = supabase.from('soft_reserves').select('*').order('created_at', { ascending: false })
      if (statusFilter) query = query.eq('status', statusFilter)
      if (search) query = query.ilike('full_name', `%${search}%`)

      const { data, error } = await query

      if (cancelled) return
      if (error) {
        showToast(error.message, 'error')
      } else {
        setReserves(data ?? [])
      }
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [statusFilter, search, showToast])

  const handleStatusChange = async (id, status) => {
    const previous = reserves
    setReserves((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))

    const { error } = await supabase.from('soft_reserves').update({ status }).eq('id', id)
    if (error) {
      setReserves(previous)
      showToast(error.message, 'error')
    }
  }

  const newCount = reserves.filter((r) => r.status === 'new').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-wine">Soft Reserves</h1>
        <p className="text-sm text-text-muted mt-1">
          Leads submitted from the public landing page's Soft Reserve form.
        </p>
      </div>

      <Card className="border-warning/20 bg-warning/5">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide">New Leads Awaiting Follow-up</p>
        <p className="text-2xl font-bold text-warning mt-1">{newCount}</p>
      </Card>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Search by name"
            placeholder="Client name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            label="Status"
            placeholder="All statuses"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="w-8 h-8" />
        </div>
      ) : reserves.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No soft reserves found"
          description={
            statusFilter || search
              ? 'Try a different search or status filter.'
              : "Submissions from the landing page's Soft Reserve form will show up here."
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reserves.map((r) => (
            <Card key={r.id} className="h-full flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-text-dark truncate">{r.full_name}</p>
                  <p className="text-xs text-text-muted">{formatRelativeTime(r.created_at)}</p>
                </div>
                <Badge color={SOFT_RESERVE_STATUS_COLORS[r.status]}>{SOFT_RESERVE_STATUS_LABELS[r.status]}</Badge>
              </div>

              <div className="space-y-1.5 mt-2 text-sm">
                <div className="flex items-center gap-2 text-text-dark">
                  <CalendarDays className="w-3.5 h-3.5 text-gold shrink-0" />
                  <span>
                    {r.event_type} — {formatDate(r.event_date)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-text-dark">
                  <Users className="w-3.5 h-3.5 text-gold shrink-0" />
                  <span>{r.estimated_guests} pax</span>
                  {r.preferred_package && (
                    <Badge color="gold" className="ml-1">
                      {r.preferred_package}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-text-muted">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <a href={`tel:${r.contact_number}`} className="hover:text-wine transition-colors">
                    {r.contact_number}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-text-muted">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <a href={`mailto:${r.email}`} className="hover:text-wine transition-colors truncate">
                    {r.email}
                  </a>
                </div>
              </div>

              {r.message && (
                <p className="mt-3 pt-3 border-t border-gold/10 text-sm text-text-muted italic">"{r.message}"</p>
              )}

              <div className="mt-auto pt-4">
                <Select
                  label="Update status"
                  options={STATUS_OPTIONS}
                  value={r.status}
                  onChange={(e) => handleStatusChange(r.id, e.target.value)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
