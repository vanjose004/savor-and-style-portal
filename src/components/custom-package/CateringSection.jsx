import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import {
  CATERING_BUNDLED_DISHES,
  CATERING_EXCLUSION_NOTE,
  CATERING_INCLUSIONS,
  CATERING_PAX_OPTIONS,
  CATERING_TIERS,
} from '../../lib/customPackage'

export default function CateringSection({
  eventCategory,
  venueSelected,
  pax,
  onPaxChange,
  tierId,
  onTierChange,
  isWedding,
  onWeddingChange,
  beefSwap,
  onBeefSwapChange,
}) {
  return (
    <section>
      <h2 className="font-heading font-bold text-2xl text-wine">2. Catering Package</h2>
      <p className="text-sm text-text-muted mt-1">Required — pick your guest count and a tier below.</p>

      <div className="mt-6">
        <p className="text-sm font-semibold text-text-dark mb-2">Number of Guests</p>
        {venueSelected ? (
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
        ) : (
          <p className="text-sm text-text-muted italic">Select your venue location above to continue.</p>
        )}
      </div>

      {eventCategory !== 'debut' && (
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
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CATERING_TIERS.map((tier) => {
          const selected = tierId === tier.id

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
                <p className="text-xs uppercase tracking-wide text-gold font-semibold mt-1 mb-3">
                  {tier.dishCount} Main Dishes
                </p>

                <ul className="flex flex-wrap gap-1.5">
                  {tier.mainDishes.map((dish) => (
                    <li
                      key={dish}
                      className="text-xs px-2 py-1 rounded-full bg-cream text-text-dark border border-gold/20"
                    >
                      {dish}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-text-muted mt-2">+ {CATERING_BUNDLED_DISHES.join(', ')}</p>
              </button>

              {tier.allowsBeefSwap && selected && (
                <label className="mt-4 pt-4 border-t border-gold/20 flex items-center gap-2 text-sm text-text-dark cursor-pointer">
                  <input
                    type="checkbox"
                    checked={beefSwap}
                    onChange={(e) => onBeefSwapChange(e.target.checked)}
                    className="rounded border-gold/40 text-wine focus:ring-2 focus:ring-wine/30"
                  />
                  Swap a dish to Beef
                </label>
              )}
            </motion.div>
          )
        })}
      </div>

      <div className="mt-6 rounded-xl border border-gold/25 bg-warm-white p-4">
        <p className="text-sm font-semibold text-text-dark mb-2">Included With Every Tier</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {CATERING_INCLUSIONS.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-text-dark">
              <Check className="w-3.5 h-3.5 text-wine mt-0.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <p className="text-xs text-text-muted italic mt-3">{CATERING_EXCLUSION_NOTE}</p>
      </div>
    </section>
  )
}
