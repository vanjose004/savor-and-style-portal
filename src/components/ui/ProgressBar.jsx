import { cn } from '../../lib/utils'

const BAR_COLORS = {
  wine: 'bg-wine',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

/** Generic percent-fill progress bar (color-customizable, unlike PaymentProgressBar). */
export default function ProgressBar({ percent = 0, color = 'wine', className }) {
  const clamped = Math.min(Math.max(percent, 0), 100)

  return (
    <div className={cn('w-full h-2 rounded-full bg-cream overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-all', BAR_COLORS[color])} style={{ width: `${clamped}%` }} />
    </div>
  )
}
