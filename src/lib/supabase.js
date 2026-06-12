import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. Copy .env.example to .env and fill in your project credentials.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * A separate client with no session persistence, used to create the
 * Supabase Auth account for a new staff member without affecting the
 * currently signed-in admin's session.
 */
export function createStaffSignupClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
