import { Link } from 'react-router-dom'
import { UtensilsCrossed, Drumstick, Soup, CakeSlice } from 'lucide-react'
import Reveal from './Reveal'

const MENU_CATEGORIES = [
  {
    icon: UtensilsCrossed,
    title: 'Pork Dishes',
    items: ['Lechon Kawali', 'Crispy Pork Kare-Kare', 'Pork Hamonado'],
  },
  {
    icon: Drumstick,
    title: 'Chicken Dishes',
    items: ['Chicken Alexander', 'Chinese Style Roasted Chicken', 'Hickory Chicken'],
  },
  {
    icon: Soup,
    title: 'Pasta',
    items: ['Carbonara', 'Charlie Chan Pasta', 'Pesto Pasta'],
  },
  {
    icon: CakeSlice,
    title: 'Desserts',
    items: ['Panna Cotta', 'Buko Pandan', 'Mango Tapioca'],
  },
]

export default function MenuHighlights() {
  return (
    <section className="bg-warm-white py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-wine">
            A Taste of What We Offer
          </h2>
          <p className="mt-3 text-text-muted text-lg">
            Our menu is fully customizable to your taste and budget
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {MENU_CATEGORIES.map((category, index) => {
            const Icon = category.icon
            return (
              <Reveal key={category.title} delay={index * 0.1}>
                <div className="h-full bg-cream rounded-2xl p-6 sm:p-7 border border-gold/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-wine text-gold mb-4">
                    <Icon size={26} />
                  </div>
                  <h3 className="font-heading font-semibold text-xl text-wine">{category.title}</h3>
                  <ul className="mt-4 space-y-2">
                    {category.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-text-dark before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-gold before:flex-shrink-0"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal className="mt-12 text-center" delay={0.2}>
          <Link
            to="/book"
            className="inline-block bg-wine text-white font-semibold px-8 py-3.5 rounded-full shadow-md transition-all hover:bg-wine-dark hover:scale-[1.02]"
          >
            Book Your Event
          </Link>
          <p className="mt-4 text-sm text-text-muted italic">
            All packages are customizable. Message us for pricing!
          </p>
        </Reveal>
      </div>
    </section>
  )
}
