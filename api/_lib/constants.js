// Re-exports the admin app's own taxonomy constants instead of duplicating
// them here — single source of truth for category/payment-method lists
// the bot's pickers and validation must stay in sync with.
export {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_PAYMENT_METHODS,
  PAYMENT_TYPES,
  PAYMENT_TYPE_LABELS,
  PAYMENT_METHODS,
  EVENT_TYPES,
  BUSINESS,
  SOFT_RESERVE_PACKAGES,
  DEFAULT_INCLUSIONS,
  PAYMENT_INSTRUCTIONS,
  SOFT_RESERVE_FEE,
  RESERVATION_FEE,
  FOOD_TASTING_FEE_NON_RESERVED,
  SOFT_RESERVE_HOW_IT_WORKS_STEPS,
  peso,
} from '../../src/lib/constants.js'
