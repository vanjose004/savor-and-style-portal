import { Check } from 'lucide-react'
import Card from '../ui/Card'
import { DEFAULT_INCLUSIONS } from '../../lib/constants'

export default function DefaultInclusionsCard() {
  return (
    <Card title="What's Included">
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-text-dark">
        {DEFAULT_INCLUSIONS.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <Check className="w-4 h-4 text-success shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  )
}
