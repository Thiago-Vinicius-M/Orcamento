import { useMemo, type ReactNode } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseStatusFromEnv, type SupabaseStatus } from './supabaseClient'
import { SupabaseReactContext } from './supabaseReactContext'

export type { SupabaseStatus }

export type SupabaseProviderProps = {
  /** Para testes ou client injetado; quando omitido, usa env + instância padrão. */
  client?: SupabaseClient
  children: ReactNode
}

export function SupabaseProvider({ client: clientProp, children }: SupabaseProviderProps) {
  const value = useMemo<SupabaseStatus>(() => {
    if (clientProp) {
      return { kind: 'ready', client: clientProp }
    }
    return getSupabaseStatusFromEnv()
  }, [clientProp])

  return <SupabaseReactContext.Provider value={value}>{children}</SupabaseReactContext.Provider>
}
