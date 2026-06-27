import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Plus, Pencil, Calendar, FileText } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import { useFormDraft } from '../../../hooks/useFormDraft'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Textarea from '../../../components/ui/Textarea'
import Badge from '../../../components/ui/Badge'
import Modal from '../../../components/ui/Modal'
import Spinner from '../../../components/ui/Spinner'
import ProgressBar from '../../../components/ui/ProgressBar'
import EmptyState from '../../../components/ui/EmptyState'
import EditPayableModal from '../../../components/admin/accounting/EditPayableModal'
import { formatCurrency, formatDate, getPayableProgress } from '../../../lib/utils'
import { PAYABLE_STATUS_LABELS, PAYABLE_STATUS_COLORS } from '../../../lib/constants'

const today = () => new Date().toISOString().slice(0, 10)

export default function PayableDetail() {
  const { id } = useParams()
  const { showToast } = useToast()
  const [payable, setPayable] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm({
    defaultValues: { amount: '', payment_date: today(), notes: '' },
  })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form

  const { restoreDraft, clearDraft } = useFormDraft(form, `draft:payable-payment-${id}`)

  useEffect(() => {
    if (!modalOpen) return
    restoreDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen])

  const load = async () => {
    setLoading(true)

    const [payRes, paymentsRes] = await Promise.all([
      supabase.from('payables').select('*').eq('id', id).single(),
      supabase.from('payable_payments').select('*').eq('payable_id', id).order('payment_date', { ascending: false }).order('created_at', { ascending: false }),
    ])

    if (payRes.error) {
      showToast(payRes.error.message, 'error')
    } else {
      setPayable(payRes.data)
    }

    if (paymentsRes.error) {
      showToast(paymentsRes.error.message, 'error')
    } else {
      setPayments(paymentsRes.data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleRecordPayment = async (values) => {
    setSubmitting(true)

    const { error } = await supabase.from('payable_payments').insert({
      payable_id: id,
      amount: Number(values.amount),
      payment_date: values.payment_date,
      notes: values.notes || null,
    })

    setSubmitting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast('Payment recorded.')
    clearDraft()
    reset({ amount: '', payment_date: today(), notes: '' })
    setModalOpen(false)
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!payable) {
    return (
      <EmptyState
        icon={FileText}
        title="Utang not found"
        description="This utang entry may have been deleted."
        action={
          <Button as={Link} to="/admin/accounting/payables" variant="primary">
            Back to Utang
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          to="/admin/accounting/payables"
          className="inline-flex items-center gap-1 text-sm text-wine hover:text-wine-dark mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Utang
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-wine">{payable.creditor_name}</h1>
            <p className="text-sm text-text-muted mt-1">{payable.description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge color={PAYABLE_STATUS_COLORS[payable.status]}>{PAYABLE_STATUS_LABELS[payable.status]}</Badge>
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">Total</p>
            <p className="text-lg font-bold text-text-dark mt-1">{formatCurrency(payable.total_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">Paid</p>
            <p className="text-lg font-bold text-success mt-1">{formatCurrency(payable.amount_paid)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">Balance</p>
            <p className="text-lg font-bold text-danger mt-1">{formatCurrency(payable.balance)}</p>
          </div>
        </div>

        <ProgressBar
          percent={getPayableProgress(payable.total_amount, payable.amount_paid)}
          color={PAYABLE_STATUS_COLORS[payable.status]}
          className="mt-4"
        />

        {payable.due_date && (
          <p className="flex items-center gap-1 text-xs text-text-muted mt-3">
            <Calendar className="w-3.5 h-3.5" />
            Due {formatDate(payable.due_date)}
          </p>
        )}

        {payable.notes && <p className="text-sm text-text-muted mt-3 border-t border-gold/10 pt-3">{payable.notes}</p>}

        {payable.status !== 'paid' && (
          <Button variant="primary" className="w-full mt-4" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Record Payment
          </Button>
        )}
      </Card>

      <Card title="Payment History">
        {payments.length === 0 ? (
          <p className="text-sm text-text-muted">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-gold/10">
            {payments.map((p) => (
              <li key={p.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text-dark">{formatDate(p.payment_date)}</p>
                  {p.notes && <p className="text-xs text-text-muted">{p.notes}</p>}
                </div>
                <p className="text-sm font-semibold text-success shrink-0">{formatCurrency(p.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit(handleRecordPayment)} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Payment'}
            </Button>
          </>
        }
      >
        <form className="space-y-4">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            error={errors.amount?.message}
            {...register('amount', {
              required: 'Amount is required',
              min: { value: 0.01, message: 'Amount must be greater than 0' },
              max: {
                value: Number(payable.balance),
                message: `Amount cannot exceed the balance of ${formatCurrency(payable.balance)}`,
              },
            })}
          />
          <Input
            label="Payment Date"
            type="date"
            error={errors.payment_date?.message}
            {...register('payment_date', { required: 'Payment date is required' })}
          />
          <Textarea label="Notes (optional)" {...register('notes')} />
        </form>
      </Modal>

      <EditPayableModal
        payable={payable}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          setPayable(updated)
          setEditOpen(false)
        }}
      />
    </div>
  )
}
