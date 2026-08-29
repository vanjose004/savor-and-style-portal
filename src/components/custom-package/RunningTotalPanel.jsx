import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { COORDINATION_FEE_LABEL } from '../../lib/customPackage'

export default function RunningTotalPanel({
  tier,
  pax,
  isWedding,
  beefSwap,
  supplierLabels,
  grandTotal,
  canRequest,
  onRequest,
}) {
  return (
    <div className="bg-wine text-warm-white rounded-2xl p-6 shadow-xl border border-gold/30">
      <h3 className="font-heading font-bold text-xl text-gold">Your Package</h3>

      <div className="mt-4 pb-4 border-b border-white/15">
        <p className="text-xs uppercase tracking-wide text-white/60">Catering</p>
        {tier ? (
          <>
            <p className="font-semibold mt-1">
              {tier.name} Package — {pax} pax
            </p>
            {isWedding && <p className="text-xs text-white/70">Wedding rate applied</p>}
            {beefSwap && <p className="text-xs text-white/70">Beef dish swap</p>}
          </>
        ) : (
          <p className="text-sm text-white/60 mt-1">Select a guest count and tier to get started.</p>
        )}
      </div>

      <div className="mt-4 pb-4 border-b border-white/15">
        <p className="text-xs uppercase tracking-wide text-white/60 mb-2">Add-Ons</p>
        {supplierLabels.length === 0 ? (
          <p className="text-sm text-white/50 italic">None selected yet</p>
        ) : (
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {supplierLabels.map((label) => (
                <motion.li
                  key={label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <Check className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
                  <span>{label}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between text-sm py-1">
        <span className="text-white/80">{COORDINATION_FEE_LABEL}</span>
        <span className="font-medium text-gold">Included</span>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gold/30">
        <span className="font-heading font-bold text-lg">Grand Total</span>
        <motion.span
          key={grandTotal}
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
          className="font-heading font-extrabold text-2xl text-gold"
        >
          {formatCurrency(grandTotal)}
        </motion.span>
      </div>

      <button
        type="button"
        disabled={!canRequest}
        onClick={onRequest}
        className="mt-5 w-full text-center font-semibold px-5 py-3 rounded-full bg-gold text-wine-dark transition-all hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gold"
      >
        Download My Package
      </button>
      {!canRequest && (
        <p className="text-xs text-white/50 mt-2 text-center">Select a catering package to continue</p>
      )}
    </div>
  )
}
