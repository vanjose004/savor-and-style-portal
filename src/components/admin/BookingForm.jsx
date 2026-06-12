import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import Card from '../ui/Card'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Textarea from '../ui/Textarea'
import Button from '../ui/Button'
import { EVENT_TYPES, BOOKING_STATUSES, RESERVATION_FEE, DEFAULT_SERVICE_HOURS } from '../../lib/constants'

const STATUS_OPTIONS = BOOKING_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}))

const CHECKBOX_CLASS = 'rounded border-gold/40 text-wine focus:ring-2 focus:ring-wine/30'

export default function BookingForm({ defaultValues, onSubmit, submitting, submitLabel = 'Save Booking' }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      event_type: EVENT_TYPES[0],
      event_date: '',
      event_time: '',
      venue: '',
      event_motif: '',
      pax: '',
      special_requests: '',
      status: 'pending',
      menu_confirmed: false,
      contract_signed: false,
      service_hours: DEFAULT_SERVICE_HOURS,
      lechon_chopping: false,
      total_amount: '',
      reservation_fee: RESERVATION_FEE,
      notes: '',
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card title="Client Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Client Name"
            error={errors.name?.message}
            {...register('name', { required: 'Client name is required' })}
          />
          <Input label="Phone" {...register('phone')} />
          <Input label="Email" type="email" {...register('email')} />
          <Input label="Address" {...register('address')} />
        </div>
      </Card>

      <Card title="Event Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Event Type"
            options={EVENT_TYPES}
            error={errors.event_type?.message}
            {...register('event_type', { required: 'Event type is required' })}
          />
          <Input
            label="Event Date"
            type="date"
            error={errors.event_date?.message}
            {...register('event_date', { required: 'Event date is required' })}
          />
          <Input label="Event Time" type="time" {...register('event_time')} />
          <Input label="Venue" {...register('venue')} />
          <Input label="Event Motif" placeholder="e.g. Rustic Garden" {...register('event_motif')} />
          <Input label="Number of Pax" type="number" min="0" {...register('pax', { valueAsNumber: true })} />
          <Select label="Status" options={STATUS_OPTIONS} {...register('status')} />
        </div>
        <div className="mt-4">
          <Textarea label="Special Requests" {...register('special_requests')} />
        </div>
      </Card>

      <Card title="Service & Menu">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <Input
            label="Service Hours"
            type="number"
            min="0"
            {...register('service_hours', { valueAsNumber: true })}
          />
          <label className="flex items-center gap-2 text-sm font-medium text-text-dark pb-2">
            <input type="checkbox" className={CHECKBOX_CLASS} {...register('lechon_chopping')} />
            Lechon Chopping (₱{300} fee)
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-text-dark pb-2">
            <input type="checkbox" className={CHECKBOX_CLASS} {...register('menu_confirmed')} />
            Menu Confirmed
          </label>
        </div>
      </Card>

      <Card title="Payment & Contract">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <Input
            label="Total Contract Amount (₱)"
            type="number"
            min="0"
            step="0.01"
            error={errors.total_amount?.message}
            {...register('total_amount', {
              required: 'Total amount is required',
              valueAsNumber: true,
              min: { value: 0, message: 'Must be 0 or greater' },
            })}
          />
          <Input
            label="Reservation Fee (₱)"
            type="number"
            min="0"
            step="0.01"
            {...register('reservation_fee', { valueAsNumber: true })}
          />
          <label className="flex items-center gap-2 text-sm font-medium text-text-dark pb-2">
            <input type="checkbox" className={CHECKBOX_CLASS} {...register('contract_signed')} />
            Contract Signed
          </label>
        </div>
      </Card>

      <Card title="Internal Notes">
        <Textarea label="Notes (admin only — never shown to client)" {...register('notes')} />
      </Card>

      <div className="flex justify-end gap-3">
        <Button as={Link} to="/admin/bookings" variant="secondary">
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
