import { cn } from '../../lib/utils'

// Admin-only (never rendered on client-facing pages) — the top accent bar
// below is safe to bake in directly instead of opting in per call site.
export default function StatCard({ icon: Icon, label, value, className }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-warm-white rounded-xl border border-gold/20 shadow-sm p-5 flex items-center gap-4',
        "before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gold",
        className
      )}
    >
      {Icon && (
        <div className="w-11 h-11 rounded-lg bg-wine/10 text-wine flex items-center justify-center shrink-0">
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
