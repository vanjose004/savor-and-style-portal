import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { formatCurrency } from '../../lib/utils'
import { ADDON_REQUEST_STATUS_LABELS } from '../../lib/constants'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const STATUS_COLOR = { requested: 'gold', quoted: 'warning', accepted: 'success', declined: 'danger' }

export default function AddOns() {
  const { showToast } = useToast()
  const [bookingId, setBookingId] = useState(null)
  const [catalog, setCatalog] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const loadRequests = async (id) => {
    const { data } = await supabase.from('addon_requests').select('*').eq('booking_id', id)
    setRequests(data ?? [])
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data: bookingRows } = await supabase.rpc('get_my_booking_summary')
      const current = bookingRows?.[0]
      if (cancelled || !current) {
        setLoading(false)
        return
      }
      setBookingId(current.id)
      const [{ data: catalogRows }] = await Promise.all([supabase.rpc('get_active_addon_catalog'), loadRequests(current.id)])
      if (cancelled) return
      setCatalog(catalogRows ?? [])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const requestFor = (addonId) => requests.find((r) => r.addon_id === addonId)

  const requestAddon = async (addonId) => {
    const { error } = await supabase.from('addon_requests').insert({ booking_id: bookingId, addon_id: addonId })
    if (error) {
      showToast(error.message, 'error')
      return
    }
    showToast('Request sent to your coordinator.')
    loadRequests(bookingId)
  }

  const respondToQuote = async (requestId, status) => {
    const { error } = await supabase.from('addon_requests').update({ status }).eq('id', requestId)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadRequests(bookingId)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <Card title="Add-On Requests">
      {catalog.length === 0 ? (
        <EmptyState icon={Sparkles} title="No add-ons available right now" />
      ) : (
        <ul className="divide-y divide-gold/10">
          {catalog.map((addon) => {
            const request = requestFor(addon.id)
            return (
              <li key={addon.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-dark truncate">{addon.name}</p>
                  {addon.description && <p className="text-xs text-text-muted">{addon.description}</p>}
                  {addon.starting_price && <p className="text-xs text-text-muted">Starting at {formatCurrency(addon.starting_price)}</p>}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {!request ? (
                    <Button size="sm" variant="secondary" onClick={() => requestAddon(addon.id)}>
                      Request
                    </Button>
                  ) : request.status === 'quoted' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text-dark">{formatCurrency(request.quoted_price)}</span>
                      <Button size="sm" onClick={() => respondToQuote(request.id, 'accepted')}>
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => respondToQuote(request.id, 'declined')}>
                        Decline
                      </Button>
                    </div>
                  ) : (
                    <Badge color={STATUS_COLOR[request.status]}>{ADDON_REQUEST_STATUS_LABELS[request.status]}</Badge>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
