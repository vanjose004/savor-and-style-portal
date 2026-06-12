import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

export default function Spinner({ className }) {
  return <Loader2 className={cn('animate-spin text-wine', className)} />
}
