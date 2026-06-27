import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Modal from '../../ui/Modal'
import PayableForm from './PayableForm'

export default function EditPayableModal({ payable, open, onClose, onSaved }) {
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  if (!payable) return null

  const handleSubmit = async (values) => {
    setSubmitting(true)

    const { data, error } = await supabase
      .from('payables')
      .update({
        creditor_name: values.creditor_name,
        description: values.description,
        total_amount: Number(values.total_amount),
        due_date: values.due_date || null,
        notes: values.notes || null,
      })
      .eq('id', payable.id)
      .select()
      .single()

    setSubmitting(false)

    if (error) {
      showToast(error.message, 'error')
      return false
    }

    showToast('Utang updated.')
    onSaved(data)
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Utang">
      <PayableForm
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Save Changes"
        draftKey={`draft:payable-edit-${payable.id}`}
        defaultValues={{
          creditor_name: payable.creditor_name,
          description: payable.description,
          total_amount: payable.total_amount,
          due_date: payable.due_date || '',
          notes: payable.notes || '',
        }}
      />
    </Modal>
  )
}
