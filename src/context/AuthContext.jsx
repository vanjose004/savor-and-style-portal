import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isStaff, setIsStaff] = useState(false)
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
        ])
      : Promise.resolve([{ data: null }, { data: null }])

    lookups.then(([adminResult, staffResult]) => {
      if (cancelled) return
      setIsAdmin(!!adminResult.data)
      setIsStaff(!!staffResult.data)
      setRoleLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [session])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  const value = {
    session,
    user: session?.user ?? null,
    loading: loading || roleLoading,
    isAdmin,
    isStaff,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
