import { Gift } from 'lucide-react'
import Card from '../ui/Card'

export default function FreebiesCard({ freebies }) {
  if (!freebies || freebies.length === 0) return null

  return (
    <Card title="Freebies">
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-text-dark">
        {freebies.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-wine shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  )
}
