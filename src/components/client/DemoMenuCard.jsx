import { UtensilsCrossed } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'

export default function DemoMenuCard({ packageName, pax, items }) {
  return (
    <Card title="Package & Menu">
      <Badge color="wine" className="mb-3">
        {packageName} Package — {pax} pax
      </Badge>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-text-dark">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-wine shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  )
}
