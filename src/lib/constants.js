export const BUSINESS = {
  name: 'Savor and Style Catering Services',
  legalName: 'V&A Estrella Catering Services',
  address: '1185 Tabing Ilog, Sta. Clara, Santa Maria, Bulacan',
  displayLocation: 'Sta. Maria, Bulacan | Serving Metro Manila & Nearby Areas',
  phone: '0948-599-2866',
  facebook: 'Savor and Style Catering Services',
}

export const EVENT_TYPES = [
  'Birthday',
  'Wedding',
  'Corporate',
  'Binyag/Debut/Graduation',
  'Houseblessing',
  'Other',
]

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

export const RESERVATION_FEE = 5000
export const CREDIT_CARD_FEE_RATE = 0.05
export const DEFAULT_SERVICE_HOURS = 5
export const EXTRA_HOUR_RATE_PER_STAFF = 100
export const LECHON_CHOPPING_FEE = 300

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
