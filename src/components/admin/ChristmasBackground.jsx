import { TreePine } from 'lucide-react'

// Purely decorative — admin-only (rendered once inside AdminLayout, never
// imported by any client-facing page). Sits behind the actual page content
// as a fixed, low-opacity layer so it reads as festive texture rather than
// competing with real dashboard data.

// Reference the same custom properties AdminLayout's .admin-shell scopes
// in index.css (--color-wine/--color-gold/--color-success), rather than
// duplicating their hex values here — this is the only file where colors
// need to be JS values (inline gradients) instead of Tailwind classes.
const WINE = 'var(--color-wine)'
const GOLD = 'var(--color-gold)'
const HOLLY = 'var(--color-success)'

const ORNAMENTS = [
  { top: '8%', left: '6%', size: 22, color: WINE },
  { top: '18%', left: '92%', size: 16, color: GOLD },
  { top: '38%', left: '3%', size: 14, color: HOLLY },
  { top: '58%', left: '95%', size: 20, color: WINE },
  { top: '74%', left: '8%', size: 18, color: GOLD },
  { top: '90%', left: '90%', size: 15, color: HOLLY },
  { top: '30%', left: '50%', size: 12, color: GOLD },
  { top: '65%', left: '45%', size: 14, color: WINE },
]

const LIGHTS = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i / 13) * 100}%`,
  color: i % 3 === 0 ? WINE : i % 3 === 1 ? GOLD : HOLLY,
  delay: `${(i % 5) * 0.4}s`,
}))

function Ornament({ top, left, size, color }) {
  return (
    <div
      className="absolute rounded-full opacity-[0.08]"
      style={{
        top,
        left,
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${color} 85%, white), ${color} 60%, color-mix(in srgb, ${color} 70%, black))`,
      }}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-1 h-2 rounded-full"
        style={{ background: color }}
      />
    </div>
  )
}

export default function ChristmasBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* String of lights along the top */}
      <div className="absolute top-0 inset-x-0 flex justify-between px-6">
        {LIGHTS.map((light, i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full opacity-[0.12] mt-4 animate-pulse"
            style={{ backgroundColor: light.color, animationDelay: light.delay }}
          />
        ))}
      </div>

      {ORNAMENTS.map((o, i) => (
        <Ornament key={i} {...o} />
      ))}

      <TreePine
        className="absolute -bottom-6 -left-6 w-40 h-40 opacity-[0.05] text-success"
        strokeWidth={1}
      />
      <TreePine
        className="absolute -bottom-10 -right-10 w-56 h-56 opacity-[0.04] text-success"
        strokeWidth={1}
      />
    </div>
  )
}
