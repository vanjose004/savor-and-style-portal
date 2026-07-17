import { supabase } from './supabase'
import {
  RESERVATION_FEE,
  DEFAULT_SERVICE_HOURS,
  KIDS_EVENT_TYPES,
  KIDS_MENU_ITEM_CATEGORIES,
  MENU_PACKAGE_PRICES,
  LECHON_CHOPPING_FEE,
} from './constants'

/**
 * Package price + add-on fees for a booking, using the same
 * MENU_PACKAGE_PRICES table everywhere in the portal so any display of a
 * booking's price breakdown stays consistent by construction. Cake Table
 * is a confirmed-free add-on, so it never contributes to the total.
 * Returns null if the booking has no menu_package (admin-created bookings
 * predating the public /book form, or ones where a package wasn't set).
 */
export function calculateBookingQuote(booking) {
  const packagePrice = MENU_PACKAGE_PRICES[booking?.menu_package]
  if (packagePrice === undefined) return null

  const lechonFee = booking.lechon_chopping ? LECHON_CHOPPING_FEE : 0

  return {
    packagePrice,
    lechonFee,
    total: packagePrice + lechonFee,
  }
}

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

/**
 * Ensure each checked Kids Menu item has a matching confirmed row in
 * booking_menu_items, so it shows up in the booking's main Menu section.
 * Only inserts items not already present — admin edits/removals via Edit
 * Menu are left alone.
 */
export async function syncKidsMenuItems(bookingId, eventType, kidsMenu) {
  if (!KIDS_EVENT_TYPES.includes(eventType) || !kidsMenu?.length) return

  const { data: existing, error } = await supabase
    .from('booking_menu_items')
    .select('dish_name')
    .eq('booking_id', bookingId)

  if (error) return

  const existingNames = new Set(existing.map((item) => item.dish_name))

  const toInsert = kidsMenu
    .filter((item) => KIDS_MENU_ITEM_CATEGORIES[item] && !existingNames.has(item))
    .map((item) => ({
      booking_id: bookingId,
      dish_name: item,
      category: KIDS_MENU_ITEM_CATEGORIES[item],
      suggested_by: 'admin',
      status: 'confirmed',
    }))

  if (toInsert.length > 0) {
    await supabase.from('booking_menu_items').insert(toInsert)
  }
}
