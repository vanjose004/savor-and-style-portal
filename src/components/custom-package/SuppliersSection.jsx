import { Minus, Plus } from 'lucide-react'
import { cn, formatCurrency } from '../../lib/utils'
import { SUPPLIERS, ESSENTIAL_SUPPLIERS_NOTE } from '../../lib/customPackage'

function EssentialBadge() {
  return (
    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide bg-gold text-wine-dark px-2 py-0.5 rounded-full">
      Essential
    </span>
  )
}

function SupplierShell({ label, essential, priceLabel, description, children }) {
  return (
    <div className="rounded-xl border border-gold/25 bg-warm-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-text-dark">
              {label}
              {priceLabel ? ` — ${priceLabel}` : ''}
            </p>
            {essential && <EssentialBadge />}
          </div>
          {description && <p className="text-xs text-text-muted mt-1">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}

function ToggleButton({ active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all',
        active
          ? 'bg-wine text-warm-white border-wine'
          : 'bg-cream text-text-dark border-gold/30 hover:border-wine/50'
      )}
    >
      {active ? 'Remove' : 'Add'}
    </button>
  )
}

function QuantityStepper({ qty, onChange, min = 0, label = 'Remove one', addLabel = 'Add one' }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, qty - 1))}
        disabled={qty <= min}
        className="w-7 h-7 rounded-full border border-gold/30 flex items-center justify-center text-wine disabled:opacity-40 hover:border-wine/50"
        aria-label={label}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="w-8 text-center font-semibold text-text-dark">{qty}</span>
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        className="w-7 h-7 rounded-full border border-gold/30 flex items-center justify-center text-wine hover:border-wine/50"
        aria-label={addLabel}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function SuppliersSection({
  pax,
  selections,
  onToggle,
  onChoose,
  onHmuaToggle,
  onHmuaHeadsChange,
  onQtyToggle,
  onQtyChange,
}) {
  const essentialSuppliers = SUPPLIERS.filter((s) => s.essential)
  const otherSuppliers = SUPPLIERS.filter((s) => !s.essential)

  function renderSupplier(supplier) {
    if (supplier.type === 'toggle') {
      return (
        <SupplierShell
          key={supplier.id}
          label={supplier.label}
          essential={supplier.essential}
          description={supplier.description}
          priceLabel={supplier.showPrice ? formatCurrency(supplier.price) : null}
        >
          <ToggleButton active={selections[supplier.id]} onClick={() => onToggle(supplier.id)} />
        </SupplierShell>
      )
    }

    if (supplier.type === 'choice') {
      const selected = selections[supplier.id]
      const selectedOption = supplier.options.find((o) => o.id === selected)
      return (
        <div key={supplier.id} className="rounded-xl border border-gold/25 bg-warm-white p-4">
          <p className="font-semibold text-text-dark mb-3">{supplier.label}</p>
          <div className="flex flex-wrap gap-2">
            {supplier.options.map((option) => {
              const active = selected === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChoose(supplier.id, active ? null : option.id)}
                  aria-pressed={active}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all',
                    active
                      ? 'bg-wine text-warm-white border-wine'
                      : 'bg-cream text-text-dark border-gold/30 hover:border-wine/50'
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
          {selectedOption?.description && (
            <p className="text-xs text-text-muted mt-2.5">{selectedOption.description}</p>
          )}
        </div>
      )
    }

    if (supplier.type === 'hmua') {
      const selection = selections[supplier.id]
      return (
        <div key={supplier.id} className="rounded-xl border border-gold/25 bg-warm-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-text-dark">{supplier.label}</p>
              {supplier.description && <p className="text-xs text-text-muted mt-1">{supplier.description}</p>}
            </div>
            <ToggleButton active={selection.enabled} onClick={() => onHmuaToggle(supplier.id)} />
          </div>

          {selection.enabled && (
            <div className="mt-3 pt-3 border-t border-gold/20 flex items-center justify-between">
              <span className="text-sm text-text-dark">Extra Heads</span>
              <QuantityStepper
                qty={selection.extraHeads}
                onChange={(next) => onHmuaHeadsChange(supplier.id, next)}
                label="Remove an extra head"
                addLabel="Add an extra head"
              />
            </div>
          )}
        </div>
      )
    }

    if (supplier.type === 'quantity') {
      const selection = selections[supplier.id]
      return (
        <div key={supplier.id} className="rounded-xl border border-gold/25 bg-warm-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-text-dark">{supplier.label}</p>
              {supplier.description && <p className="text-xs text-text-muted mt-1">{supplier.description}</p>}
            </div>
            <ToggleButton active={selection.enabled} onClick={() => onQtyToggle(supplier.id, pax)} />
          </div>

          {selection.enabled && (
            <div className="mt-3 pt-3 border-t border-gold/20 flex items-center justify-between">
              <span className="text-sm text-text-dark">Quantity ({supplier.unitLabel}s)</span>
              <QuantityStepper
                qty={selection.qty}
                onChange={(next) => onQtyChange(supplier.id, next)}
                label={`Remove one ${supplier.unitLabel}`}
                addLabel={`Add one ${supplier.unitLabel}`}
              />
            </div>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <section>
      <h2 className="font-heading font-bold text-2xl text-wine">3. Optional Suppliers</h2>
      <p className="text-sm text-text-muted mt-1">Mix and match — add anything you'd like included.</p>

      <div className="mt-6 space-y-3">
        {essentialSuppliers.map(renderSupplier)}

        <p className="text-sm text-wine bg-gold/10 border border-gold/30 rounded-lg px-4 py-2.5">
          {ESSENTIAL_SUPPLIERS_NOTE}
        </p>

        {otherSuppliers.map(renderSupplier)}
      </div>
    </section>
  )
}
