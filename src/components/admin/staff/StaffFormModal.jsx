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

/** Suggests a "firstname.lastname" username from a display name, e.g. "Juan Dela Cruz" -> "juan.cruz". */
function suggestUsername(name) {
  const parts = name.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts[0]}.${parts[parts.length - 1]}`
}

export default function StaffFormModal({ open, onClose, staff, onSaved }) {
  const { showToast } = useToast()
  const isEdit = Boolean(staff)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      role: STAFF_ROLES[0],
      phone: '',
      username: '',
      rate_override: '',
      start_date: '',
      end_date: '',
      password: '',
    },
  })

  useEffect(() => {
    if (!open) return
    reset({
      name: staff?.name ?? '',
      role: staff?.role ?? STAFF_ROLES[0],
      phone: staff?.phone ?? '',
      username: staff?.username ?? '',
      rate_override: staff?.rate_override ?? '',
      start_date: staff?.start_date ?? '',
      end_date: staff?.end_date ?? '',
      password: '',
    })
  }, [open, staff, reset])

  const handleNameBlur = (e) => {
    if (isEdit || getValues('username')) return
    setValue('username', suggestUsername(e.target.value))
  }

  const onSubmit = async (values) => {
    const username = values.username.trim().toLowerCase()
    const rateOverride = values.rate_override === '' ? null : Number(values.rate_override)

    if (isEdit) {
      const { error } = await supabase
        .from('staff')
        .update({
          name: values.name.trim(),
          role: values.role,
          phone: values.phone?.trim() || null,
          username,
          rate_override: rateOverride,
          start_date: values.start_date || null,
          end_date: values.end_date || null,
        })
        .eq('id', staff.id)

      if (error) {
        showToast(error.message, 'error')
        return
      }

      showToast('Staff member updated.')
    } else {
      // Staff log in by username, never email — Supabase Auth still requires
      // an email to sign up with, so this fake one exists purely to satisfy
      // that requirement. It's never shown to the admin or the staff member.
      const signupEmail = `${username}@savorandstyle.internal`

      const signupClient = createStaffSignupClient()
      const { data, error: signupError } = await signupClient.auth.signUp({
        email: signupEmail,
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
        username,
        rate_override: rateOverride,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
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
        <Input
          label="Name"
          error={errors.name?.message}
          {...register('name', { required: 'Name is required', onBlur: handleNameBlur })}
        />
        <Select label="Role" options={ROLE_OPTIONS} {...register('role', { required: true })} />
        <Input
          label="Username"
          error={errors.username?.message}
          {...register('username', { required: 'Username is required' })}
        />
        <Input
          label="Custom rate (optional — for senior waiter ₱900)"
          type="number"
          step="1"
          {...register('rate_override')}
        />
        <Input label="Phone" {...register('phone')} />
        <Input label="Start Date" type="date" {...register('start_date')} />
        <Input label="End Date" type="date" {...register('end_date')} />
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
              This creates a login account for the staff member. Share the username and temporary password with
              them so they can sign in at /staff/login.
            </p>
          </>
        )}
      </form>
    </Modal>
  )
}
