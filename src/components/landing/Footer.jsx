import { Link } from 'react-router-dom'
import { MapPin, Phone } from 'lucide-react'
import { BUSINESS } from '../../lib/constants'
import Logo from '../ui/Logo'

function FacebookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.13 8.44 9.94v-7.03H7.9v-2.91h2.54V9.91c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.78-.81 8.44-4.94 8.44-9.94Z" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer id="contact" className="bg-wine-dark text-cream/90 pt-16 pb-28 md:pb-10 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-3">
            <Logo className="h-12 w-12" />
            <span className="font-heading font-bold text-xl text-white">Savor and Style</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed">
            Savor and Style Catering Services
            <br />
            Formerly: Estrella's Catering Services
          </p>
          <p className="mt-3 text-sm italic text-gold">"We Serve, You Enjoy"</p>
        </div>

        <div>
          <h3 className="font-heading font-semibold text-lg text-white mb-4">Contact Us</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <MapPin size={18} className="text-gold flex-shrink-0 mt-0.5" />
              <span>{BUSINESS.address}</span>
            </li>
            <li className="flex items-start gap-3">
              <Phone size={18} className="text-gold flex-shrink-0 mt-0.5" />
              <a href={BUSINESS.phoneTel} className="hover:text-gold transition-colors">
                {BUSINESS.phone}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <FacebookIcon className="w-[18px] h-[18px] text-gold flex-shrink-0 mt-0.5" />
              <a
                href={BUSINESS.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gold transition-colors"
              >
                {BUSINESS.facebook}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-heading font-semibold text-lg text-white mb-4">Service Area</h3>
          <p className="text-sm leading-relaxed">Metro Manila &amp; Nearby Provinces</p>

          <h3 className="font-heading font-semibold text-lg text-white mt-6 mb-4">Client Portal</h3>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/book" className="hover:text-gold transition-colors">
              Book Your Event
            </Link>
            <Link to="/" className="hover:text-gold transition-colors">
              Client Portal Login
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-gold/20 text-center text-xs text-cream/60">
        <p>© 2026 Savor and Style Catering Services. All Rights Reserved.</p>
        <p className="mt-1">{BUSINESS.legalName}</p>
      </div>
    </footer>
  )
}
