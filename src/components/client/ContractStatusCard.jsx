import { CheckCircle2, AlertCircle } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { formatDateTime } from '../../lib/utils'

export default function ContractStatusCard({ booking }) {
  return (
    <Card title="Contract Status">
      {booking.contract_signed ? (
        <div className="flex items-center gap-2 flex-wrap">
          <CheckCircle2 className="w-5 h-5 text-success" />
          <Badge color="success">Contract Signed</Badge>
          {booking.contract_signed_at && (
            <span className="text-xs text-text-muted">{formatDateTime(booking.contract_signed_at)}</span>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            <Badge color="warning">Awaiting Signature</Badge>
          </div>
          <p className="text-sm text-text-muted">Please contact us to review and sign your contract.</p>
        </div>
      )}
    </Card>
  )
}
