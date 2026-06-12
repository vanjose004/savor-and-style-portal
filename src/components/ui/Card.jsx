import { cn } from '../../lib/utils'

export default function Card({ title, actions, className, children, ...props }) {
  return (
    <div
      className={cn('bg-warm-white rounded-xl border border-gold/20 shadow-sm p-6', className)}
      {...props}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 mb-4">
          {title && <h3 className="text-lg font-semibold text-wine">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}
