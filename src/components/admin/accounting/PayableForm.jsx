import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useFormDraft } from '../../../hooks/useFormDraft'
import Input from '../../ui/Input'
import Textarea from '../../ui/Textarea'
import Button from '../../ui/Button'

export default function PayableForm({
  onSubmit,
  submitting,
  defaultValues,
  submitLabel = 'Add Utang',
  draftKey = 'draft:payable-new',
}) {
  const form = useForm({
    defaultValues: {
      creditor_name: '',
      description: '',
      total_amount: '',
      due_date: '',
      notes: '',
      ...defaultValues,
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
      <Input
        label="Creditor Name"
        placeholder="Who do you owe?"
        error={errors.creditor_name?.message}
        {...register('creditor_name', { required: 'Creditor name is required' })}
      />

      <Input
        label="Description"
        placeholder="What is this utang for?"
        error={errors.description?.message}
        {...register('description', { required: 'Description is required' })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Total Amount"
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          error={errors.total_amount?.message}
          {...register('total_amount', {
            required: 'Total amount is required',
            min: { value: 0.01, message: 'Total amount must be greater than 0' },
          })}
        />
        <Input label="Due Date (optional)" type="date" {...register('due_date')} />
      </div>

      <Textarea label="Notes (optional)" {...register('notes')} />

      <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
        {submitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
