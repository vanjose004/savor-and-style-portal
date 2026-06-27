import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useFormDraft } from '../../../hooks/useFormDraft'
import Input from '../../ui/Input'
import Select from '../../ui/Select'
import Textarea from '../../ui/Textarea'
import Button from '../../ui/Button'
import { INCOME_CATEGORIES, INCOME_CATEGORY_LABELS, INCOME_PAYMENT_METHOD_OPTIONS } from '../../../lib/constants'

const CATEGORY_OPTIONS = INCOME_CATEGORIES.map((c) => ({ value: c, label: INCOME_CATEGORY_LABELS[c] }))

const today = () => new Date().toISOString().slice(0, 10)

export default function IncomeForm({ onSubmit, submitting, draftKey = 'draft:income-new' }) {
  const form = useForm({
    defaultValues: {
      category: 'reservation_fee',
      amount: '',
      client_name: '',
      booking_ref: '',
      payment_method: 'GCash',
      reference_number: '',
      transaction_date: today(),
      notes: '',
    },
  })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form

  const { restoreDraft, clearDraft } = useFormDraft(form, draftKey)

  useEffect(() => {
    restoreDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFormSubmit = handleSubmit(async (values) => {
    const result = await onSubmit(values)
    if (result !== false) clearDraft()
  })

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Category"
          options={CATEGORY_OPTIONS}
          error={errors.category?.message}
          {...register('category', { required: 'Category is required' })}
        />
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
          })}
        />
      </div>

      <Input
        label="Client Name"
        error={errors.client_name?.message}
        {...register('client_name', { required: 'Client name is required' })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Booking Reference (optional)" placeholder="e.g. SS-2026-001" {...register('booking_ref')} />
        <Select
          label="Payment Method"
          options={INCOME_PAYMENT_METHOD_OPTIONS}
          error={errors.payment_method?.message}
          {...register('payment_method', { required: 'Payment method is required' })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Reference Number (optional)" {...register('reference_number')} />
        <Input
          label="Date"
          type="date"
          error={errors.transaction_date?.message}
          {...register('transaction_date', { required: 'Date is required' })}
        />
      </div>

      <Textarea label="Notes (optional)" {...register('notes')} />

      <Button type="submit" variant="success" className="w-full" disabled={submitting}>
        {submitting ? 'Saving…' : 'Record Income'}
      </Button>
    </form>
  )
}
