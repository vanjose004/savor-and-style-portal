import { supabase } from '../lib/supabase'

/** Suggests a "firstname.lastname" username from a display name, e.g. "Juan Dela Cruz" -> "juan.cruz". */
export function suggestUsername(name) {
  const parts = name.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts[0]}.${parts[parts.length - 1]}`
}

/** Finds a free username starting from a base suggestion, appending a numeric suffix on collision. */
export async function findAvailableUsername(baseUsername, maxAttempts = 20) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = attempt === 0 ? baseUsername : `${baseUsername}${attempt + 1}`
    const { data: taken, error } = await supabase.rpc('is_username_taken', { p_username: candidate })
    if (error) throw error
    if (!taken) return candidate
  }
  throw new Error('Could not find an available username — please contact an admin.')
}
