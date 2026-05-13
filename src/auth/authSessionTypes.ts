import type { User } from '@supabase/supabase-js'
import type { UserRole } from '../types/userRole'

export type AuthSessionState = {
  user: User | null
  role: UserRole | null
  companyId: string | null
  loading: boolean
  error: string | null
}

export type AuthSessionApi = AuthSessionState & {
  refresh: () => Promise<void>
}
