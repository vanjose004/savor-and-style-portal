import { useState } from 'react'
import { SoftReserveContext } from './soft-reserve-context'

export function SoftReserveProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [prefillPackage, setPrefillPackage] = useState('')
  const [sessionKey, setSessionKey] = useState(0)

  const openSoftReserve = (packageName = '') => {
    setPrefillPackage(packageName)
    setSessionKey((key) => key + 1)
    setIsOpen(true)
  }

  const closeSoftReserve = () => setIsOpen(false)

  const value = { isOpen, prefillPackage, sessionKey, openSoftReserve, closeSoftReserve }

  return <SoftReserveContext.Provider value={value}>{children}</SoftReserveContext.Provider>
}
