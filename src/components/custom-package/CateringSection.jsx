import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, formatCurrency } from '../../lib/utils'
import { CATERING_PAX_OPTIONS, CATERING_TIERS, BEEF_SWAP_FEE, WEDDING_RATE_ADDON } from '../../lib/customPackage'

export default function CateringSection({ pax, onPaxChange, tierId, onTierChange, isWedding, onWeddingChange, beefSwap, onBeefSwapChange }) {
  return (
    <section>
      <h2 className="font-heading font-bold text-2xl text-wine">1. Catering Package</h2>
      <p className="text-sm text-text-muted mt-1">Required — pick your guest count and a tier below.</p>

      <div className="mt-6">
        <p className="text-sm font-semibold text-text-dark mb-2">Number of Guests</p>
        <div className="flex flex-wrap gap-2">
          {CATERING_PAX_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onPaxChange(option)}
              className={cn(
                'px-4 py-2 rounded-full border text-sm font-medium transition-all',
                pax === option
                  ? 'bg-wine text-warm-white border-wine shadow-sm'
                  : 'bg-warm-white text-text-dark border-gold/30 hover:border-wine/50'
              )}
            >
              {option} pax
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold text-text-dark mb-2">Event Rate</p>
        <div className="inline-flex rounded-full border border-gold/30 bg-warm-white p-1">
          {[
            { value: false, label: 'Birthday / Gathering' },
            { value: true, label: 'Wedding' },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => onWeddingChange(option.value)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                isWedding === option.value ? 'bg-wine text-warm-white shadow-sm' : 'text-text-dark hover:text-wine'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {isWedding && (
          <p className="text-xs text-text-muted mt-1.5">
            Wedding rate adds {formatCurrency(WEDDING_RATE_ADDON)} to the catering price above.
          </p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CATERING_TIERS.map((tier) => {
          const selected = tierId === tier.id
          const price = pax ? tier.prices[pax] : null

          return (
            <motion.div
              key={tier.id}
              whileHover={{ y: -3 }}
              className={cn(
                'rounded-2xl border-2 p-5 transition-colors',
                selected ? 'border-wine bg-wine/5 shadow-md' : 'border-gold/25 bg-warm-white'
              )}
            >
              <button type="button" onClick={() => onTierChange(tier.id)} className="w-full text-left">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-xl text-wine">{tier.name}</h3>
                  {selected && (
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-wine text-warm-white">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <p className="text-xs uppercase tracking-wide text-gold font-semibold mt-1">
                  {tier.dishCount} Main Dishes
                </p>

                <p className="mt-3 text-2xl font-bold text-text-dark">
                  {price !== null ? formatCurrency(price) : '—'}
                </p>
                <p className="text-xs text-text-muted mb-3">
                  {pax ? `for ${pax} pax` : 'Select guest count above'}
                </p>

                <ul className="flex flex-wrap gap-1.5">
                  {tier.dishes.map((dish) => (
                    <li
                      key={dish}
                      className="text-xs px-2 py-1 rounded-full bg-cream text-text-dark border border-gold/20"
                    >
                      {dish}
                    </li>
                  ))}
                </ul>
              </button>

              {tier.allowsBeefSwap && selected && (
                <label className="mt-4 pt-4 border-t border-gold/20 flex items-center gap-2 text-sm text-text-dark cursor-pointer">
                  <input
                    type="checkbox"
                    checked={beefSwap}
                    onChange={(e) => onBeefSwapChange(e.target.checked)}
                    className="rounded border-gold/40 text-wine focus:ring-2 focus:ring-wine/30"
                  />
                  Swap a dish to Beef (+{formatCurrency(BEEF_SWAP_FEE)})
                </label>
              )}
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
