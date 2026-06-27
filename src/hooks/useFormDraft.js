import { useEffect } from 'react'

/**
 * Persists a react-hook-form instance's values to sessionStorage as the user
 * types, so an accidental reload or a switch away and back to this tab
 * doesn't lose in-progress input. Restoration only happens when the caller
 * invokes `restoreDraft()` — forms decide when (on mount for full-page forms,
 * or alongside an existing `reset()` for modals that re-open with fresh
 * defaults each time).
 *
 * Pass `enabled: false` to disable entirely (e.g. an edit form that
 * shouldn't restore a stale draft from a different record).
 */
export function useFormDraft(form, key, { exclude = [], enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return

    const { unsubscribe } = form.watch((values) => {
      const draft = { ...values }
      exclude.forEach((field) => delete draft[field])
      sessionStorage.setItem(key, JSON.stringify(draft))
    })

    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])

  function restoreDraft() {
    if (!enabled) return
    const saved = sessionStorage.getItem(key)
    if (!saved) return

    try {
      const values = JSON.parse(saved)
      Object.entries(values).forEach(([field, value]) => form.setValue(field, value))
    } catch {
      sessionStorage.removeItem(key)
    }
  }

  function clearDraft() {
    sessionStorage.removeItem(key)
  }

  return { restoreDraft, clearDraft }
}
