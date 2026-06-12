import { useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { cn } from '../../lib/utils'
import { BUSINESS } from '../../lib/constants'

/**
 * Renders /logo.png, falling back to a generic icon if the file isn't
 * present yet. `className` controls size and (for the fallback icon) color.
 */
export default function Logo({ className }) {
  const [error, setError] = useState(false)

  if (error) {
    return <UtensilsCrossed className={cn(className)} />
  }

  return (
    <img
      src="/logo.png"
      alt={BUSINESS.name}
      className={cn('object-contain', className)}
      onError={() => setError(true)}
    />
  )
}
