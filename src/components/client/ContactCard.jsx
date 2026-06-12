import { Phone, Globe } from 'lucide-react'
import Card from '../ui/Card'
import { BUSINESS } from '../../lib/constants'

export default function ContactCard() {
  return (
    <Card title="Contact Us">
      <div className="space-y-2 text-sm">
        <p className="flex items-center gap-2 text-text-dark">
          <Phone className="w-4 h-4 text-wine" />
          {BUSINESS.phone}
        </p>
        <p className="flex items-center gap-2 text-text-dark">
          <Globe className="w-4 h-4 text-wine" />
          {BUSINESS.facebook}
        </p>
      </div>
    </Card>
  )
}
