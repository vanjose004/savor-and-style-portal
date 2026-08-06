import { Cake, Heart, Sparkles, PartyPopper, Church, Home, Briefcase, Plus } from 'lucide-react'
import Reveal from './Reveal'
import { BUSINESS } from '../../lib/constants'

const EVENT_TYPES = [
  {
    icon: Cake,
    title: 'Adult Birthday',
    description: "Celebrate another year in style with a feast your guests won't forget.",
  },
  {
    icon: Heart,
    title: 'Wedding',
    description: 'From intimate ceremonies to grand receptions, we make your big day delicious.',
  },
  {
    icon: Sparkles,
    title: 'Debut',
    description: 'Mark the 18th milestone with elegant dishes fit for the celebration.',
  },
  {
    icon: PartyPopper,
    title: 'Kiddie Party',
    description: 'Fun, colorful spreads that kids and parents will love.',
  },
  {
    icon: Church,
    title: 'Christening / Dedication',
    description: 'A meaningful gathering deserves a thoughtfully prepared menu.',
  },
  {
    icon: Home,
    title: 'House Blessing',
    description: 'Welcome guests into your new home with a warm, hearty feast.',
  },
  {
    icon: Briefcase,
    title: 'Corporate Events',
    description: 'Professional service and great food for meetings, seminars, and parties.',
  },
  {
    icon: Plus,
    title: 'And More',
    description: "Reunions, anniversaries, fiestas — whatever the occasion, we've got you covered.",
  },
]

export default function EventTypes() {
  return (
    <section id="events" className="bg-cream py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-wine">
            Every Occasion, Perfectly Served
          </h2>
          <p className="mt-3 text-text-muted text-lg">
            From intimate family gatherings to grand corporate events
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {EVENT_TYPES.map((event, index) => {
            const Icon = event.icon
            return (
              <Reveal key={event.title} delay={(index % 4) * 0.08}>
                <div className="h-full bg-warm-white rounded-2xl p-6 text-center border border-gold/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-wine/10 text-wine">
                    <Icon size={26} />
                  </div>
                  <h3 className="mt-4 font-heading font-semibold text-lg text-wine">{event.title}</h3>
                  <p className="mt-2 text-sm text-text-muted leading-relaxed">{event.description}</p>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal className="mt-14 text-center" delay={0.2}>
          <p className="text-lg text-text-dark font-medium mb-4">Planning an event? Let's talk!</p>
          <a
            href={BUSINESS.messengerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-wine text-white font-semibold px-8 py-3.5 rounded-full shadow-md transition-all hover:bg-wine-dark hover:scale-[1.02]"
          >
            Message Us on Facebook
          </a>
        </Reveal>
      </div>
    </section>
  )
}
