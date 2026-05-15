import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const SUPABASE_NOT_CONFIGURED_MESSAGE =
  'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.'

// Importante: `createClient()` lança erro se `supabaseUrl`/anon key estiverem vazios.
// Para não quebrar o React e ficar branco, exportamos `supabase` como `null`
// quando as envs não estiverem configuradas.
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: { flowType: 'pkce' },
    })
  : null

export type SupabaseStatus =
  | { kind: 'ready'; client: SupabaseClient }
  | { kind: 'unconfigured'; message: string }

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SupabaseConfigError'
  }
}

/** Boundary “suave”: login e fluxos que não devem lançar na montagem. */
export function getSupabaseClient() {
  if (!supabase) {
    return { client: null, error: SUPABASE_NOT_CONFIGURED_MESSAGE }
  }

  return { client: supabase, error: null }
}

/** Estado a partir do env (sem client injetado). Usado pelo SupabaseProvider quando não há prop. */
export function getSupabaseStatusFromEnv(): SupabaseStatus {
  const { client, error } = getSupabaseClient()
  if (client) {
    return { kind: 'ready', client }
  }
  return { kind: 'unconfigured', message: error ?? SUPABASE_NOT_CONFIGURED_MESSAGE }
}

/**
 * Cliente Supabase padrão (variáveis de ambiente).
 * Lança com a mesma mensagem que o boundary suave expõe em `error` quando não configurado.
 */
export function getDefaultSupabase(): SupabaseClient {
  const { client, error } = getSupabaseClient()
  if (!client) {
    throw new Error(error ?? SUPABASE_NOT_CONFIGURED_MESSAGE)
  }
  return client
}
