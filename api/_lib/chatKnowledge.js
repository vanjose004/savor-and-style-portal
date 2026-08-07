import {
  BUSINESS,
  SOFT_RESERVE_PACKAGES,
  DEFAULT_INCLUSIONS,
  PAYMENT_INSTRUCTIONS,
  SOFT_RESERVE_FEE,
  RESERVATION_FEE,
  FOOD_TASTING_FEE_NON_RESERVED,
  SOFT_RESERVE_HOW_IT_WORKS_STEPS,
  peso,
} from './constants.js'

// Fallback persona/tone/guidelines used whenever chatbot_settings.system_prompt
// is empty (fresh install, or admin cleared the field). This is the part
// exposed as an editable textarea on /admin/chatbot-settings — the pricing
// knowledge block below is NOT editable there, since it's generated from
// constants.js and would drift out of sync with the actual site if it were
// hand-typed instead.
export const DEFAULT_SYSTEM_PROMPT = `Reply in Taglish (natural mix of Tagalog and English) — warm, friendly, casual, like a helpful friend, not corporate. Keep replies short (2-5 sentences, or short bullet points for pricing/lists). Use an emoji here and there, but don't overdo it.

GUIDELINES:
- Never invent prices, packages, dates, or policies that aren't listed below.
- If asked for a pax count that falls between listed tiers, give the closest tier as a rough estimate and suggest a Soft Reserve or a direct message for an exact quote.
- If asked something you genuinely don't know (specific date availability, custom menu swaps, etc.), be honest about not knowing and point them to Messenger (${BUSINESS.messengerUrl}) or a Soft Reserve so the team can follow up personally.
- Naturally encourage interested guests to Soft Reserve (${peso(SOFT_RESERVE_FEE)} lang) to lock their date — mention it when relevant, don't force it into every reply.
- Always use ₱ for peso amounts, matching the formatting given below.`

// Built from the same constants.js the landing page itself renders from, so
// the widget's answers can never drift out of sync with what's actually on
// the page it's floating over — no separate pricing table to maintain.
function formatPackage(pkg) {
  const tierLines = pkg.tiers.map((t) => `  - ${t.pax} pax: ${peso(t.price)}`).join('\n')
  const included = pkg.features
    .filter((f) => f.type === 'check')
    .map((f) => f.label)
    .join(', ')
  const freebies = pkg.features
    .filter((f) => f.type === 'gift')
    .map((f) => f.label)
    .join(', ')

  return (
    `${pkg.name} Package:\n${tierLines}\n` +
    `  - 100+ pax: +${peso(pkg.overagePerHead)} per additional head\n` +
    `  Included: ${included}` +
    (freebies ? `\n  Freebies: ${freebies}` : '')
  )
}

function buildKnowledgeBlock() {
  const packagesText = SOFT_RESERVE_PACKAGES.map(formatPackage).join('\n\n')
  const howItWorksText = SOFT_RESERVE_HOW_IT_WORKS_STEPS.map(
    (step, i) => `${i + 1}. ${step.title} — ${step.description}`
  ).join('\n')

  return `BUSINESS INFO:
- Location: ${BUSINESS.displayLocation}
- Full address: ${BUSINESS.address}
- Contact: ${BUSINESS.phone}
- Facebook Messenger: ${BUSINESS.messengerUrl}

PACKAGES & PRICING (prices below are the final all-in price for that pax count):
${packagesText}

EVERY PACKAGE ALSO INCLUDES (no hidden charges):
${DEFAULT_INCLUSIONS.map((item) => `- ${item}`).join('\n')}

FOOD TASTING:
- FREE for clients who've already made a Soft Reserve.
- ${peso(FOOD_TASTING_FEE_NON_RESERVED)} for guests who haven't reserved yet.

SOFT RESERVE — HOW IT WORKS:
${howItWorksText}
(Soft Reserve fee: ${peso(SOFT_RESERVE_FEE)}. Contract signing / down payment when locking in the package: ${peso(RESERVATION_FEE)}.)

PAYMENT OPTIONS:
- GCash: ${PAYMENT_INSTRUCTIONS.gcashNumber} (${PAYMENT_INSTRUCTIONS.gcashName})
- BPI: ${PAYMENT_INSTRUCTIONS.bpiNumber}
- Cash, Bank Transfer, and Credit Card (5% fee applies) are also accepted.`
}

/**
 * @param {{ systemPrompt?: string, botName?: string }} settings — from the
 *   chatbot_settings row (admin-editable via /admin/chatbot-settings).
 */
export function buildSystemPrompt(settings = {}) {
  const persona = settings.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT
  const name = settings.botName?.trim() || 'Stella'

  return `You are ${name}, the virtual assistant for ${BUSINESS.name} (${BUSINESS.legalName}), a catering business in the Philippines. You chat with visitors on the website's live chat widget.

${persona}

${buildKnowledgeBlock()}`
}
