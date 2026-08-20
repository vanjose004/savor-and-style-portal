import { useState } from 'react'
import { ClipboardList, FileText, Receipt, Download } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { PAYMENT_TYPE_LABELS } from '../../lib/constants'
import { generateBookingFormPDF, generateContractPDF, generateAcknowledgementReceiptPDF } from '../../lib/pdf'
import { DEMO_BOOKING, DEMO_MENU_ITEMS_DETAILED, DEMO_PAYMENT } from '../../lib/demoBooking'

export default function DemoDocumentsCard() {
  const [generatingId, setGeneratingId] = useState(null)

  const handleGenerate = async (id, generate) => {
    setGeneratingId(id)
    await generate()
    setGeneratingId(null)
  }

  return (
    <Card title="Documents">
      <ul className="divide-y divide-gold/10">
        <li className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-text-dark">
            <ClipboardList className="w-4 h-4 text-wine shrink-0" />
            Cooking Form (Sample Menu Order)
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={generatingId === 'booking-form'}
            onClick={() =>
              handleGenerate('booking-form', () =>
                generateBookingFormPDF(DEMO_BOOKING, DEMO_MENU_ITEMS_DETAILED, { watermark: true })
              )
            }
          >
            <Download className="w-4 h-4" />
            {generatingId === 'booking-form' ? 'Preparing…' : 'Download'}
          </Button>
        </li>

        <li className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-text-dark">
            <FileText className="w-4 h-4 text-wine shrink-0" />
            Contract
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={generatingId === 'contract'}
            onClick={() =>
              handleGenerate('contract', () => generateContractPDF(DEMO_BOOKING, { watermark: true }))
            }
          >
            <Download className="w-4 h-4" />
            {generatingId === 'contract' ? 'Preparing…' : 'Download'}
          </Button>
        </li>

        <li className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Receipt className="w-4 h-4 text-wine shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-dark truncate">
                Acknowledgement Receipt ({DEMO_PAYMENT.ar_number})
              </p>
              <p className="text-xs text-text-muted">
                {formatCurrency(DEMO_PAYMENT.amount)} · {PAYMENT_TYPE_LABELS[DEMO_PAYMENT.payment_type]} ·{' '}
                {formatDateTime(DEMO_PAYMENT.paid_at)}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={generatingId === DEMO_PAYMENT.id}
            onClick={() =>
              handleGenerate(DEMO_PAYMENT.id, () =>
                generateAcknowledgementReceiptPDF(DEMO_BOOKING, DEMO_PAYMENT, { watermark: true })
              )
            }
          >
            <Download className="w-4 h-4" />
            {generatingId === DEMO_PAYMENT.id ? 'Preparing…' : 'Download'}
          </Button>
        </li>
      </ul>
    </Card>
  )
}
