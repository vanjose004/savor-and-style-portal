import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { CheckCircle2, Smartphone, Landmark } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { useSoftReserve } from '../../hooks/useSoftReserve'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Textarea from '../ui/Textarea'
import Button from '../ui/Button'
import {
  BUSINESS,
  PAYMENT_INSTRUCTIONS,
  SOFT_RESERVE_EVENT_TYPES,
  SOFT_RESERVE_FEE,
  SOFT_RESERVE_PACKAGE_OPTIONS,
  peso,
} from '../../lib/constants'

const FORM_ID = 'soft-reserve-form'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function SoftReserveModal() {
  const { isOpen, prefillPackage, sessionKey, closeSoftReserve } = useSoftReserve()

  return (
    <SoftReserveModalBody
      key={sessionKey}
      open={isOpen}
      prefillPackage={prefillPackage}
      onClose={closeSoftReserve}
    />
  )
}

function SoftReserveModalBody({ open, prefillPackage, onClose }) {
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      full_name: '',
      contact_number: '',
      email: '',
      event_type: '',
      event_date: '',
      estimated_guests: '',
      preferred_package: prefillPackage || '',
      message: '',
    },
  })

  const onSubmit = async (values) => {
    setSubmitting(true)

    const { error } = await supabase.rpc('submit_soft_reserve', {
      p_full_name: values.full_name.trim(),
      p_contact_number: values.contact_number.trim(),
      p_email: values.email.trim(),
      p_event_type: values.event_type,
      p_event_date: values.event_date,
      p_estimated_guests: Number(values.estimated_guests),
      p_preferred_package: values.preferred_package || null,
      p_message: values.message?.trim() || null,
    })

    setSubmitting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Salamat! Nareceive na namin ang Soft Reserve mo."
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button as="a" href={BUSINESS.messengerUrl} target="_blank" rel="noopener noreferrer">
              Send Screenshot on Messenger
            </Button>
          </>
        }
      >
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
          <p className="text-sm text-text-muted">
            Please send your {peso(SOFT_RESERVE_FEE)} payment to lock in your date:
          </p>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-start gap-3 bg-cream rounded-xl p-4 border border-gold/30">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-wine text-gold flex-shrink-0">
              <Smartphone size={20} />
            </div>
            <div>
              <p className="font-semibold text-text-dark">GCash</p>
              <p className="text-text-dark">{PAYMENT_INSTRUCTIONS.gcashNumber}</p>
              <p className="text-sm text-text-muted">{PAYMENT_INSTRUCTIONS.gcashName}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-cream rounded-xl p-4 border border-gold/30">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-wine text-gold flex-shrink-0">
              <Landmark size={20} />
            </div>
            <div>
              <p className="font-semibold text-text-dark">BPI</p>
              <p className="text-text-dark">{PAYMENT_INSTRUCTIONS.bpiNumber}</p>
            </div>
          </div>
        </div>

        <p className="mt-5 text-sm text-text-dark">
          After paying, please send a screenshot of your payment to us on Messenger so we can confirm your
          Soft Reserve.
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Soft Reserve — ${peso(SOFT_RESERVE_FEE)} lang`}
      footer={
        <Button type="submit" form={FORM_ID} className="w-full" disabled={submitting}>
          {submitting ? 'Submitting…' : `Submit Soft Reserve — ${peso(SOFT_RESERVE_FEE)}`}
        </Button>
      }
    >
      <p className="text-sm text-text-muted -mt-2 mb-4">
        Fill out the form below to secure your event date. We'll follow up within 24 hours.
      </p>

      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Full Name"
          className="sm:col-span-2"
          error={errors.full_name?.message}
          {...register('full_name', { required: 'Full name is required' })}
        />
        <Input
          label="Contact Number"
          error={errors.contact_number?.message}
          {...register('contact_number', { required: 'Contact number is required' })}
        />
        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register('email', { required: 'Email is required' })}
        />
        <Select
          label="Event Type"
          placeholder="Select event type"
          options={SOFT_RESERVE_EVENT_TYPES}
          error={errors.event_type?.message}
          {...register('event_type', { required: 'Event type is required' })}
        />
        <Input
          label="Event Date"
          type="date"
          min={todayStr()}
          error={errors.event_date?.message}
          {...register('event_date', { required: 'Event date is required' })}
        />
        <Input
          label="Estimated Guests"
          type="number"
          min="1"
          error={errors.estimated_guests?.message}
          {...register('estimated_guests', {
            required: 'Estimated guests is required',
            min: { value: 1, message: 'Must be at least 1 guest' },
          })}
        />
        <Select
          label="Preferred Package"
          placeholder="Select package"
          options={SOFT_RESERVE_PACKAGE_OPTIONS}
          {...register('preferred_package')}
        />
        <Textarea label="Message" className="sm:col-span-2" {...register('message')} />
      </form>
    </Modal>
  )
}
