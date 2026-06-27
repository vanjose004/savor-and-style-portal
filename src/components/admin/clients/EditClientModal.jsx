import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import { useFormDraft } from '../../../hooks/useFormDraft'
import Modal from '../../ui/Modal'
import Button from '../../ui/Button'
import Input from '../../ui/Input'

export default function EditClientModal({ open, onClose, client, onSaved }) {
  const { showToast } = useToast()
  const form = useForm({ defaultValues: { name: '', phone: '', email: '', address: '' } })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form

  const { restoreDraft, clearDraft } = useFormDraft(form, `draft:client-edit-${client?.id ?? 'none'}`, {
    enabled: Boolean(client),
  })

  useEffect(() => {
    if (!open || !client) return
    reset({
      name: client.name ?? '',
      phone: client.phone ?? '',
      email: client.email ?? '',
      address: client.address ?? '',
    })
    restoreDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client, reset])

  const onSubmit = async (values) => {
    const { error } = await supabase
      .from('clients')
      .update({
        name: values.name.trim(),
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        address: values.address?.trim() || null,
      })
      .eq('id', client.id)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    clearDraft()
    showToast('Client updated.')
    onClose()
    onSaved()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Client"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name" error={errors.name?.message} {...register('name', { required: 'Name is required' })} />
        <Input label="Phone" {...register('phone')} />
        <Input label="Email" type="email" {...register('email')} />
        <Input label="Address" {...register('address')} />
      </form>
    </Modal>
  )
}
