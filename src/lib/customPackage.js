// Data + pure pricing logic for the "Make Your Own Package" builder
// (src/pages/MakeYourOwnPackage.jsx, routed at /wedding-quote). Catering
// tier prices are shown in the UI; supplier prices below are intentionally
// never rendered — only used to compute the running total — per the page's
// "hidden per-item pricing" design. Ceiling Treatment is the sole exception
// (`showPrice: true`) — its price is shown on its card, in the summary, and
// in the PDF because the business wants that one flagged as a "starting rate".

import { formatCurrency } from './utils'

// Transport fee is added to the grand total but is never displayed as a
// peso amount anywhere in the UI or PDF — only as "FREE Transport" (₱0 zone)
// or "Transport — Included" (any paid zone). See getTransportLabel below.
export const VENUE_ZONES = [
  { id: 'sta_maria', label: 'Sta. Maria & Nearby', fee: 0 },
  { id: 'bulacan_other', label: 'Bulacan (Other Towns)', fee: 1000 },
  { id: 'metro_manila', label: 'Metro Manila', fee: 3000 },
  {
    id: 'south_far',
    label: 'South / Far Areas',
    description: 'Makati, Parañaque, Las Piñas, Laguna, Cavite',
    fee: 5000,
  },
]

export function getTransportLabel(zone) {
  if (!zone) return ''
  return zone.fee === 0 ? 'FREE Transport' : 'Transport — Included'
}

export const CATERING_PAX_OPTIONS = [50, 60, 70, 80, 90, 100, 150, 200]

export const WEDDING_RATE_ADDON = 5000
export const BEEF_SWAP_FEE = 1500
export const COORDINATION_FEE = 10000
export const COORDINATION_FEE_LABEL = 'Savor & Style All-In Coordination Fee'

// Every dish in these two lists is bundled into every tier at every pax
// count — only the named main dishes vary by tier (see CATERING_TIERS).
export const CATERING_BUNDLED_DISHES = ['Dessert', 'Juice', 'Rice']

// Shown once as "included with every tier" — distinct from Event Stylist's
// backdrop/arch/couch/red carpet, which are NOT part of catering (see
// CATERING_EXCLUSION_NOTE below).
export const CATERING_INCLUSIONS = [
  'Waiter Service',
  'Buffet Table & Warmers (Roll-top chafers)',
  'Tables & Chairs with Cloth',
  'Cake Table',
  'Rice, Water & Ice',
  'Juice served by waiter (not self-serve)',
]

export const CATERING_EXCLUSION_NOTE =
  'Backdrop, arch, couch, and red carpet are not included in catering — these are part of the Event Stylist supplier.'

// Matches SOFT_RESERVE_PACKAGES in src/lib/constants.js (the official
// pricing shown on the main landing page's "Choose Your Package" section) —
// 150/200 pax are that table's 100-pax price plus its overagePerHead rate
// (Bronze ₱400/pax, Silver ₱450/pax, Gold ₱500/pax) times the excess pax.
export const CATERING_TIERS = [
  {
    id: 'bronze',
    name: 'Bronze',
    dishCount: 4,
    mainDishes: ['Pork', 'Chicken', 'Veggie', 'Pasta'],
    prices: { 50: 25000, 60: 28500, 70: 32000, 80: 36000, 90: 38000, 100: 40000, 150: 60000, 200: 80000 },
  },
  {
    id: 'silver',
    name: 'Silver',
    dishCount: 5,
    mainDishes: ['Pork', 'Chicken', 'Fish', 'Veggie', 'Pasta'],
    prices: { 50: 28000, 60: 32000, 70: 36000, 80: 40500, 90: 42750, 100: 45000, 150: 67500, 200: 90000 },
  },
  {
    id: 'gold',
    name: 'Gold',
    dishCount: 6,
    mainDishes: ['Pork', 'Chicken', 'Fish', 'Veggie', 'Pasta'],
    prices: { 50: 32000, 60: 36000, 70: 40000, 80: 45000, 90: 47500, 100: 50000, 150: 75000, 200: 100000 },
    allowsBeefSwap: true,
  },
]

// The 3 "ESSENTIAL" suppliers below are grouped and badged separately in
// SuppliersSection.jsx (filtered by this flag, not by array position).
export const ESSENTIAL_SUPPLIERS_NOTE =
  '💡 These are the core suppliers most couples book for a complete and stress-free event.'

// `type`:
//  - 'toggle'  : single on/off, flat `price`
//  - 'choice'  : mutually-exclusive `options` (each with its own `description`), pick at most one
//  - 'hmua'    : on/off `basePrice` + per-head `extraHeadPrice` counter
//  - 'quantity': on/off `pricePerUnit` counter, defaults its quantity to the
//                selected catering pax when first turned on
export const SUPPLIERS = [
  {
    id: 'stylist',
    label: 'Event Stylist',
    type: 'toggle',
    price: 12000,
    essential: true,
    description:
      'Complete event styling including themed backdrop with decorations, entrance arch, elegant couch, red carpet, and full theme coordination.',
  },
  {
    id: 'photography',
    label: 'Photography',
    type: 'choice',
    options: [
      { id: 'photo_only', label: 'Photo Only', price: 5000, description: 'Full event photo coverage with edited digital photos.' },
      {
        id: 'photo_video',
        label: 'Photo + Video',
        price: 12000,
        description: 'Full event photo and video coverage with edited digital files.',
      },
      {
        id: 'photo_video_sde',
        label: 'Photo + Video + SDE',
        price: 20000,
        description: 'Full coverage plus same-day edit video shown during the reception.',
      },
    ],
  },
  {
    id: 'prenup',
    label: 'Pre-nup',
    type: 'choice',
    options: [
      { id: 'photo_only', label: 'Photo Only', price: 5000, description: 'Pre-nuptial photo shoot with edited digital photos.' },
      {
        id: 'photo_video',
        label: 'Photo + Video',
        price: 12000,
        description: 'Pre-nuptial photo and video coverage with edited digital files.',
      },
    ],
  },
  {
    id: 'sounds_lights',
    label: 'Sounds & Lights',
    type: 'toggle',
    price: 6000,
    essential: true,
    description: 'Basic sound system with microphone, speakers, and event lighting setup for the duration of your event.',
  },
  {
    id: 'emcee',
    label: 'Emcee / Host',
    type: 'toggle',
    price: 8000,
    essential: true,
    description: 'Professional host to lead and manage your event program from start to finish.',
  },
  {
    id: 'otd_coordinator',
    label: 'OTD Coordinator',
    type: 'toggle',
    price: 8000,
    description: 'On-the-day coordinator to manage your event timeline, suppliers, and logistics from setup to end of event.',
  },
  {
    id: 'cake',
    label: 'Cake (2-tier)',
    type: 'toggle',
    price: 6500,
    description: 'Elegant 2-tier themed cake for your celebration.',
  },
  {
    id: 'flowers',
    label: 'Flowers (Bridal Package)',
    type: 'toggle',
    price: 7000,
    description: 'Bridal bouquet, 5 groom boutonnieres, and 3 mini bouquets for entourage.',
  },
  {
    id: 'hmua',
    label: 'Hair & Makeup',
    type: 'hmua',
    basePrice: 10000,
    extraHeadPrice: 1500,
    description: 'Base: Bride/Debut + Groom + 2 mothers. Additional heads available at extra cost.',
  },
  {
    id: 'grazing_table',
    label: 'Grazing Table',
    type: 'toggle',
    price: 16000,
    description: '7-station kakanin grazing table for 100 pax — perfect for cocktail hour or reception display.',
  },
  {
    id: 'mobile_bar',
    label: 'Mobile Bar',
    type: 'toggle',
    price: 18000,
    description: 'Full mobile bar setup for 100 pax with bartender and drinks service.',
  },
  {
    id: 'tiffany_chairs',
    label: 'Tiffany Chair Upgrade',
    type: 'quantity',
    pricePerUnit: 85,
    unitLabel: 'chair',
    description: 'Elegant Tiffany chairs to replace standard chairs included in package. Quantity auto-set to your selected pax.',
  },
  {
    id: 'led_wall',
    label: 'LED Wall',
    type: 'toggle',
    price: 20000,
    description: 'Large LED wall display for event backdrop or program presentations.',
  },
  {
    id: 'ceiling_treatment',
    label: 'Ceiling Treatment',
    type: 'toggle',
    price: 150000,
    showPrice: true,
    description: 'Full ceiling draping and treatment. Price starts at ₱150,000 depending on venue size and design.',
  },
]

/** Empty selection state, one entry per supplier, shaped by its `type`. */
export function initialSupplierSelections() {
  return SUPPLIERS.reduce((acc, supplier) => {
    if (supplier.type === 'toggle') acc[supplier.id] = false
    else if (supplier.type === 'choice') acc[supplier.id] = null
    else if (supplier.type === 'hmua') acc[supplier.id] = { enabled: false, extraHeads: 0 }
    else if (supplier.type === 'quantity') acc[supplier.id] = { enabled: false, qty: 0 }
    return acc
  }, {})
}

/** Catering subtotal for the current tier/pax/wedding/beef-swap choices (0 if incomplete). */
export function getCateringPrice({ tier, pax, isWedding, beefSwap }) {
  if (!tier || !pax) return 0
  let price = tier.prices[pax] ?? 0
  if (isWedding) price += WEDDING_RATE_ADDON
  if (tier.allowsBeefSwap && beefSwap) price += BEEF_SWAP_FEE
  return price
}

/**
 * Supplier subtotal + selected items for display (name + description, no
 * prices — Ceiling Treatment's label is the sole exception, carrying its
 * price inline). Consumed by both the running-total panel (label only) and
 * the PDF preview (label + description).
 */
export function getSupplierSummary(selections) {
  let total = 0
  const items = []

  for (const supplier of SUPPLIERS) {
    const selection = selections[supplier.id]

    if (supplier.type === 'toggle') {
      if (selection) {
        total += supplier.price
        items.push({
          id: supplier.id,
          label: supplier.showPrice ? `${supplier.label} — ${formatCurrency(supplier.price)}` : supplier.label,
          description: supplier.description,
        })
      }
    } else if (supplier.type === 'choice') {
      const option = supplier.options.find((o) => o.id === selection)
      if (option) {
        total += option.price
        items.push({ id: supplier.id, label: `${supplier.label} — ${option.label}`, description: option.description })
      }
    } else if (supplier.type === 'hmua') {
      if (selection?.enabled) {
        const extraHeads = selection.extraHeads || 0
        total += supplier.basePrice + extraHeads * supplier.extraHeadPrice
        items.push({
          id: supplier.id,
          label:
            extraHeads > 0
              ? `${supplier.label} (+${extraHeads} extra head${extraHeads > 1 ? 's' : ''})`
              : supplier.label,
          description: supplier.description,
        })
      }
    } else if (supplier.type === 'quantity') {
      const qty = selection?.qty || 0
      if (selection?.enabled && qty > 0) {
        total += supplier.pricePerUnit * qty
        items.push({ id: supplier.id, label: `${supplier.label} (x${qty})`, description: supplier.description })
      }
    }
  }

  return { total, items }
}
