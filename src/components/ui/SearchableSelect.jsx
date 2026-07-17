import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

/**
 * A text input that filters a `{ id, name }` list client-side as you
 * type, for pickers where scrolling a long native <select> is worse than
 * typing a few letters (e.g. a staff roster on a phone).
 */
export default function SearchableSelect({ label, options, value, onChange, placeholder = 'I-type para maghanap…', error }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  const selected = options.find((o) => o.id === value)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = query.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  return (
    <div className="flex flex-col gap-1 relative" ref={containerRef}>
      {label && <label className="text-sm font-medium text-text-dark">{label}</label>}
      <input
        type="text"
        className={cn(
          'rounded-lg border border-gold/30 bg-warm-white px-3 py-2 text-sm text-text-dark placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-wine/30 focus:border-wine',
          error && 'border-danger focus:ring-danger/30'
        )}
        placeholder={placeholder}
        value={open ? query : (selected?.name ?? '')}
        onFocus={() => {
          setOpen(true)
          setQuery('')
        }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-56 overflow-y-auto bg-warm-white rounded-lg border border-gold/20 shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-text-muted">Walang nahanap.</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(o.id)
                  setOpen(false)
                  setQuery('')
                }}
                className="w-full text-left px-3 py-2 text-sm text-text-dark hover:bg-cream/60 transition-colors"
              >
                {o.name}
              </button>
            ))
          )}
        </div>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
