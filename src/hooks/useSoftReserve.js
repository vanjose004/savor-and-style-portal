import { useContext } from 'react'
import { SoftReserveContext } from '../context/soft-reserve-context'

export function useSoftReserve() {
  const context = useContext(SoftReserveContext)
  if (context === undefined) {
    throw new Error('useSoftReserve must be used within a SoftReserveProvider')
  }
  return context
}
