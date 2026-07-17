// Lightweight regex/keyword parser for free-text expense messages like
// "Diesel 1500" or "Food 12000 SS-032" — no LLM call, keeps this fast and
// free to run. Category guesses are never trusted blindly: low/no
// confidence routes to a category-picker in expenseFlow.js rather than
// silently defaulting to "others".

// Matches both the shorthand admins actually type ("SS-032") and the full
// stored booking_code format ("SS-2026-032") — the year segment is optional.
const BOOKING_REF_PATTERN = /\bSS-?\d{2,4}(?:-\d{2,3})?\b/i
const AMOUNT_PATTERN = /(\d[\d,]*(?:\.\d{1,2})?)/

// Keyword -> expenses.category (fixed 11-value DB check constraint —
// keep this list in sync with EXPENSE_CATEGORIES in src/lib/constants.js
// if that list ever changes).
const CATEGORY_KEYWORDS = {
  transportation: ['diesel', 'gas', 'gasolina', 'transport', 'pamasahe', 'toll', 'parking', 'grab'],
  ingredients: ['food', 'ulam', 'pagkain', 'palengke', 'groceries', 'karne', 'gulay', 'prutas'],
  bills_utilities: ['kuryente', 'electric', 'bill', 'tubig', 'water', 'internet', 'wifi', 'load'],
  equipment: ['kagamitan', 'equipment', 'gripo', 'tent', 'tolda', 'ilaw', 'chairs', 'tables'],
  event_supplies: ['decor', 'supplies', 'balloons', 'backdrop', 'flowers', 'ribbon'],
  staff_labor: ['staff', 'labor', 'sahod', 'waiter', 'allowance'],
  utang_payment: ['utang', 'loan'],
  marketing_ads: ['ads', 'boost', 'marketing', 'promote'],
  owner_salary: ['owner salary', 'owner draw'],
  chef_salary: ['chef salary', 'chef sahod'],
}

function guessCategory(description) {
  const lower = description.toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return { category, confidence: 'high' }
    }
  }
  return { category: null, confidence: 'none' }
}

function normalizeBookingRef(ref) {
  return ref.toUpperCase().replace(/\s+/g, '')
}

/**
 * @returns {{ ok: true, amount: number, description: string, bookingRef: string|null, category: string|null, categoryConfidence: 'high'|'none' } | { ok: false }}
 */
export function parseExpenseMessage(rawText) {
  let text = rawText.trim()

  let bookingRef = null
  const refMatch = text.match(BOOKING_REF_PATTERN)
  if (refMatch) {
    bookingRef = normalizeBookingRef(refMatch[0])
    text = text.replace(refMatch[0], ' ').trim()
  }

  const amountMatch = text.match(AMOUNT_PATTERN)
  if (!amountMatch) return { ok: false }

  const amount = Number(amountMatch[1].replace(/,/g, ''))
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false }

  const description = text.replace(amountMatch[0], '').trim() || 'Expense'
  const { category, confidence: categoryConfidence } = guessCategory(description)

  return { ok: true, amount, description, bookingRef, category, categoryConfidence }
}
