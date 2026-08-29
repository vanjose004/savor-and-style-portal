import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { SOFT_RESERVE_CTA_LABEL } from '../../lib/constants'
import { useSoftReserve } from '../../hooks/useSoftReserve'
import Logo from '../ui/Logo'

// `href` starting with "#" scrolls to an in-page section; anything else is
// a real route, rendered as a <Link> instead (Gallery now has its own
// standalone page with albums + lightbox, richer than the in-page preview).
const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Events', href: '#events' },
  { label: 'Packages', href: '#packages' },
  { label: 'Build Your Own', href: '/wedding-quote' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Contact', href: '#contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { openSoftReserve } = useSoftReserve()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`relative transition-all duration-300 ${
        scrolled ? 'bg-wine shadow-lg' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16 md:h-20">
        <a href="#home" className="flex items-center gap-2 sm:gap-3">
          <Logo className="h-9 w-9 sm:h-11 sm:w-11" />
          <span className="font-heading font-bold text-lg sm:text-xl text-white tracking-wide">
            Savor and Style
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) =>
            link.href.startsWith('#') ? (
              <a
                key={link.href}
                href={link.href}
                className="text-white/90 hover:text-gold transition-colors font-medium"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                to={link.href}
                className="text-white/90 hover:text-gold transition-colors font-medium"
              >
                {link.label}
              </Link>
            )
          )}
        </div>

        <div className="hidden md:block">
          <button
            type="button"
            onClick={() => openSoftReserve()}
            className="inline-block bg-gold text-wine-dark font-semibold px-5 py-2.5 rounded-full transition-all hover:bg-gold/90 hover:scale-[1.02]"
          >
            {SOFT_RESERVE_CTA_LABEL}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="md:hidden text-white p-2"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="md:hidden bg-wine overflow-hidden"
          >
            <div className="flex flex-col px-6 pb-6 pt-2 gap-4">
              {NAV_LINKS.map((link) =>
                link.href.startsWith('#') ? (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-white/90 hover:text-gold transition-colors font-medium py-1"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-white/90 hover:text-gold transition-colors font-medium py-1"
                  >
                    {link.label}
                  </Link>
                )
              )}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  openSoftReserve()
                }}
                className="inline-block text-center bg-gold text-wine-dark font-semibold px-5 py-2.5 rounded-full transition-colors hover:bg-gold/90"
              >
                {SOFT_RESERVE_CTA_LABEL}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
