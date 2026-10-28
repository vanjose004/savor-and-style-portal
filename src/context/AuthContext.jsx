import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isStaff, setIsStaff] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Session + role resolution run as one sequential bootstrap, not two
  // independent effects, so `loading` only ever goes false once isAdmin/
  // isStaff/isClient already reflect the real session. Two separate
  // effects raced here before: the role-lookup effect's own "no session
  // yet" fast path (session === null on first render) would resolve
  // before supabase.auth.getSession() came back, so on a fresh full-page
  // load of a deep route (e.g. a browser refresh on /admin/bookings) there
  // was a one-render window where loading was already false but isAdmin
  // was still stale-false — RequireAdmin read that as "not an admin" and
  // bounced to /admin/login, which then redirected logged-in admins to
  // /admin/dashboard (losing the route they actually asked for). Auth
  // state changes after the initial bootstrap (token refresh, sign-in,
  // sign-out) still update session/roles below, just without re-flipping
  // the global `loading` flag — that would otherwise flash every admin
  // page to a full-screen spinner on every background token refresh.
  useEffect(() => {
    let cancelled = false

    async function resolveRoles(currentSession) {
      const userId = currentSession?.user?.id
      if (!userId) {
        if (!cancelled) {
          setIsAdmin(false)
          setIsStaff(false)
          setIsClient(false)
        }
        return
      }

      const [adminResult, staffResult, memberResult] = await Promise.all([
        supabase.from('admins').select('id').eq('id', userId).maybeSingle(),
        supabase.from('staff').select('id').eq('id', userId).maybeSingle(),
        supabase.from('booking_members').select('id').eq('auth_user_id', userId).eq('active', true).maybeSingle(),
      ])
      if (cancelled) return
      setIsAdmin(!!adminResult.data)
      setIsStaff(!!staffResult.data)
      setIsClient(!!memberResult.data)
    }

    async function init() {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setSession(data.session)
      await resolveRoles(data.session)
      if (!cancelled) setLoading(false)
    }

    init()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (cancelled) return
      setSession(newSession)
      resolveRoles(newSession)
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  // Chef accounts are created manually in the Supabase dashboard with
  // user_metadata.role = 'chef' — no chefs table, so this reads straight
  // off the session instead of an async lookup.
  const isChef = session?.user?.user_metadata?.role === 'chef'

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    isAdmin,
    isStaff,
    isClient,
    isChef,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
