import { useContext } from 'react'
import { AuthSessionContext } from './authSessionContext'
import type { AuthSessionApi } from './authSessionTypes'

export type { AuthSessionApi as AuthSession } from './authSessionTypes'

export function useAuthSession(): AuthSessionApi {
  const ctx = useContext(AuthSessionContext)
  if (!ctx) {
    throw new Error('useAuthSession deve ser usado dentro de <AuthProvider>.')
  }
  return ctx
}
