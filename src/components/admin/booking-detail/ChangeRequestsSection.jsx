import { useEffect, useState } from 'react'
import { Check, X, MessageSquareWarning } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import Badge from '../../ui/Badge'
import StatusBadge from '../../ui/StatusBadge'
import Textarea from '../../ui/Textarea'
import Spinner from '../../ui/Spinner'
import EmptyState from '../../ui/EmptyState'
import { formatDateTime } from '../../../lib/utils'
import { CHANGE_REQUEST_TYPE_LABELS } from '../../../lib/constants'

export default function ChangeRequestsSection({ bookingId }) {
  const { showToast } = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [responses, setResponses] = useState({})
  const [decidingId, setDecidingId] = useState(null)

  const loadRequests = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('change_requests')
      .select('*')
      .eq('booking_id', bookingId)
      .order('submitted_at', { ascending: false })

    if (error) {
      showToast(error.message, 'error')
    } else {
      setRequests(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])

  const handleDecision = async (request, status) => {
    setDecidingId(request.id)
    const { error } = await supabase
      .from('change_requests')
      .update({
        status,
        resolved_at: new Date().toISOString(),
        admin_response: responses[request.id]?.trim() || null,
      })
      .eq('id', request.id)
    setDecidingId(null)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast(status === 'approved' ? 'Request approved.' : 'Request rejected.')
    loadRequests()
  }

  return (
    <Card title="Change Requests">
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner className="w-6 h-6" />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={MessageSquareWarning}
          title="No change requests"
          description="Requests submitted by the client through their portal will appear here."
        />
      ) : (
        <ul className="space-y-4">
          {requests.map((request) => (
            <li key={request.id} className="rounded-lg border border-gold/15 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <Badge color="wine">{CHANGE_REQUEST_TYPE_LABELS[request.request_type] ?? request.request_type}</Badge>
                <StatusBadge status={request.status} />
              </div>
              <p className="text-sm text-text-dark whitespace-pre-wrap">{request.details}</p>
              <p className="text-xs text-text-muted mt-1">Submitted {formatDateTime(request.submitted_at)}</p>

              {request.status === 'pending' ? (
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder="Response to client (optional)"
                    value={responses[request.id] ?? ''}
                    onChange={(e) => setResponses((prev) => ({ ...prev, [request.id]: e.target.value }))}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={decidingId === request.id}
                      onClick={() => handleDecision(request, 'rejected')}
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </Button>
                    <Button size="sm" disabled={decidingId === request.id} onClick={() => handleDecision(request, 'approved')}>
                      <Check className="w-4 h-4" />
                      Approve
                    </Button>
                  </div>
                </div>
              ) : (
                request.admin_response && (
                  <p className="text-xs text-text-muted bg-cream rounded-lg px-3 py-2 mt-2 whitespace-pre-wrap">
                    Response: {request.admin_response}
                  </p>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
