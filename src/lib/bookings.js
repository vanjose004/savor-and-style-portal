import { RESERVATION_FEE, DEFAULT_SERVICE_HOURS } from './constants'

/**
 * Split a BookingForm submission into the `clients` and `bookings` table
 * payloads, normalizing blank strings to null and numeric fields that may
 * have been left empty (valueAsNumber produces NaN for "").
 *
 * `wasContractSigned` is the booking's contract_signed value before this
 * edit (false for a new booking) — contract_signed_at is only touched when
 * contract_signed actually changes, so an unrelated edit doesn't overwrite
 * the original signing date.
 */
export function splitBookingFormValues(values, { wasContractSigned = false } = {}) {
  const clientFields = {
    name: values.name.trim(),
    phone: values.phone?.trim() || null,
    email: values.email?.trim() || null,
    address: values.address?.trim() || null,
  }

  const bookingFields = {
    event_type: values.event_type,
    event_date: values.event_date,
    event_time: values.event_time || null,
    venue: values.venue?.trim() || null,
    venue_pin_location: values.venue_pin_location?.trim() || null,
    venue_access_time: values.venue_access_time?.trim() || null,
    venue_contact_number: values.venue_contact_number?.trim() || null,
    event_motif: values.event_motif?.trim() || null,
    pax: Number.isFinite(values.pax) ? values.pax : null,
    num_adults: Number.isFinite(values.num_adults) ? values.num_adults : null,
    num_kids: Number.isFinite(values.num_kids) ? values.num_kids : null,
    kids_menu: Array.isArray(values.kids_menu) ? values.kids_menu : [],
    status: values.status,
    menu_confirmed: values.menu_confirmed,
    special_requests: values.special_requests?.trim() || null,
    total_amount: Number.isFinite(values.total_amount) ? values.total_amount : 0,
    reservation_fee: Number.isFinite(values.reservation_fee) ? values.reservation_fee : RESERVATION_FEE,
    contract_signed: values.contract_signed,
    service_hours: Number.isFinite(values.service_hours) ? values.service_hours : DEFAULT_SERVICE_HOURS,
    lechon_chopping: values.lechon_chopping,
    notes: values.notes?.trim() || null,
  }

  if (values.contract_signed !== wasContractSigned) {
    bookingFields.contract_signed_at = values.contract_signed ? new Date().toISOString() : null
  }

  return { clientFields, bookingFields }
}
