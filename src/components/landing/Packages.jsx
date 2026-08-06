import { Check } from 'lucide-react'
import Reveal from './Reveal'
import { SOFT_RESERVE_PACKAGES } from '../../lib/constants'
import { useSoftReserve } from '../../hooks/useSoftReserve'

export default function Packages() {
  const { openSoftReserve } = useSoftReserve()

  return (
    <section id="packages" className="bg-warm-white py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-wine">
            Choose Your Package
          </h2>
          <p className="mt-3 text-text-muted text-lg">
            Every package is customizable — message us to fine-tune the menu
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SOFT_RESERVE_PACKAGES.map((pkg, index) => (
            <Reveal key={pkg.name} delay={index * 0.1}>
              <div
                className={`h-full flex flex-col rounded-2xl p-6 sm:p-7 border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  pkg.highlight ? 'bg-wine text-white border-gold shadow-lg' : 'bg-cream border-gold/30'
                }`}
              >
                {pkg.highlight && (
                  <span className="self-start mb-3 text-xs font-semibold uppercase tracking-wide bg-gold text-wine-dark px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className={`font-heading font-bold text-2xl ${pkg.highlight ? 'text-white' : 'text-wine'}`}>
                  {pkg.name}
                </h3>
                <p className={`mt-2 font-heading font-bold text-3xl ${pkg.highlight ? 'text-gold' : 'text-wine'}`}>
                  {pkg.price}
                </p>
                <p className={`text-sm ${pkg.highlight ? 'text-cream/80' : 'text-text-muted'}`}>{pkg.guests}</p>

                <ul className="mt-5 space-y-2.5 flex-grow">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check size={16} className={`mt-0.5 flex-shrink-0 ${pkg.highlight ? 'text-gold' : 'text-wine'}`} />
                      <span className={pkg.highlight ? 'text-white/90' : 'text-text-dark'}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => openSoftReserve(pkg.name)}
                  className={`mt-6 w-full text-center font-semibold px-5 py-3 rounded-full transition-all hover:scale-[1.02] ${
                    pkg.highlight ? 'bg-gold text-wine-dark hover:bg-white' : 'bg-wine text-white hover:bg-wine-dark'
                  }`}
                >
                  Soft Reserve This Package
                </button>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="mt-8 text-center text-sm text-text-muted italic">
            Sample pricing shown — message us to confirm the latest rates for your event.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
