import { cn } from '../../lib/utils'

const COLORS = {
  default: 'bg-cream text-text-muted',
  wine: 'bg-wine/10 text-wine',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  gold: 'bg-gold/15 text-gold',
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
