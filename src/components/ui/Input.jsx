import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Input = forwardRef(function Input({ label, error, className, ...props }, ref) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-text-dark">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'rounded-lg border border-gold/30 bg-warm-white px-3 py-2 text-sm text-text-dark placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-wine/30 focus:border-wine',
          error && 'border-danger focus:ring-danger/30',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
})

export default Input
