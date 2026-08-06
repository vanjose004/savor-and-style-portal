import { Link } from 'react-router-dom'
import { Eye, FileDown, Wallet, Edit3 } from 'lucide-react'
import Reveal from './Reveal'
import { CLIENT_PORTAL_FEATURES } from '../../lib/constants'

const ICONS = [Eye, FileDown, Wallet, Edit3]

export default function ClientPortalHighlight() {
  return (
    <section className="bg-wine py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <Reveal>
          <p className="font-semibold text-gold uppercase tracking-wide text-sm">Client Portal</p>
          <h2 className="mt-3 font-heading font-bold text-3xl sm:text-4xl text-white">
            Ang unang at tanging catering sa Bulacan na may Client Portal
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CLIENT_PORTAL_FEATURES.map((feature, index) => {
            const Icon = ICONS[index]
            return (
              <Reveal key={feature} delay={index * 0.1}>
                <div className="h-full bg-white/10 border border-gold/30 rounded-2xl p-6 sm:p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:bg-white/15">
                  <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-gold text-wine-dark">
                    <Icon size={30} />
                  </div>
                  <h3 className="mt-5 font-heading font-semibold text-lg text-white leading-snug">
                    {feature}
                  </h3>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal className="mt-12" delay={0.2}>
          <Link
            to="/"
            className="inline-block bg-gold text-wine-dark font-semibold px-8 py-3.5 rounded-full shadow-md transition-all hover:bg-white hover:scale-[1.02]"
          >
            Explore the Client Portal
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
