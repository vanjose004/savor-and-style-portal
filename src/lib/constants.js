export const BUSINESS = {
  name: 'Savor and Style Catering Services',
  legalName: 'V&A Estrella Catering Services',
  address: '1185 Tabing Ilog, Sta. Clara, Santa Maria, Bulacan',
  displayLocation: 'Sta. Maria, Bulacan | Serving Metro Manila & Nearby Areas',
  phone: '0948-599-2866',
  facebook: 'Savor and Style Catering Services',
}

export const EVENT_TYPES = [
  'Adult Birthday',
  'Debut',
  'Kiddie Party',
  'Christening/Dedication',
  'Wedding',
  'House Blessing',
  'Corporate',
  'Others',
]

// Event types that show the Number of Adults / Number of Kids fields and the
// Kids Menu section on the booking form, booking detail page, client portal,
// and Booking Form PDF.
export const KIDS_EVENT_TYPES = ['Kiddie Party', 'Christening/Dedication']

// Default Kids Menu items, pre-selected when creating a booking with a kids
// event type.
export const DEFAULT_KIDS_MENU = ['Filipino Spaghetti', 'Fried Chicken', 'Juice', 'Kiddie Tables and Chairs']

export const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']

export const MENU_CATEGORIES = [
  'Pork',
  'Chicken',
  'Pasta',
  'Beef',
  'Vegetable',
  'Fish',
  'Juice',
  'Dessert',
]

export const MENU_ITEM_STATUSES = ['suggested', 'confirmed', 'rejected']

export const PAYMENT_TYPES = ['reservation_fee', 'downpayment', 'partial', 'balance']

export const PAYMENT_METHODS = ['GCash', 'Maya', 'Cash', 'Bank Transfer', 'Credit Card', 'Check']

export const UPDATE_TYPES = [
  'payment_update',
  'menu_update',
  'headcount_change',
  'general_update',
  'confirmation',
  'reminder',
  'contract_update',
]

export const CHANGE_REQUEST_TYPES = [
  'menu_suggestion',
  'headcount_change',
  'venue_change',
  'special_request',
  'other',
]

export const CHANGE_REQUEST_STATUSES = ['pending', 'approved', 'rejected']

export const STAFF_ROLES = ['waiter', 'team_leader', 'cook', 'driver']

export const CHECKLIST_CATEGORIES = ['setup', 'food_prep', 'equipment', 'service', 'cleanup']

export const DEFAULT_INCLUSIONS = [
  'Tables and Chairs with Cloths',
  'Complete Flatware and Silverwares',
  'Waiter Service and Food Servers',
  'Water and Ice',
]

// Default freebies catalog. Items with a `unit` get a quantity field on the
// admin booking form (e.g. "Event Backdrop (3 panels)").
export const DEFAULT_FREEBIES = [
  { name: 'Event Backdrop', unit: 'panel' },
  { name: 'Grass Carpet' },
  { name: 'Balloons' },
  { name: 'Cake Table' },
  { name: 'Gift Table' },
  { name: 'Extra Food Warmer', unit: 'unit' },
  { name: 'Name of Celebrant Display' },
  { name: 'Red Carpet' },
  { name: 'Couch' },
  { name: 'Couple Table' },
  { name: 'VIP Table', unit: 'seat' },
  { name: 'Accent Lights' },
  { name: 'Panels', unit: 'panel' },
  { name: 'Flowers' },
]

/** Render a stored freebie ({ name, quantity? }) as a display label. */
export function formatFreebie(freebie) {
  if (!freebie) return ''
  const { name, quantity } = freebie
  if (!quantity) return name

  const def = DEFAULT_FREEBIES.find((item) => item.name === name)
  const unit = def?.unit
  if (!unit) return `${name} (x${quantity})`

  return `${name} (${quantity} ${unit}${quantity === 1 ? '' : 's'})`
}

export const RESERVATION_FEE = 5000
export const CREDIT_CARD_FEE_RATE = 0.05
export const DEFAULT_SERVICE_HOURS = 5
export const EXTRA_HOUR_RATE_PER_STAFF = 100
export const LECHON_CHOPPING_FEE = 300

// Shown wherever lechon_chopping is true — on the booking detail page and in
// the "Other Inclusions / Requests / Notes" section of the Booking Form PDF.
export const LECHON_NOTE = `Lechon chopping fee: ₱${LECHON_CHOPPING_FEE} payable directly to staff`

export const PAYMENT_TYPE_LABELS = {
  reservation_fee: 'Reservation Fee',
  downpayment: 'Downpayment',
  partial: 'Partial Payment',
  balance: 'Balance Payment',
}

export const UPDATE_TYPE_LABELS = {
  payment_update: 'Payment Update',
  menu_update: 'Menu Update',
  headcount_change: 'Headcount Change',
  general_update: 'General Update',
  confirmation: 'Confirmation',
  reminder: 'Reminder',
  contract_update: 'Contract Update',
}

export const CHANGE_REQUEST_TYPE_LABELS = {
  menu_suggestion: 'Menu Suggestion',
  headcount_change: 'Headcount Change',
  venue_change: 'Venue Change',
  special_request: 'Special Request',
  other: 'Other',
}

export const STAFF_ROLE_LABELS = {
  waiter: 'Waiter',
  team_leader: 'Team Leader',
  cook: 'Cook',
  driver: 'Driver',
}

export const CHECKLIST_CATEGORY_LABELS = {
  setup: 'Setup',
  food_prep: 'Food Prep',
  equipment: 'Equipment',
  service: 'Service',
  cleanup: 'Cleanup',
}
