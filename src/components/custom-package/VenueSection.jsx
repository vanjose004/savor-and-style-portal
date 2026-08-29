import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import { VENUE_ZONES } from '../../lib/customPackage'

export default function VenueSection({ venueId, onVenueChange }) {
  return (
    <section>
      <h2 className="font-heading font-bold text-2xl text-wine">1. Venue Location</h2>
      <p className="text-sm text-text-muted mt-1">Required — where's your event? Transport is worked into your quote automatically.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {VENUE_ZONES.map((zone) => {
          const selected = venueId === zone.id
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => onVenueChange(zone.id)}
              className={cn(
                'text-left rounded-2xl border-2 p-5 transition-colors',
                selected ? 'border-wine bg-wine/5 shadow-md' : 'border-gold/25 bg-warm-white hover:border-wine/40'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-heading font-bold text-lg text-wine">{zone.label}</p>
                {selected && (
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-wine text-warm-white shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              {zone.description && <p className="text-xs text-text-muted mt-1">{zone.description}</p>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
