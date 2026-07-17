export const BUSINESS = {
  name: 'Savor and Style Catering Services',
  legalName: 'V&A Estrella Catering Services',
  address: '1185 Tabing Ilog, Sta. Clara, Santa Maria, Bulacan',
  displayLocation: 'Sta. Maria, Bulacan | Serving Metro Manila & Nearby Areas',
  phone: '0948-599-2866',
  facebook: 'Savor and Style Catering Services',
  facebookUrl: 'https://www.facebook.com/EstrellasCateringServices/',
  // Hardcoded (not window.location.origin) specifically for QR codes that
  // get printed/screenshotted and live indefinitely — e.g. the permanent
  // home-base attendance QR. Generating one from a preview-deploy domain
  // by accident would silently break a physically-posted poster forever.
  // Update if a custom domain is ever attached.
  siteUrl: 'https://savor-and-style-portal.vercel.app',
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

// Category each Kids Menu item is filed under when automatically added to a
// booking's main menu (booking_menu_items).
export const KIDS_MENU_ITEM_CATEGORIES = {
  'Filipino Spaghetti': 'Pasta',
  'Fried Chicken': 'Chicken',
  Juice: 'Juice',
  'Kiddie Tables and Chairs': 'Kids',
}

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
  'Kids',
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
  { name: 'Entrance Arch' },
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

// PLACEHOLDER PRICING — flat rate per package, confirmed sample-only by the
// business owner (2026-07-09), pending the real numbers from the separate
// quotation app. Update here when finalized; this is the single place the
// portal reads package pricing from (booking detail breakdown, dashboard
// activity feed) so every display in THIS app stays consistent by
// construction. Cake Table add-on is confirmed free — no price entry needed.
export const MENU_PACKAGE_PRICES = {
  'Package 1': 35000,
  'Package 2': 40000,
  'Package 3': 45000,
  'Package 4': 50000,
}

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
  change_request_update: 'Change Request Update',
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

// Purpose options for the Certificate of Employment (COE) generator on the
// Staff Management page.
export const COE_PURPOSES = [
  'Bank Loan',
  'Motor Loan',
  'Housing Loan',
  'Visa Application',
  'School Requirements',
  'Government Requirements',
  'Travel Requirements',
  'Rental Application',
  'Employment Purposes',
  'Others',
]

export const CHECKLIST_CATEGORY_LABELS = {
  setup: 'Setup',
  food_prep: 'Food Prep',
  equipment: 'Equipment',
  service: 'Service',
  cleanup: 'Cleanup',
}

// ─────────────────────────────────────────────────────────────────────────
// Accounting — income (transactions), expenses, payables/utang
// ─────────────────────────────────────────────────────────────────────────

export const MONTH_OPTIONS = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' },
]

export const INCOME_CATEGORIES = ['reservation_fee', 'downpayment', 'balance', 'other_income']

export const INCOME_CATEGORY_LABELS = {
  reservation_fee: 'Reservation Fee',
  downpayment: 'Downpayment',
  balance: 'Balance Payment',
  other_income: 'Other Income',
}

// Payment methods accepted for income — distinct from the booking-flow
// PAYMENT_METHODS above (different, overlapping-but-not-identical lists).
export const INCOME_PAYMENT_METHODS = ['GCash', 'Cash', 'Bank Transfer', 'Credit Card', 'Maya', 'Check']

export const INCOME_PAYMENT_METHOD_OPTIONS = INCOME_PAYMENT_METHODS.map((method) => ({
  value: method,
  label: method === 'Credit Card' ? 'Credit Card (+5% fee)' : method,
}))

export const EXPENSE_CATEGORIES = [
  'ingredients',
  'staff_labor',
  'transportation',
  'bills_utilities',
  'equipment',
  'utang_payment',
  'marketing_ads',
  'owner_salary',
  'chef_salary',
  'event_supplies',
  'others',
]

export const EXPENSE_CATEGORY_LABELS = {
  ingredients: 'Ingredients / Raw Materials',
  staff_labor: 'Staff / Labor',
  transportation: 'Transportation / Fuel',
  bills_utilities: 'Bills / Utilities',
  equipment: 'Equipment',
  utang_payment: 'Utang Payment',
  marketing_ads: 'Marketing / Ads',
  owner_salary: "Owner's Salary / Draw",
  chef_salary: 'Chef / Partner Salary',
  event_supplies: 'Event Supplies / Decorations',
  others: 'Others',
}

// Categories that show the "Period" field and the personal/business reminder
export const SALARY_CATEGORIES = ['owner_salary', 'chef_salary']

export const EXPENSE_PAYMENT_METHODS = ['Cash', 'GCash', 'Bank Transfer', 'Credit Card']

export const PAYABLE_STATUSES = ['unpaid', 'partial', 'paid']

export const PAYABLE_STATUS_LABELS = {
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
}

export const PAYABLE_STATUS_COLORS = {
  unpaid: 'danger',
  partial: 'warning',
  paid: 'success',
}
