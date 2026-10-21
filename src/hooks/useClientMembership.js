import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/** Mirrors useStaffProfile — the logged-in client's own booking_members row. */
export function useClientMembership() {
  const { user } = useAuth()
  const [membership, setMembership] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    if (!user) {
      setMembership(null)
      setLoading(false)
      return
    }

    setLoading(true)
    supabase
      .from('booking_members')
      .select('id, booking_id, must_change_password')
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error) setMembership(data)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  return { membership, loading }
}
