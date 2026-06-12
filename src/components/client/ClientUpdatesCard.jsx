import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Spinner from '../ui/Spinner'
import EmptyState from '../ui/EmptyState'
import { formatDateTime } from '../../lib/utils'
import { UPDATE_TYPE_LABELS } from '../../lib/constants'

export default function ClientUpdatesCard({ accessToken }) {
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_booking_updates_by_token', { p_access_token: accessToken })
      if (cancelled) return
      if (!error) setUpdates(data ?? [])
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [accessToken])

  return (
    <Card title="Updates">
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner className="w-6 h-6" />
        </div>
      ) : updates.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No updates yet" description="Updates from your caterer will appear here." />
      ) : (
        <ul className="space-y-4">
          {updates.map((update) => (
            <li key={update.id}>
              <div className="flex items-center gap-2 mb-1">
                <Badge color="wine">{UPDATE_TYPE_LABELS[update.update_type] ?? update.update_type}</Badge>
                <span className="text-xs text-text-muted">{formatDateTime(update.created_at)}</span>
              </div>
              <p className="text-sm text-text-dark whitespace-pre-wrap">{update.message}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
