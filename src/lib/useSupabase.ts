import { useContext } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseConfigError, type SupabaseStatus } from './supabaseClient'
import { SupabaseReactContext } from './supabaseReactContext'

export type { SupabaseStatus } from './supabaseClient'

export function useSupabase(): SupabaseStatus {
  const ctx = useContext(SupabaseReactContext)
  if (!ctx) {
    throw new Error('useSupabase deve ser usado dentro de <SupabaseProvider>.')
  }
  return ctx
}

export function useSupabaseClient(): SupabaseClient {
  const s = useSupabase()
  if (s.kind !== 'ready') {
    throw new SupabaseConfigError(s.message)
  }
  return s.client
}
