import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useFormDraft } from '../../../hooks/useFormDraft'
import Input from '../../ui/Input'
import Select from '../../ui/Select'
import Textarea from '../../ui/Textarea'
import Button from '../../ui/Button'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, EXPENSE_PAYMENT_METHODS, SALARY_CATEGORIES } from '../../../lib/constants'

const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((c) => ({ value: c, label: EXPENSE_CATEGORY_LABELS[c] }))

const today = () => new Date().toISOString().slice(0, 10)

export default function ExpenseForm({ onSubmit, submitting, draftKey = 'draft:expense-new' }) {
  const form = useForm({
    defaultValues: {
      category: 'ingredients',
      description: '',
      amount: '',
      is_event_expense: false,
      booking_ref: '',
      payment_method: 'Cash',
      receipt_notes: '',
      expense_date: today(),
      period: '',
    },
  })
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = form

  const { restoreDraft, clearDraft } = useFormDraft(form, draftKey)

  useEffect(() => {
    restoreDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const category = useWatch({ control, name: 'category' })
  const isEventExpense = useWatch({ control, name: 'is_event_expense' })
  const isSalary = SALARY_CATEGORIES.includes(category)

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
        label="Description"
        placeholder="What was this expense for?"
        error={errors.description?.message}
        {...register('description', { required: 'Description is required' })}
      />

      {isSalary && (
        <div className="rounded-lg border border-gold/30 bg-cream/50 p-4 space-y-2">
          <Input label="Period" placeholder="e.g. June 2026" {...register('period')} />
          <p className="text-xs text-text-muted">This separates your personal income from business expenses.</p>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm font-medium text-text-dark">
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-gold/30 text-wine focus:ring-wine/30"
          {...register('is_event_expense')}
        />
        This expense is for a specific event
      </label>

      {isEventExpense && <Input label="Booking Reference" placeholder="e.g. SS-2026-001" {...register('booking_ref')} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Payment Method"
          options={EXPENSE_PAYMENT_METHODS}
          error={errors.payment_method?.message}
          {...register('payment_method', { required: 'Payment method is required' })}
        />
        <Input
          label="Date"
          type="date"
          error={errors.expense_date?.message}
          {...register('expense_date', { required: 'Date is required' })}
        />
      </div>

      <Textarea label="Receipt / Reference Notes (optional)" {...register('receipt_notes')} />

      <Button type="submit" variant="danger" className="w-full" disabled={submitting}>
        {submitting ? 'Saving…' : 'Record Expense'}
      </Button>
    </form>
  )
}
