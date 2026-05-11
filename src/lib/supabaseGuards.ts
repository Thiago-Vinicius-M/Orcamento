import { getSupabaseClient, SUPABASE_NOT_CONFIGURED_MESSAGE } from './supabaseClient'

export { SUPABASE_NOT_CONFIGURED_MESSAGE }

export function ensureSupabaseConfigured(setError: (message: string) => void) {
  const { client, error } = getSupabaseClient()

  if (!client) {
    setError(error)
    return false
  }

  return true
}

export function getClientOrNull(setError: (message: string | null) => void) {
  const { client, error: configError } = getSupabaseClient()
  if (!client) {
    setError(configError)
    return null
  }
  return client
}
