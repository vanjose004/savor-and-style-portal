import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isStaff, setIsStaff] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [roleLoading, setRoleLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let cancelled = false
    const userId = session?.user?.id

    setRoleLoading(true)

    const lookups = userId
      ? Promise.all([
          supabase.from('admins').select('id').eq('id', userId).maybeSingle(),
          supabase.from('staff').select('id').eq('id', userId).maybeSingle(),
          supabase.from('booking_members').select('id').eq('auth_user_id', userId).eq('active', true).maybeSingle(),
        ])
      : Promise.resolve([{ data: null }, { data: null }, { data: null }])

    lookups.then(([adminResult, staffResult, memberResult]) => {
      if (cancelled) return
      setIsAdmin(!!adminResult.data)
      setIsStaff(!!staffResult.data)
      setIsClient(!!memberResult.data)
      setRoleLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [session])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  // Chef accounts are created manually in the Supabase dashboard with
  // user_metadata.role = 'chef' — no chefs table, so this reads straight
  // off the session instead of an async lookup.
  const isChef = session?.user?.user_metadata?.role === 'chef'

  const value = {
    session,
    user: session?.user ?? null,
    loading: loading || roleLoading,
    isAdmin,
    isStaff,
    isClient,
    isChef,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
