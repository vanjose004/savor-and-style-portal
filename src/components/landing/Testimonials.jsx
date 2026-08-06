import { Star, Quote } from 'lucide-react'
import Reveal from './Reveal'

const TESTIMONIALS = [
  {
    quote:
      'Ang sisipag at ang babait ng mga waiters mo grabe! Pati mga in-laws ko nung nanghingi ako ng feedback sa kanila, nasarapan sa food nyo. Until our next event!',
    name: 'Nestle',
    event: 'Family Event',
  },
  {
    quote:
      'Legit po talaga kau. Sobrang ganda ng set up ng stage ng anak ko and very friendly ang mga staff nyo po. Lahat ng guests ansabi ang sarap ng food. Thank u po sa uulitin!',
    name: 'April',
    event: 'Kids Event',
  },
  {
    quote:
      'Nakakatuwa kasi lahat sila ang feedback sa food masarap lahat pati dessert. Yung set up sa venue maayos, sobrang mag-accommodate ang crew sa mga guest requests. OVERALL GOOD JOB!',
    name: 'Rio',
    event: 'Special Event',
  },
]

export default function Testimonials() {
  return (
    <section id="testimonials" className="bg-warm-white py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-wine">What Our Clients Say</h2>
          <p className="mt-3 text-text-muted text-lg">Real feedback from real events</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, index) => (
            <Reveal key={t.name} delay={index * 0.1}>
              <div className="h-full bg-cream border border-wine/15 border-t-4 border-t-wine rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col">
                <Quote className="text-gold" size={28} />
                <div className="flex gap-1 mt-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={18} className="fill-gold text-gold" />
                  ))}
                </div>
                <p className="mt-4 text-text-dark leading-relaxed flex-grow">"{t.quote}"</p>
                <p className="mt-5 font-heading font-semibold text-wine">
                  — {t.name}, <span className="text-text-muted font-normal">{t.event}</span>
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
