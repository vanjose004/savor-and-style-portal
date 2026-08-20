// Hardcoded sample data for the client portal's public demo mode. Entering
// this "booking code" (in Home.jsx's lookup modal, or by visiting
// /booking/DEMO-2026 directly) shows a pre-filled sample booking instead of
// querying Supabase — lets anyone preview what a client sees without a real
// booking existing.
export const DEMO_BOOKING_CODE = 'DEMO-2026'

export const DEMO_PAID = 5000
export const DEMO_BALANCE = 23000
export const DEMO_TOTAL_AMOUNT = DEMO_PAID + DEMO_BALANCE

export const DEMO_BOOKING = {
  booking_code: DEMO_BOOKING_CODE,
  client_first_name: 'Maria',
  client_name: 'Maria Santos',
  client_phone: '0917-123-4567',
  client_address: 'Sample Address, Quezon City',
  status: 'confirmed',
  event_type: 'Birthday Celebration',
  event_date: '2026-12-25',
  event_time: null,
  venue: 'Sample Garden Venue, Bulacan',
  event_motif: null,
  pax: 100,
  special_requests: null,
  contract_signed: true,
  contract_signed_at: '2026-01-15T10:00:00+08:00',
  kids_menu: [],
  freebies: [],
  total_amount: DEMO_TOTAL_AMOUNT,
  balance: DEMO_BALANCE,
}

export const DEMO_PACKAGE_NAME = 'Silver'
export const DEMO_MENU_ITEMS = ['Pork Adobo', 'Chicken Inasal', 'Pinakbet', 'Leche Flan', 'Buko Pandan']

// Same dishes as DEMO_MENU_ITEMS, shaped for generateBookingFormPDF (which
// expects { category, dish_name, status } rows grouped by MENU_CATEGORIES).
export const DEMO_MENU_ITEMS_DETAILED = [
  { category: 'Pork', dish_name: 'Pork Adobo', status: 'confirmed' },
  { category: 'Chicken', dish_name: 'Chicken Inasal', status: 'confirmed' },
  { category: 'Vegetable', dish_name: 'Pinakbet', status: 'confirmed' },
  { category: 'Dessert', dish_name: 'Leche Flan', status: 'confirmed' },
  { category: 'Dessert', dish_name: 'Buko Pandan', status: 'confirmed' },
]

// Shaped for generateAcknowledgementReceiptPDF's `payment` argument.
export const DEMO_PAYMENT = {
  id: 'demo-payment-1',
  ar_number: 'DEMO-0001',
  amount: DEMO_PAID,
  payment_type: 'reservation_fee',
  payment_method: 'GCash',
  reference_number: 'DEMO123456',
  paid_at: '2026-01-15T10:00:00+08:00',
  credit_card_fee: 0,
}
