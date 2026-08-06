import { Armchair, Utensils, ConciergeBell, GlassWater } from 'lucide-react'
import Reveal from './Reveal'
import { BUSINESS, DEFAULT_INCLUSIONS } from '../../lib/constants'

const ICONS = [Armchair, Utensils, ConciergeBell, GlassWater]

export default function DefaultInclusions() {
  return (
    <section className="bg-wine py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <Reveal>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-white">
            Every Package Includes
          </h2>
          <p className="mt-3 text-cream/80 text-lg">No hidden charges — these come with every booking</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DEFAULT_INCLUSIONS.map((item, index) => {
            const Icon = ICONS[index]
            return (
              <Reveal key={item} delay={index * 0.1}>
                <div className="h-full bg-white/10 border border-gold/30 rounded-2xl p-6 sm:p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:bg-white/15">
                  <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-gold text-wine-dark">
                    <Icon size={30} />
                  </div>
                  <h3 className="mt-5 font-heading font-semibold text-lg text-white leading-snug">{item}</h3>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal className="mt-12" delay={0.2}>
          <a
            href={BUSINESS.messengerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gold text-wine-dark font-semibold px-8 py-3.5 rounded-full shadow-md transition-all hover:bg-white hover:scale-[1.02]"
          >
            Get a Quote
          </a>
        </Reveal>
      </div>
    </section>
  )
}
