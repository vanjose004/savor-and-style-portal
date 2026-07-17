import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { CheckCircle2, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Textarea from '../components/ui/Textarea'
import Button from '../components/ui/Button'
import Logo from '../components/ui/Logo'
import { BUSINESS, EVENT_TYPES, DEFAULT_INCLUSIONS, MENU_PACKAGE_PRICES } from '../lib/constants'

// Same package labels used for admin pricing (MENU_PACKAGE_PRICES) — kept
// as one list so this form can never drift out of sync with what the
// admin dashboard prices a submission at.
const MENU_PACKAGES = Object.keys(MENU_PACKAGE_PRICES)
const CHECKBOX_CLASS = 'rounded border-gold/40 text-wine focus:ring-2 focus:ring-wine/30'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function BookingRequest() {
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      client_name: '',
      client_email: '',
      client_phone: '',
      client_address: '',
      event_type: EVENT_TYPES[0],
      event_date: '',
      event_time: '',
      pax: '',
      event_motif: '',
      venue: '',
      venue_pin_location: '',
      venue_access_time: '',
      venue_contact_number: '',
      menu_package: '',
      lechon_chopping: false,
      cake_table: false,
      special_requests: '',
    },
  })

  const onSubmit = async (values) => {
    setSubmitting(true)

    const { data, error } = await supabase.rpc('submit_booking_request', {
      p_client_name: values.client_name.trim(),
      p_client_email: values.client_email.trim(),
      p_client_phone: values.client_phone.trim(),
      p_client_address: values.client_address?.trim() || null,
      p_event_type: values.event_type,
      p_event_date: values.event_date,
      p_event_time: values.event_time || null,
      p_pax: Number(values.pax),
      p_event_motif: values.event_motif?.trim() || null,
      p_venue: values.venue.trim(),
      p_venue_pin_location: values.venue_pin_location?.trim() || null,
      p_venue_access_time: values.venue_access_time?.trim() || null,
      p_venue_contact_number: values.venue_contact_number?.trim() || null,
      p_menu_package: values.menu_package,
      p_lechon_chopping: values.lechon_chopping,
      p_cake_table: values.cake_table,
      p_special_requests: values.special_requests?.trim() || null,
    })

    if (error) {
      showToast(error.message, 'error')
      setSubmitting(false)
      return
    }

    const booking = data?.[0]
    setSubmitting(false)
    setResult(booking)

    // Best-effort — the booking is already saved even if the email fails
    // (e.g. Resend isn't configured yet on this deployment).
    if (booking?.access_token) {
      supabase.functions.invoke('send-booking-confirmation', { body: { access_token: booking.access_token } }).catch(() => {})
    }
  }

  if (result) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
        <Card className="max-w-md w-full text-center py-10">
          <CheckCircle2 className="w-14 h-14 text-success mx-auto mb-4" />
          <h1 className="text-xl font-bold text-wine mb-2">Booking Request Received!</h1>
          <p className="text-sm text-text-muted mb-4">
            Thank you for booking with {BUSINESS.name}. Our team will review your request and reach out shortly.
          </p>
          <div className="bg-wine/5 rounded-lg px-4 py-3 mb-4">
            <p className="text-xs text-text-muted">Booking Reference</p>
            <p className="text-lg font-bold text-wine">{result.booking_code}</p>
          </div>
          <p className="text-xs text-text-muted mb-6">
            A confirmation email will be sent to you shortly. Save your booking reference to check your status
            anytime from the home page.
          </p>
          <Button as={Link} to={`/booking/${result.access_token}`} className="w-full">
            View My Booking
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Logo className="w-14 h-14 text-wine mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-wine">Book Your Event</h1>
          <p className="text-sm text-text-muted mt-1">
            Fill out the form below and our team will get back to you to confirm your booking.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card title="Client Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Client Name"
                error={errors.client_name?.message}
                {...register('client_name', { required: 'Client name is required' })}
              />
              <Input
                label="Email"
                type="email"
                error={errors.client_email?.message}
                {...register('client_email', { required: 'Email is required for your confirmation' })}
              />
              <Input
                label="Contact Number"
                error={errors.client_phone?.message}
                {...register('client_phone', { required: 'Contact number is required' })}
              />
              <Input label="Address" {...register('client_address')} />
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
                min={todayStr()}
                error={errors.event_date?.message}
                {...register('event_date', { required: 'Event date is required' })}
              />
              <Input label="Start Time" type="time" {...register('event_time')} />
              <Input
                label="Number of Guests"
                type="number"
                min="1"
                error={errors.pax?.message}
                {...register('pax', {
                  required: 'Number of guests is required',
                  min: { value: 1, message: 'Must be at least 1 guest' },
                })}
              />
              <Input label="Theme / Motif" placeholder="e.g. Rustic Garden" {...register('event_motif')} />
            </div>
          </Card>

          <Card title="Venue Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Venue Name"
                error={errors.venue?.message}
                {...register('venue', { required: 'Venue name is required' })}
              />
              <Input label="Venue Contact Number" {...register('venue_contact_number')} />
              <Input label="Pin Location" placeholder="Google Maps link" {...register('venue_pin_location')} />
              <Input label="Access Time" placeholder="e.g. 8:00 AM" {...register('venue_access_time')} />
            </div>
          </Card>

          <Card title="Menu Package">
            <p className="text-xs text-text-muted mb-3">
              Choose a package to get started — we'll finalize the specific menu with you before your event.
            </p>
            {errors.menu_package && <p className="text-xs text-danger mb-2">{errors.menu_package.message}</p>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MENU_PACKAGES.map((pkg) => (
                <label
                  key={pkg}
                  className="flex items-center justify-center gap-2 rounded-lg border border-gold/30 px-3 py-3 text-sm font-medium text-text-dark cursor-pointer has-[:checked]:border-wine has-[:checked]:bg-wine/5 has-[:checked]:text-wine"
                >
                  <input
                    type="radio"
                    value={pkg}
                    className="sr-only"
                    {...register('menu_package', { required: 'Please select a menu package' })}
                  />
                  {pkg}
                </label>
              ))}
            </div>
          </Card>

          <Card title="Inclusions">
            <p className="text-xs text-text-muted mb-2">Included in every booking:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-text-dark mb-4">
              {DEFAULT_INCLUSIONS.map((item) => (
                <li key={item} className="flex gap-1.5">
                  <span aria-hidden="true">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-6 pt-3 border-t border-gold/10">
              <label className="flex items-center gap-2 text-sm text-text-dark">
                <input type="checkbox" className={CHECKBOX_CLASS} {...register('lechon_chopping')} />
                Lechon
              </label>
              <label className="flex items-center gap-2 text-sm text-text-dark">
                <input type="checkbox" className={CHECKBOX_CLASS} {...register('cake_table')} />
                Cake Table
              </label>
            </div>
          </Card>

          <Card title="Special Requests / Notes">
            <Textarea placeholder="Anything else we should know?" {...register('special_requests')} />
          </Card>

          <Button type="submit" className="w-full" disabled={submitting}>
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting…' : 'Submit Booking Request'}
          </Button>
        </form>
      </div>
    </div>
  )
}
