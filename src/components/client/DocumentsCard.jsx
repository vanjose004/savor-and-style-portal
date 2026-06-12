import { useEffect, useState } from 'react'
import { ClipboardList, FileText, Receipt, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { PAYMENT_TYPE_LABELS } from '../../lib/constants'
import { generateBookingFormPDF, generateContractPDF, generateAcknowledgementReceiptPDF } from '../../lib/pdf'

export default function DocumentsCard({ accessToken, booking }) {
  const [menuItems, setMenuItems] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [generatingId, setGeneratingId] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const [menuResult, paymentsResult] = await Promise.all([
        supabase.rpc('get_booking_menu_items_by_token', { p_access_token: accessToken }),
        supabase.rpc('get_booking_payments_by_token', { p_access_token: accessToken }),
      ])
      if (cancelled) return
      if (!menuResult.error) setMenuItems(menuResult.data ?? [])
      if (!paymentsResult.error) setPayments(paymentsResult.data ?? [])
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [accessToken])

  const handleGenerate = async (id, generate) => {
    setGeneratingId(id)
    await generate()
    setGeneratingId(null)
  }

  if (loading) {
    return (
      <Card title="Documents">
        <div className="flex justify-center py-6">
          <Spinner className="w-6 h-6" />
        </div>
      </Card>
    )
  }

  return (
    <Card title="Documents">
      <ul className="divide-y divide-gold/10">
        <li className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-text-dark">
            <ClipboardList className="w-4 h-4 text-wine shrink-0" />
            Booking Form
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={generatingId === 'booking-form'}
            onClick={() => handleGenerate('booking-form', () => generateBookingFormPDF(booking, menuItems))}
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
            onClick={() => handleGenerate('contract', () => generateContractPDF(booking))}
          >
            <Download className="w-4 h-4" />
            {generatingId === 'contract' ? 'Preparing…' : 'Download'}
          </Button>
        </li>

        {payments.map((payment) => (
          <li key={payment.id} className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <Receipt className="w-4 h-4 text-wine shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-dark truncate">
                  Acknowledgement Receipt{payment.ar_number ? ` (${payment.ar_number})` : ''}
                </p>
                <p className="text-xs text-text-muted">
                  {formatCurrency(payment.amount)} · {PAYMENT_TYPE_LABELS[payment.payment_type] ?? payment.payment_type} ·{' '}
                  {formatDateTime(payment.paid_at)}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={generatingId === payment.id}
              onClick={() => handleGenerate(payment.id, () => generateAcknowledgementReceiptPDF(booking, payment))}
            >
              <Download className="w-4 h-4" />
              {generatingId === payment.id ? 'Preparing…' : 'Download'}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
