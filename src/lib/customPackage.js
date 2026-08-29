// Data + pure pricing logic for the "Make Your Own Package" builder
// (src/pages/MakeYourOwnPackage.jsx, routed at /wedding-quote). Catering
// tier prices are shown in the UI; supplier prices below are intentionally
// never rendered — only used to compute the running total — per the page's
// "hidden per-item pricing" design. Ceiling Treatment is the sole exception
// (`showPrice: true`) — its price is shown on its card and in the summary
// because the business wants that one flagged as a "starting rate".

import { formatCurrency } from './utils'

export const CATERING_PAX_OPTIONS = [50, 60, 70, 100, 150, 200]

export const WEDDING_RATE_ADDON = 5000
export const BEEF_SWAP_FEE = 1500
export const COORDINATION_FEE = 10000
export const COORDINATION_FEE_LABEL = 'Savor & Style All-In Coordination Fee'

export const CATERING_TIERS = [
  {
    id: 'bronze',
    name: 'Bronze',
    dishCount: 4,
    dishes: ['Pork', 'Chicken', 'Veggie', 'Pasta', 'Rice', 'Juice', 'Dessert'],
    prices: { 50: 22000, 60: 25000, 70: 28000, 100: 40000, 150: 55000, 200: 70000 },
  },
  {
    id: 'silver',
    name: 'Silver',
    dishCount: 5,
    dishes: ['Pork', 'Chicken', 'Fish', 'Veggie', 'Pasta', 'Rice', 'Juice', 'Dessert'],
    prices: { 50: 25000, 60: 29000, 70: 32000, 100: 43500, 150: 60000, 200: 76000 },
  },
  {
    id: 'gold',
    name: 'Gold',
    dishCount: 6,
    dishes: ['Pork', 'Chicken', 'Fish', 'Veggie', 'Pasta', 'Rice', 'Juice', 'Dessert'],
    prices: { 50: 29000, 60: 33000, 70: 37000, 100: 52000, 150: 68000, 200: 85000 },
    allowsBeefSwap: true,
  },
]

// The 3 "ESSENTIAL" suppliers below are grouped and badged separately in
// SuppliersSection.jsx (filtered by this flag, not by array position).
export const ESSENTIAL_SUPPLIERS_NOTE =
  '💡 These are the core suppliers most couples book for a complete and stress-free event.'

// `type`:
//  - 'toggle'  : single on/off, flat `price`
//  - 'choice'  : mutually-exclusive `options`, pick at most one
//  - 'hmua'    : on/off `basePrice` + per-head `extraHeadPrice` counter
//  - 'quantity': on/off `pricePerUnit` counter, defaults its quantity to the
//                selected catering pax when first turned on
export const SUPPLIERS = [
  { id: 'stylist', label: 'Event Stylist', type: 'toggle', price: 12000, essential: true },
  {
    id: 'photography',
    label: 'Photography',
    type: 'choice',
    options: [
      { id: 'photo_only', label: 'Photo Only', price: 5000 },
      { id: 'photo_video', label: 'Photo + Video', price: 12000 },
      { id: 'photo_video_sde', label: 'Photo + Video + SDE', price: 20000 },
    ],
  },
  {
    id: 'prenup',
    label: 'Pre-nup',
    type: 'choice',
    options: [
      { id: 'photo_only', label: 'Photo Only', price: 5000 },
      { id: 'photo_video', label: 'Photo + Video', price: 12000 },
    ],
  },
  { id: 'sounds_lights', label: 'Sounds & Lights (Basic)', type: 'toggle', price: 6000, essential: true },
  { id: 'emcee', label: 'Emcee', type: 'toggle', price: 8000, essential: true },
  { id: 'cake', label: 'Cake (2-tier)', type: 'toggle', price: 6500 },
  {
    id: 'flowers',
    label: 'Flowers (Bridal Package)',
    type: 'toggle',
    price: 7000,
    inclusions: ['Bridal bouquet', 'Groom boutonniere x5', 'Mini bouquet x3'],
  },
  {
    id: 'hmua',
    label: 'Hair & Makeup',
    type: 'hmua',
    baseLabel: 'Bride + Groom + 2 Mothers',
    basePrice: 10000,
    extraHeadPrice: 1500,
  },
  { id: 'otd_coordinator', label: 'OTD Coordinator', type: 'toggle', price: 8000 },
  {
    id: 'grazing_table',
    label: 'Grazing Table',
    type: 'toggle',
    price: 16000,
    inclusions: ['100 pax', '7 kakanin station'],
  },
  { id: 'mobile_bar', label: 'Mobile Bar', type: 'toggle', price: 18000, inclusions: ['100 pax'] },
  {
    id: 'tiffany_chairs',
    label: 'Tiffany Chair Upgrade',
    type: 'quantity',
    pricePerUnit: 85,
    unitLabel: 'chair',
  },
  { id: 'led_wall', label: 'LED Wall', type: 'toggle', price: 20000 },
  {
    id: 'ceiling_treatment',
    label: 'Ceiling Treatment',
    type: 'toggle',
    price: 150000,
    showPrice: true,
    note: 'Ceiling treatment pricing varies per venue size and design. This is the starting rate.',
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

/** Supplier subtotal + display labels (names only, no prices) for the summary panel. */
export function getSupplierSummary(selections) {
  let total = 0
  const labels = []

  for (const supplier of SUPPLIERS) {
    const selection = selections[supplier.id]

    if (supplier.type === 'toggle') {
      if (selection) {
        total += supplier.price
        labels.push(supplier.showPrice ? `${supplier.label} — ${formatCurrency(supplier.price)}` : supplier.label)
      }
    } else if (supplier.type === 'choice') {
      const option = supplier.options.find((o) => o.id === selection)
      if (option) {
        total += option.price
        labels.push(`${supplier.label} — ${option.label}`)
      }
    } else if (supplier.type === 'hmua') {
      if (selection?.enabled) {
        const extraHeads = selection.extraHeads || 0
        total += supplier.basePrice + extraHeads * supplier.extraHeadPrice
        labels.push(
          extraHeads > 0
            ? `${supplier.label} (+${extraHeads} extra head${extraHeads > 1 ? 's' : ''})`
            : supplier.label
        )
      }
    } else if (supplier.type === 'quantity') {
      const qty = selection?.qty || 0
      if (selection?.enabled && qty > 0) {
        total += supplier.pricePerUnit * qty
        labels.push(`${supplier.label} (x${qty})`)
      }
    }
  }

  return { total, labels }
}
