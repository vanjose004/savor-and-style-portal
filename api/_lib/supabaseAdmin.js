import { createClient } from '@supabase/supabase-js'

// Service-role client for the Telegram bot's privileged reads/writes.
// bookings/expenses/payments/transactions/telegram_bot_state are all
// admin-only under RLS — this bypasses it entirely, same pattern as the
// existing Supabase Edge Functions (supabase/functions/*/index.ts).
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are plain (non-VITE_-prefixed)
// Vercel env vars, set directly in the Vercel dashboard — never committed,
// never bundled into the browser.
let client

export function getSupabaseAdmin() {
  if (!client) {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured')
    }
    client = createClient(supabaseUrl, serviceRoleKey)
  }
  return client
}
