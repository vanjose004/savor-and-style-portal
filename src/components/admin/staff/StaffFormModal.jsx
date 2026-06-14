import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { supabase, createStaffSignupClient } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Modal from '../../ui/Modal'
import Button from '../../ui/Button'
import Input from '../../ui/Input'
import Select from '../../ui/Select'
import { STAFF_ROLES, STAFF_ROLE_LABELS } from '../../../lib/constants'

const ROLE_OPTIONS = STAFF_ROLES.map((value) => ({ value, label: STAFF_ROLE_LABELS[value] }))

export default function StaffFormModal({ open, onClose, staff, onSaved }) {
  const { showToast } = useToast()
  const isEdit = Boolean(staff)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { name: '', role: STAFF_ROLES[0], phone: '', email: '', start_date: '', password: '' },
  })

  useEffect(() => {
    if (!open) return
    reset({
      name: staff?.name ?? '',
      role: staff?.role ?? STAFF_ROLES[0],
      phone: staff?.phone ?? '',
      email: staff?.email ?? '',
      start_date: staff?.start_date ?? '',
      password: '',
    })
  }, [open, staff, reset])

  const onSubmit = async (values) => {
    if (isEdit) {
      const { error } = await supabase
        .from('staff')
        .update({
          name: values.name.trim(),
          role: values.role,
          phone: values.phone?.trim() || null,
          email: values.email?.trim() || null,
          start_date: values.start_date || null,
        })
        .eq('id', staff.id)

      if (error) {
        showToast(error.message, 'error')
        return
      }

      showToast('Staff member updated.')
    } else {
      const signupClient = createStaffSignupClient()
      const { data, error: signupError } = await signupClient.auth.signUp({
        email: values.email.trim(),
        password: values.password,
      })

      if (signupError) {
        showToast(signupError.message, 'error')
        return
      }

      const { error } = await supabase.from('staff').insert({
        id: data.user.id,
        name: values.name.trim(),
        role: values.role,
        phone: values.phone?.trim() || null,
        email: values.email.trim(),
        start_date: values.start_date || null,
      })

      if (error) {
        showToast(error.message, 'error')
        return
      }

      showToast('Staff member added.')
    }

    onClose()
    onSaved()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Staff Member' : 'Add Staff Member'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Staff'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name" error={errors.name?.message} {...register('name', { required: 'Name is required' })} />
        <Select label="Role" options={ROLE_OPTIONS} {...register('role', { required: true })} />
        <Input label="Phone" {...register('phone')} />
        <Input label="Start Date" type="date" {...register('start_date')} />
        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          disabled={isEdit}
          {...register('email', { required: 'Email is required' })}
        />
        {!isEdit && (
          <>
            <Input
              label="Temporary Password"
              type="password"
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Must be at least 6 characters' },
              })}
            />
            <p className="text-xs text-text-muted">
              This creates a login account for the staff member. Share the email and temporary password with
              them so they can sign in at /staff/login.
            </p>
          </>
        )}
      </form>
    </Modal>
  )
}
