import { Check } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { BUSINESS } from '../../lib/constants'
import { CATERING_BUNDLED_DISHES, CATERING_INCLUSIONS, COORDINATION_FEE_LABEL } from '../../lib/customPackage'
import Logo from '../ui/Logo'

// Mobile browsers can't render a PDF blob inside an <iframe> (see
// PackagePreviewModal), so this renders the same content as plain HTML —
// same sections, same "no individual prices except Ceiling Treatment" rule
// — as a substitute preview. Still built from the same `summary` data the
// PDF is built from, just laid out with JSX instead of jsPDF calls.
export default function MobilePackagePreview({ summary }) {
  const eventTypeLabel = summary.isWedding ? 'Wedding' : 'Birthday / Gathering'
  const dishList = summary.tier ? [...summary.tier.mainDishes, ...CATERING_BUNDLED_DISHES] : []

  return (
    <div className="bg-warm-white">
      <div className="bg-wine text-warm-white p-5">
        <div className="flex items-center gap-2.5">
          <Logo className="h-9 w-9" />
          <div>
            <p className="font-heading font-bold text-base leading-tight">{BUSINESS.name}</p>
            <p className="text-xs text-white/70">{BUSINESS.address}</p>
          </div>
        </div>
        <p className="font-heading font-bold text-lg text-gold mt-3">{eventTypeLabel} Package Summary</p>
        <p className="text-xs text-white/70">Make Your Own Package</p>
      </div>

      <div className="p-5 space-y-5">
        <div className="bg-cream rounded-xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-wine mb-1.5">Event Details</p>
          <p className="font-bold text-text-dark">{eventTypeLabel}</p>
          <p className="text-xs text-text-muted mt-1">{summary.venueZone?.label ?? '—'}</p>
          <p className="text-xs text-text-muted">{summary.transportLabel}</p>
        </div>

        <div>
          <p className="text-sm font-bold text-wine mb-1.5">Catering Package</p>
          {summary.tier ? (
            <>
              <p className="text-sm text-text-dark">
                {summary.tier.name} Package — {summary.pax} pax
              </p>
              <p className="text-xs text-text-muted mt-1">Dishes: {dishList.join(', ')}</p>
              {summary.isWedding && <p className="text-xs text-text-muted mt-1">• Wedding Rate Applied</p>}
              {summary.beefSwap && <p className="text-xs text-text-muted">• Beef Dish Swap Included</p>}

              <p className="text-xs font-semibold text-wine mt-3 mb-1">Included With Every Tier:</p>
              <ul className="space-y-1">
                {CATERING_INCLUSIONS.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-xs text-text-dark">
                    <Check className="w-3 h-3 text-wine mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-text-muted">No catering package selected</p>
          )}
        </div>

        <div>
          <p className="text-sm font-bold text-wine mb-1.5">Selected Add-Ons</p>
          {summary.supplierItems.length === 0 ? (
            <p className="text-sm text-text-muted">No add-ons selected.</p>
          ) : (
            <ul className="space-y-2.5">
              {summary.supplierItems.map((item) => (
                <li key={item.id}>
                  <p className="text-sm font-semibold text-text-dark">• {item.label}</p>
                  {item.description && <p className="text-xs text-text-muted ml-3 mt-0.5">{item.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between text-sm border-t border-gold/20 pt-4">
          <span className="text-wine font-semibold">{COORDINATION_FEE_LABEL}</span>
          <span className="text-success font-semibold">Included</span>
        </div>

        <div className="bg-wine rounded-xl p-4 flex items-center justify-between">
          <span className="font-heading font-bold text-warm-white">Grand Total</span>
          <span className="font-heading font-extrabold text-2xl text-gold">{formatCurrency(summary.grandTotal)}</span>
        </div>

        <div className="border-t border-gold/20 pt-4 text-center">
          <p className="text-xs font-semibold text-wine">
            To confirm this package, send this to us on Facebook Messenger (with your name and event date) or
            call/text: {BUSINESS.phone}
          </p>
          <p className="text-xs text-text-muted mt-2">
            {BUSINESS.name} • {BUSINESS.facebookUrl}
          </p>
        </div>
      </div>
    </div>
  )
}
