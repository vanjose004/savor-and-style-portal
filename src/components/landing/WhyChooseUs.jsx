import { ChefHat, HeartHandshake, ClipboardCheck, Smartphone } from 'lucide-react'
import Reveal from './Reveal'

const FEATURES = [
  {
    icon: ChefHat,
    title: 'Masarap na Pagkain',
    description:
      'Fresh ingredients, authentic Filipino flavors, and dishes your guests will keep talking about.',
  },
  {
    icon: HeartHandshake,
    title: 'Friendly & Professional Staff',
    description: 'Our team goes above and beyond to make sure every guest feels taken care of.',
  },
  {
    icon: ClipboardCheck,
    title: 'Complete Setup',
    description:
      'From tables and chairs to flatware — we handle everything so you can enjoy your event.',
  },
  {
    icon: Smartphone,
    title: 'Online Client Portal',
    description: 'Track your booking, menu, and payments anytime through our exclusive client portal.',
  },
]

export default function WhyChooseUs() {
  return (
    <section className="bg-warm-white py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-wine">
            Why Families &amp; Companies Trust Us
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Reveal key={feature.title} delay={index * 0.1}>
                <div className="h-full bg-cream rounded-2xl p-6 sm:p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-wine text-gold">
                    <Icon size={30} />
                  </div>
                  <h3 className="mt-5 font-heading font-semibold text-xl text-wine">{feature.title}</h3>
                  <p className="mt-3 text-text-muted leading-relaxed">{feature.description}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
