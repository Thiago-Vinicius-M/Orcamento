<<<<<<< HEAD
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL não está definida nas variáveis de ambiente")
}

if (!supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_ANON_KEY não está definida nas variáveis de ambiente",
  )
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
)

=======
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const SUPABASE_NOT_CONFIGURED_MESSAGE =
  'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.'

// Importante: `createClient()` lança erro se `supabaseUrl`/anon key estiverem vazios.
// Para não quebrar o React e ficar branco, exportamos `supabase` como `null`
// quando as envs não estiverem configuradas.
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null

export function getSupabaseClient() {
  if (!supabase) {
    return { client: null, error: SUPABASE_NOT_CONFIGURED_MESSAGE }
  }

  return { client: supabase, error: null }
}

export function requireSupabaseClient() {
  const { client, error } = getSupabaseClient()

  if (!client) {
    throw new Error(error)
  }

  return client
}

>>>>>>> 310ef08 (deploy)
