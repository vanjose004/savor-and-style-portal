import { cn } from '../../lib/utils'

const CARD_COLORS = {
  wine: 'border-wine/20 bg-wine/5',
  success: 'border-success/30 bg-success/5',
  danger: 'border-danger/30 bg-danger/5',
  warning: 'border-warning/30 bg-warning/5',
}

const ICON_COLORS = {
  wine: 'bg-wine/10 text-wine',
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/10 text-danger',
  warning: 'bg-warning/10 text-warning',
}

/** Color-coded summary card for dashboards (green = income/profit, red = expenses/utang). */
export default function SummaryCard({ icon: Icon, label, value, color = 'wine', className }) {
  return (
    <div className={cn('rounded-xl border shadow-sm p-5 flex items-center gap-4', CARD_COLORS[color], className)}>
      {Icon && (
        <div className={cn('w-11 h-11 rounded-lg flex items-center justify-center shrink-0', ICON_COLORS[color])}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide truncate">{label}</p>
        <p className="text-xl font-bold text-text-dark mt-0.5 truncate">{value}</p>
      </div>
    </div>
  )
}
