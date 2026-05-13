import type { UserRole } from '../types/userRole'
import { useAuthSession } from '../auth/useAuthSession'

export type { UserRole } from '../types/userRole'

type UseUserRoleResult = {
  role: UserRole | null
  loading: boolean
  error: string | null
}

/**
 * @deprecated Use `useAuthSession()`; mantido para compatibilidade com chamadas existentes.
 */
export function useUserRole(): UseUserRoleResult {
  const { role, loading, error } = useAuthSession()
  return { role, loading, error }
}
