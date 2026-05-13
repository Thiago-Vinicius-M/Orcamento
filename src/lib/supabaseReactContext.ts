import { createContext } from 'react'
import type { SupabaseStatus } from './supabaseClient'

export const SupabaseReactContext = createContext<SupabaseStatus | null>(null)
