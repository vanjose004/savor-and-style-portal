import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Select from '../ui/Select'
import Textarea from '../ui/Textarea'
import Badge from '../ui/Badge'
import StatusBadge from '../ui/StatusBadge'
import { formatDateTime } from '../../lib/utils'
import { CHANGE_REQUEST_TYPES, CHANGE_REQUEST_TYPE_LABELS } from '../../lib/constants'

const REQUEST_TYPE_OPTIONS = CHANGE_REQUEST_TYPES.map((value) => ({ value, label: CHANGE_REQUEST_TYPE_LABELS[value] }))
const POLL_INTERVAL_MS = 15000

export default function ChangeRequestCard({ accessToken }) {
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [requests, setRequests] = useState([])
  const previousRequestsRef = useRef([])
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { request_type: CHANGE_REQUEST_TYPES[0], details: '' } })

  const loadRequests = async () => {
    const { data, error } = await supabase.rpc('get_change_requests_by_token', { p_access_token: accessToken })
    if (error) return
    setRequests(data ?? [])
  }

  useEffect(() => {
    loadRequests()
    const interval = setInterval(loadRequests, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  // Ref access stays confined to this effect (never reachable from the
  // render-time handleSubmit(onSubmit) call below) so the request/response
  // React Compiler doesn't flag it as an unsafe render-time ref read.
  useEffect(() => {
    const previousStatusById = Object.fromEntries(previousRequestsRef.current.map((r) => [r.id, r.status]))

    for (const request of requests) {
      if (previousStatusById[request.id] === 'pending' && request.status !== 'pending') {
        showToast(
          request.status === 'approved'
            ? `Your ${CHANGE_REQUEST_TYPE_LABELS[request.request_type]?.toLowerCase() ?? 'change'} request was approved.`
            : `Your ${CHANGE_REQUEST_TYPE_LABELS[request.request_type]?.toLowerCase() ?? 'change'} request was not approved.`,
          request.status === 'approved' ? 'success' : 'error'
        )
      }
    }

    previousRequestsRef.current = requests
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests])

  const onSubmit = async (values) => {
    setSubmitting(true)
    const { error } = await supabase.rpc('submit_change_request_by_token', {
      p_access_token: accessToken,
      p_request_type: values.request_type,
      p_details: values.details.trim(),
    })
    setSubmitting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast('Request submitted. We will get back to you soon.')
    reset({ request_type: values.request_type, details: '' })
    loadRequests()
  }

  return (
    <Card title="Change Requests">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select label="Request Type" options={REQUEST_TYPE_OPTIONS} {...register('request_type', { required: true })} />
        <Textarea
          label="Details"
          placeholder="Tell us what you'd like to change…"
          error={errors.details?.message}
          {...register('details', { required: 'Please describe your request' })}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting…' : 'Submit Request'}
          </Button>
        </div>
      </form>

      {requests.length > 0 && (
        <ul className="mt-6 space-y-3 border-t border-gold/10 pt-4">
          {requests.map((request) => (
            <li key={request.id} className="rounded-lg border border-gold/15 p-3">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <Badge color="wine">{CHANGE_REQUEST_TYPE_LABELS[request.request_type] ?? request.request_type}</Badge>
                <StatusBadge status={request.status} />
              </div>
              <p className="text-sm text-text-dark whitespace-pre-wrap">{request.details}</p>
              <p className="text-xs text-text-muted mt-1">Submitted {formatDateTime(request.submitted_at)}</p>
              {request.status !== 'pending' && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs text-text-muted">
                    {request.status === 'approved' ? 'Approved' : 'Rejected'}
                    {request.resolved_at ? ` on ${formatDateTime(request.resolved_at)}` : ''}
                  </p>
                  {request.admin_response && (
                    <p className="text-xs text-text-muted bg-cream rounded-lg px-3 py-2 whitespace-pre-wrap">
                      Response: {request.admin_response}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
