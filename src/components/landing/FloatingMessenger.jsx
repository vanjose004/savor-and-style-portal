import { MessageCircle } from 'lucide-react'
import { BUSINESS } from '../../lib/constants'

export default function FloatingMessenger() {
  return (
    <a
      href={BUSINESS.messengerUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Message us on Facebook Messenger"
      className="hidden md:flex fixed bottom-6 right-6 z-40 items-center justify-center w-14 h-14 rounded-full bg-gold text-wine-dark shadow-lg transition-all hover:bg-white hover:scale-105"
    >
      <MessageCircle size={26} />
    </a>
  )
}
