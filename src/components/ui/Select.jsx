import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Select = forwardRef(function Select(
  { label, error, options = [], placeholder, className, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-text-dark">{label}</label>}
      <select
        ref={ref}
        className={cn(
          'rounded-lg border border-gold/30 bg-warm-white px-3 py-2 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-wine/30 focus:border-wine',
          error && 'border-danger focus:ring-danger/30',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          const value = typeof opt === 'string' ? opt : opt.value
          const label = typeof opt === 'string' ? opt : opt.label
          return (
            <option key={value} value={value}>
              {label}
            </option>
          )
        })}
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
})

export default Select
