import { cn } from '../../lib/utils'

const COLORS = {
  default: 'bg-cream text-text-muted',
  wine: 'bg-wine/10 text-wine',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  gold: 'bg-gold/15 text-gold',
  blue: 'bg-blue-500/10 text-blue-700',
  orange: 'bg-orange-500/10 text-orange-700',
  yellow: 'bg-yellow-400/15 text-yellow-700',
}

export default function Badge({ color = 'default', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap',
        COLORS[color],
        className
      )}
    >
      {children}
    </span>
  )
}
