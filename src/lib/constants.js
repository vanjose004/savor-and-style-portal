import { formatCurrency } from './utils'

export const BUSINESS = {
  name: 'Savor and Style Catering Services',
  legalName: 'V&A Estrella Catering Services',
  address: '1185 Tabing Ilog, Sta. Clara, Santa Maria, Bulacan',
  displayLocation: 'Sta. Maria, Bulacan | Serving Metro Manila & Nearby Areas',
  phone: '0948-599-2866',
  phoneTel: 'tel:+639485992866',
  facebook: 'Savor and Style Catering Services',
  facebookUrl: 'https://www.facebook.com/EstrellasCateringServices/',
  messengerUrl: 'https://m.me/EstrellasCateringServices',
  // Hardcoded (not window.location.origin) specifically for QR codes that
  // get printed/screenshotted and live indefinitely — e.g. the permanent
  // home-base attendance QR. Generating one from a preview-deploy domain
  // by accident would silently break a physically-posted poster forever.
  siteUrl: 'https://www.savorandstylecatering.com',
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

// ─────────────────────────────────────────────────────────────────────────
// Public landing page (/landing) — Soft Reserve lead-capture funnel
// ─────────────────────────────────────────────────────────────────────────

// Whole-peso amounts only (every fee below is a round number) — drops the
// ".00" that Intl's currency formatter always appends.
export const peso = (amount) => formatCurrency(amount).replace(/\.00$/, '')

export const SOFT_RESERVE_FEE = 500
export const SOFT_RESERVE_CTA_LABEL = `Soft Reserve — ${peso(SOFT_RESERVE_FEE)} lang`
export const FOOD_TASTING_FEE_NON_RESERVED = 2000

export const ANNOUNCEMENT_TEXT =
  '🎉 July-August Promo — Mag-book within 3 days para ma-lock ang promo price!'

export const PAYMENT_INSTRUCTIONS = {
  gcashNumber: '0948-599-2866',
  gcashName: 'Van Joseph Estrella',
  bpiNumber: '4739488397',
}

// Reuses EVENT_TYPES above so a soft reserve's event type always matches the
// same taxonomy as a real booking's, in case it later converts into one.
export const SOFT_RESERVE_EVENT_TYPES = EVENT_TYPES

export const SOFT_RESERVE_PACKAGE_OPTIONS = ['Promo', 'Bronze', 'Silver', 'Gold', 'Not sure yet']

// These are the tiers shown on the public marketing page (distinct from the
// internal MENU_PACKAGE_PRICES "Package 1-4" labels used when an admin quotes
// an actual booking). `price`/`guests` are a fallback headline (used only if
// `tiers` is ever empty); the landing page card renders the full `tiers`
// table plus the `overagePerHead` rate for 100+ pax.
export const SOFT_RESERVE_PACKAGES = [
  {
    name: 'Promo',
    price: '₱20,000',
    guests: 'Starting at 50 pax',
    tiers: [
      { pax: '50', price: 20000 },
      { pax: '70-75', price: 25000 },
      { pax: '100', price: 30000 },
      { pax: '150', price: 45000 },
      { pax: '200', price: 60000 },
    ],
    overagePerHead: 300,
    features: [
      { type: 'check', label: '3 main dishes' },
      { type: 'check', label: 'Waiter Service' },
      { type: 'check', label: 'Buffet Table & Warmers' },
      { type: 'check', label: 'Silverware' },
      { type: 'check', label: 'Tables & Chairs w/ Cloth' },
      { type: 'check', label: 'Cake Table' },
      { type: 'check', label: 'Rice, Water & Ice' },
      { type: 'gift', label: 'FREE Simple Backdrop w/ Artificial Flowers' },
    ],
  },
  {
    name: 'Bronze',
    price: '₱25,000',
    guests: 'Starting at 50 pax',
    tiers: [
      { pax: '50', price: 25000 },
      { pax: '60', price: 28500 },
      { pax: '70', price: 32000 },
      { pax: '80', price: 36000 },
      { pax: '90', price: 38000 },
      { pax: '100', price: 40000 },
    ],
    overagePerHead: 400,
    features: [
      { type: 'check', label: '4 main dishes + dessert' },
      { type: 'check', label: 'Waiter Service' },
      { type: 'check', label: 'Buffet Table & Warmers' },
      { type: 'check', label: 'Silverware' },
      { type: 'check', label: 'Tables & Chairs w/ Cloth' },
      { type: 'check', label: 'Cake Table' },
      { type: 'check', label: 'Rice, Water & Ice' },
      { type: 'gift', label: 'FREE Transport' },
      { type: 'gift', label: 'FREE Backdrop' },
      { type: 'gift', label: 'FREE Entrance Arch' },
      { type: 'gift', label: 'FREE Elegant Couch' },
      { type: 'gift', label: 'FREE Flower Decor' },
      { type: 'gift', label: 'FREE Red Carpet (FCFS)' },
      { type: 'gift', label: 'FREE Theme Styling' },
    ],
  },
  {
    name: 'Silver',
    price: '₱28,000',
    guests: 'Starting at 50 pax',
    highlight: true,
    tiers: [
      { pax: '50', price: 28000 },
      { pax: '60', price: 32000 },
      { pax: '70', price: 36000 },
      { pax: '80', price: 40500 },
      { pax: '90', price: 42750 },
      { pax: '100', price: 45000 },
    ],
    overagePerHead: 450,
    features: [
      { type: 'check', label: '5 main dishes + dessert + appetizer' },
      { type: 'check', label: 'Waiter Service' },
      { type: 'check', label: 'Buffet Table & Warmers' },
      { type: 'check', label: 'Silverware' },
      { type: 'check', label: 'Tables & Chairs w/ Cloth' },
      { type: 'check', label: 'Cake Table' },
      { type: 'check', label: 'Rice, Water & Ice' },
      { type: 'gift', label: 'FREE Transport' },
      { type: 'gift', label: 'FREE Backdrop' },
      { type: 'gift', label: 'FREE Entrance Arch' },
      { type: 'gift', label: 'FREE Elegant Couch' },
      { type: 'gift', label: 'FREE Flower Decor' },
      { type: 'gift', label: 'FREE Red Carpet (FCFS)' },
      { type: 'gift', label: 'FREE Theme Styling' },
    ],
  },
  {
    name: 'Gold',
    price: '₱32,000',
    guests: 'Starting at 50 pax',
    tiers: [
      { pax: '50', price: 32000 },
      { pax: '60', price: 36000 },
      { pax: '70', price: 40000 },
      { pax: '80', price: 45000 },
      { pax: '90', price: 47500 },
      { pax: '100', price: 50000 },
    ],
    overagePerHead: 500,
    features: [
      { type: 'check', label: '6 main dishes + dessert + pasta' },
      { type: 'check', label: 'Waiter Service' },
      { type: 'check', label: 'Buffet Table & Warmers' },
      { type: 'check', label: 'Silverware' },
      { type: 'check', label: 'Tables & Chairs w/ Cloth' },
      { type: 'check', label: 'Cake Table' },
      { type: 'check', label: 'Rice, Water & Ice' },
      { type: 'gift', label: 'FREE Transport' },
      { type: 'gift', label: 'FREE Backdrop' },
      { type: 'gift', label: 'FREE Entrance Arch' },
      { type: 'gift', label: 'FREE Elegant Couch' },
      { type: 'gift', label: 'FREE Flower Decor' },
      { type: 'gift', label: 'FREE Red Carpet (FCFS)' },
      { type: 'gift', label: 'FREE Theme Styling' },
    ],
  },
]

// Step 3 reuses RESERVATION_FEE (above) — it's the same ₱5,000 fee already
// charged when an admin creates a booking, so this stays in sync with that
// automatically instead of hardcoding a second copy of the number.
export const SOFT_RESERVE_HOW_IT_WORKS_STEPS = [
  {
    title: `Soft Reserve — ${peso(SOFT_RESERVE_FEE)}`,
    description: 'Secure your preferred date with a small reservation fee.',
  },
  {
    title: "We'll Reach Out Within 24hrs",
    description: 'Aabutan ka namin within 24 hours para i-confirm ang details ng event mo.',
  },
  {
    title: `Contract Signing — ${peso(RESERVATION_FEE)}`,
    description: 'Lock in your package with a signed contract and down payment.',
  },
  {
    title: 'Event Day',
    description: 'Sit back and enjoy — we handle everything on your special day.',
  },
]

export const CLIENT_PORTAL_FEATURES = [
  'Check your booking status anytime',
  'Download your contract',
  'Track your payment status',
  'Submit change requests',
]

// Set to a real YouTube video ID to replace the placeholder card in the
// landing page's video section.
export const YOUTUBE_VIDEO_ID = ''

export const SOFT_RESERVE_STATUSES = ['new', 'contacted', 'converted', 'expired']

export const SOFT_RESERVE_STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  converted: 'Converted',
  expired: 'Expired',
}

// Matches the `gallery_photos.category` check constraint in migration 34 —
// keep in sync if categories ever change.
export const GALLERY_CATEGORIES = [
  'Wedding',
  'Debut',
  'Kiddie Party',
  'Christening / Binyag',
  'Birthday',
  'Corporate Event',
  'Christmas Party',
  'House Blessing',
  'Buffet / Dining Setup',
  'Others',
]

export const SOFT_RESERVE_STATUS_COLORS = {
  new: 'warning',
  contacted: 'blue',
  converted: 'success',
  expired: 'danger',
}
