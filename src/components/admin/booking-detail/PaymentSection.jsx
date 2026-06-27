import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Banknote, FileDown, Receipt, Trash2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import { useFormDraft } from '../../../hooks/useFormDraft'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import Input from '../../ui/Input'
import Select from '../../ui/Select'
import Textarea from '../../ui/Textarea'
import Modal from '../../ui/Modal'
import Spinner from '../../ui/Spinner'
import EmptyState from '../../ui/EmptyState'
import PaymentProgressBar from '../../ui/PaymentProgressBar'
import { formatCurrency, formatDateTime, getPaymentProgress } from '../../../lib/utils'
import { PAYMENT_TYPES, PAYMENT_METHODS, PAYMENT_TYPE_LABELS } from '../../../lib/constants'
import { generateAcknowledgementReceiptPDF } from '../../../lib/pdf'

const PAYMENT_TYPE_OPTIONS = PAYMENT_TYPES.map((value) => ({ value, label: PAYMENT_TYPE_LABELS[value] }))

const EMPTY_PAYMENT_FORM = {
  amount: '',
  payment_type: PAYMENT_TYPES[0],
  payment_method: PAYMENT_METHODS[0],
  reference_number: '',
  notes: '',
}

function RecordPaymentModal({ open, onClose, onSave, saving, bookingId }) {
  const form = useForm({ defaultValues: EMPTY_PAYMENT_FORM })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form

  const { restoreDraft, clearDraft } = useFormDraft(form, `draft:payment-${bookingId}`)

  useEffect(() => {
    if (!open) return
    reset(EMPTY_PAYMENT_FORM)
    restoreDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset])

  const handleFormSubmit = handleSubmit(async (values) => {
    const result = await onSave(values)
    if (result !== false) clearDraft()
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Payment"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleFormSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Record Payment'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleFormSubmit}>
        <Input
          label="Amount (₱)"
          type="number"
          min="0.01"
          step="0.01"
          error={errors.amount?.message}
          {...register('amount', {
            required: 'Amount is required',
            valueAsNumber: true,
            min: { value: 0.01, message: 'Must be greater than 0' },
          })}
        />
        <Select label="Payment Type" options={PAYMENT_TYPE_OPTIONS} {...register('payment_type', { required: true })} />
        <Select label="Payment Method" options={PAYMENT_METHODS} {...register('payment_method', { required: true })} />
        <Input label="Reference Number" {...register('reference_number')} />
        <Textarea label="Notes" {...register('notes')} />
      </form>
    </Modal>
  )
}

export default function PaymentSection({ booking, onChange }) {
  const { showToast } = useToast()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatingId, setGeneratingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadPayments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', booking.id)
      .order('paid_at', { ascending: false })

    if (error) {
      showToast(error.message, 'error')
    } else {
      setPayments(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id])

  const handleSave = async (values) => {
    setSaving(true)

    const { error } = await supabase.from('payments').insert({
      booking_id: booking.id,
      amount: values.amount,
      payment_type: values.payment_type,
      payment_method: values.payment_method,
      reference_number: values.reference_number?.trim() || null,
      notes: values.notes?.trim() || null,
    })

    setSaving(false)

    if (error) {
      showToast(error.message, 'error')
      return false
    }

    showToast('Payment recorded.')
    setModalOpen(false)
    await loadPayments()
    onChange()
  }

  const handleGenerateAR = async (payment) => {
    setGeneratingId(payment.id)
    await generateAcknowledgementReceiptPDF(booking, payment)

    if (!payment.ar_generated) {
      const { error } = await supabase.from('payments').update({ ar_generated: true }).eq('id', payment.id)
      if (!error) {
        setPayments((prev) => prev.map((p) => (p.id === payment.id ? { ...p, ar_generated: true } : p)))
      }
    }
    setGeneratingId(null)
  }

  const handleDeletePayment = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('payments').delete().eq('id', deleteTarget.id)
    setDeleting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast('Payment removed.')
    setDeleteTarget(null)
    await loadPayments()
    onChange()
  }

  const { paid, remaining } = getPaymentProgress(booking.total_amount, booking.balance)

  return (
    <Card
      title="Payment Summary"
      actions={
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Banknote className="w-4 h-4" />
          Record Payment
        </Button>
      }
    >
      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div>
          <p className="text-text-muted">Total</p>
          <p className="font-semibold text-text-dark">{formatCurrency(booking.total_amount)}</p>
        </div>
        <div>
          <p className="text-text-muted">Paid</p>
          <p className="font-semibold text-success">{formatCurrency(paid)}</p>
        </div>
        <div>
          <p className="text-text-muted">Balance</p>
          <p className="font-semibold text-danger">{formatCurrency(remaining)}</p>
        </div>
      </div>
      <PaymentProgressBar totalAmount={booking.total_amount} balance={booking.balance} showLabels={false} />

      <div className="mt-5">
        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner className="w-6 h-6" />
          </div>
        ) : payments.length === 0 ? (
          <EmptyState icon={Receipt} title="No payments yet" description="Recorded payments will appear here." />
        ) : (
          <ul className="divide-y divide-gold/10">
            {payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-dark">
                    {formatCurrency(payment.amount)} · {PAYMENT_TYPE_LABELS[payment.payment_type] ?? payment.payment_type}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {payment.payment_method}
                    {payment.reference_number ? ` · Ref: ${payment.reference_number}` : ''}
                    {payment.credit_card_fee > 0 ? ` · Fee: ${formatCurrency(payment.credit_card_fee)}` : ''}
                    {' · '}
                    {formatDateTime(payment.paid_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGenerateAR(payment)}
                    disabled={generatingId === payment.id}
                  >
                    <FileDown className="w-4 h-4" />
                    {payment.ar_generated ? 'Re-print AR' : 'Generate AR'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger/10"
                    aria-label="Remove payment"
                    onClick={() => setDeleteTarget(payment)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <RecordPaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        saving={saving}
        bookingId={booking.id}
      />

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeletePayment} disabled={deleting}>
              {deleting ? 'Removing…' : 'Remove'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-dark">
          Remove this payment of <strong>{formatCurrency(deleteTarget?.amount)}</strong> recorded on{' '}
          <strong>{formatDateTime(deleteTarget?.paid_at)}</strong>? The booking balance will be
          recalculated. This action cannot be undone.
        </p>
      </Modal>
    </Card>
  )
}
