import { UtensilsCrossed } from 'lucide-react'
import Reveal from './Reveal'
import { FOOD_TASTING_FEE_NON_RESERVED, peso } from '../../lib/constants'
import { useSoftReserve } from '../../hooks/useSoftReserve'

export default function FoodTasting() {
  const { openSoftReserve } = useSoftReserve()

  return (
    <section className="bg-warm-white py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <Reveal>
          <div className="bg-cream border border-gold/30 rounded-2xl p-8 sm:p-10 text-center">
            <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-wine text-gold">
              <UtensilsCrossed size={30} />
            </div>
            <h2 className="mt-5 font-heading font-bold text-3xl sm:text-4xl text-wine">
              Free Food Tasting
            </h2>
            <p className="mt-4 text-lg text-text-dark max-w-xl mx-auto leading-relaxed">
              Taste before you commit — food tasting is{' '}
              <span className="font-semibold text-wine">FREE for clients who've made a Soft Reserve</span>, or{' '}
              <span className="font-semibold text-wine">{peso(FOOD_TASTING_FEE_NON_RESERVED)}</span> for
              non-reserved guests.
            </p>
            <button
              type="button"
              onClick={() => openSoftReserve()}
              className="mt-8 inline-block bg-wine text-white font-semibold px-8 py-3.5 rounded-full shadow-md transition-all hover:bg-wine-dark hover:scale-[1.02]"
            >
              Soft Reserve for Free Tasting
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
