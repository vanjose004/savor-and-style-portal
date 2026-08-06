import Reveal from './Reveal'
import { SOFT_RESERVE_HOW_IT_WORKS_STEPS } from '../../lib/constants'

export default function HowItWorks() {
  return (
    <section className="bg-cream py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-wine">How It Works</h2>
          <p className="mt-3 text-text-muted text-lg">From soft reserve to your big day</p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {SOFT_RESERVE_HOW_IT_WORKS_STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.1} className="relative">
              <div className="h-full bg-warm-white rounded-2xl p-6 sm:p-7 border border-gold/30 text-center">
                <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-wine text-gold font-heading font-bold text-lg">
                  {index + 1}
                </div>
                <h3 className="mt-4 font-heading font-semibold text-lg text-wine">{step.title}</h3>
                <p className="mt-2 text-sm text-text-muted leading-relaxed">{step.description}</p>
              </div>
              {index < SOFT_RESERVE_HOW_IT_WORKS_STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-full w-6 h-0.5 bg-gold/40 -translate-x-1" />
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
