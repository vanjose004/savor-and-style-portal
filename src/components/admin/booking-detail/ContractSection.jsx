import { useEffect, useState } from 'react'
import { FileText, FileSignature, ClipboardList } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import Badge from '../../ui/Badge'
import StatusBadge from '../../ui/StatusBadge'
import { formatDateTime } from '../../../lib/utils'
import { CHANGE_REQUEST_TYPE_LABELS } from '../../../lib/constants'
import { generateContractPDF, generateBookingFormPDF } from '../../../lib/pdf'

export default function ContractSection({ booking, onChange }) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [generatingForm, setGeneratingForm] = useState(false)
  const [recentChanges, setRecentChanges] = useState([])

  const loadRecentChanges = async () => {
    const { data } = await supabase
      .from('change_requests')
      .select('id, request_type, status, resolved_at')
      .eq('booking_id', booking.id)
      .neq('status', 'pending')
      .order('resolved_at', { ascending: false })
      .limit(3)
    setRecentChanges(data ?? [])
  }

  useEffect(() => {
    loadRecentChanges()

    const channel = supabase
      .channel(`contract-change-requests-${booking.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'change_requests', filter: `booking_id=eq.${booking.id}` },
        () => loadRecentChanges()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id])

  const handleGenerateBookingForm = async () => {
    setGeneratingForm(true)
    const { data, error } = await supabase.from('booking_menu_items').select('*').eq('booking_id', booking.id)

    if (error) {
      showToast(error.message, 'error')
      setGeneratingForm(false)
      return
    }

    await generateBookingFormPDF(booking, data ?? [])
    setGeneratingForm(false)
  }

  const handleMarkSigned = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('bookings')
      .update({ contract_signed: true, contract_signed_at: new Date().toISOString() })
      .eq('id', booking.id)
    setSaving(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast('Contract marked as signed.')
    onChange()
  }

  return (
    <Card
      title="Contract"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleGenerateBookingForm} disabled={generatingForm}>
            <ClipboardList className="w-4 h-4" />
            {generatingForm ? 'Generating…' : 'Generate Booking Form'}
          </Button>
          <Button variant="secondary" size="sm" onClick={async () => await generateContractPDF(booking)}>
            <FileText className="w-4 h-4" />
            Generate Contract
          </Button>
        </div>
      }
    >
      <div className="flex items-center justify-between gap-4">
        {booking.contract_signed ? (
          <Badge color="success">
            Signed{booking.contract_signed_at ? ` — ${formatDateTime(booking.contract_signed_at)}` : ''}
          </Badge>
        ) : (
          <Badge color="warning">Not Signed</Badge>
        )}
        {!booking.contract_signed && (
          <Button size="sm" onClick={handleMarkSigned} disabled={saving}>
            <FileSignature className="w-4 h-4" />
            {saving ? 'Saving…' : 'Mark as Signed'}
          </Button>
        )}
      </div>

      {recentChanges.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gold/10 space-y-2">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Recent Change Requests</p>
          <ul className="space-y-1.5">
            {recentChanges.map((request) => (
              <li key={request.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-text-dark truncate">
                  {CHANGE_REQUEST_TYPE_LABELS[request.request_type] ?? request.request_type}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={request.status} />
                  {request.resolved_at && (
                    <span className="text-xs text-text-muted">{formatDateTime(request.resolved_at)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
