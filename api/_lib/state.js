import { getSupabaseAdmin } from './supabaseAdmin.js'

const TABLE = 'telegram_bot_state'

/** Creates a new pending action for a chat, returning its row (id used as the callback_data reference). */
export async function createPendingAction(chatId, pendingAction) {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .insert({ chat_id: String(chatId), pending_action: pendingAction })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Reads a pending action by id. Returns null if missing or expired. */
export async function getPendingAction(id) {
  const { data, error } = await getSupabaseAdmin().from(TABLE).select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  if (new Date(data.expires_at) < new Date()) return null
  return data
}

/** Merges `patch` into an existing pending_action (multi-step flows: category pick -> confirm, etc). */
export async function updatePendingAction(id, patch) {
  const current = await getPendingAction(id)
  if (!current) return null
  const merged = { ...current.pending_action, ...patch }
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .update({ pending_action: merged })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePendingAction(id) {
  await getSupabaseAdmin().from(TABLE).delete().eq('id', id)
}

/** A fresh command interrupts whatever a chat was in the middle of. */
export async function clearPendingForChat(chatId) {
  await getSupabaseAdmin().from(TABLE).delete().eq('chat_id', String(chatId))
}

/** Opportunistic sweep, scoped to the active chat, run once per incoming update. */
export async function cleanupExpiredForChat(chatId) {
  await getSupabaseAdmin().from(TABLE).delete().eq('chat_id', String(chatId)).lt('expires_at', new Date().toISOString())
}
