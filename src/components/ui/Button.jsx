import { cn } from '../../lib/utils'

const VARIANTS = {
  primary: 'bg-wine text-warm-white hover:bg-wine-dark',
  secondary: 'bg-warm-white text-wine border border-gold/40 hover:bg-cream',
  outline: 'border border-wine text-wine bg-transparent hover:bg-wine hover:text-warm-white',
  success: 'bg-success text-warm-white hover:bg-success/90',
  danger: 'bg-danger text-warm-white hover:bg-danger/90',
  ghost: 'text-wine hover:bg-cream',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) {
  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
