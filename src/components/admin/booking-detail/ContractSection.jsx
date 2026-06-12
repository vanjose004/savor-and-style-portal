import { useState } from 'react'
import { FileText, FileSignature } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import Badge from '../../ui/Badge'
import { formatDateTime } from '../../../lib/utils'
import { generateContractPDF } from '../../../lib/pdf'

export default function ContractSection({ booking, onChange }) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

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
        <Button variant="secondary" size="sm" onClick={() => generateContractPDF(booking)}>
          <FileText className="w-4 h-4" />
          Generate Contract
        </Button>
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
    </Card>
  )
}
