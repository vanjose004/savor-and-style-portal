import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { SOFT_RESERVE_CTA_LABEL, BUSINESS } from '../../lib/constants'
import { useSoftReserve } from '../../hooks/useSoftReserve'

export default function Hero() {
  const { openSoftReserve } = useSoftReserve()

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="/hero.jpg"
          alt="Savor and Style catering setup"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-wine-dark/80 via-wine/60 to-wine-dark/90" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-32 sm:pt-28 pb-16">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="font-heading font-extrabold text-white text-5xl sm:text-6xl md:text-7xl leading-tight drop-shadow-lg"
        >
          We Serve, You Enjoy
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
          className="mt-5 text-xl sm:text-2xl md:text-3xl text-cream font-heading"
        >
          Premium Catering Services for Every Occasion
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="mt-3 text-base sm:text-lg text-white/80"
        >
          Serving Metro Manila, Bulacan &amp; Nearby Provinces
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45, ease: 'easeOut' }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            type="button"
            onClick={() => openSoftReserve()}
            className="w-full sm:w-auto inline-block bg-wine text-white font-semibold px-8 py-4 rounded-full shadow-lg transition-all hover:bg-wine-dark hover:scale-[1.02]"
          >
            {SOFT_RESERVE_CTA_LABEL}
          </button>
          <a
            href={BUSINESS.messengerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-block border-2 border-white text-white font-semibold px-8 py-4 rounded-full transition-all hover:bg-white hover:text-wine-dark hover:scale-[1.02]"
          >
            Message Us
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/80"
      >
        <ChevronDown size={32} />
      </motion.div>
    </section>
  )
}
