import { useEffect, useState } from 'react'
import { requireSupabaseClient } from '../lib/supabaseClient'
import type { UserRole } from '../types/userRole'

export type { UserRole } from '../types/userRole'

type UseUserRoleResult = {
  role: UserRole | null
  loading: boolean
  error: string | null
}

function shouldRefetchRoleOnAuthEvent(event: string) {
  return (
    event === 'SIGNED_IN' ||
    event === 'SIGNED_OUT' ||
    event === 'TOKEN_REFRESHED' ||
    event === 'USER_UPDATED'
  )
}

export function useUserRole(): UseUserRoleResult {
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let supabase: ReturnType<typeof requireSupabaseClient>

    try {
      supabase = requireSupabaseClient()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar role do usuário.')
      setRole(null)
      setLoading(false)
      return
    }

    async function fetchRole() {
      try {
        const { data, error: rpcError } = await supabase.rpc('current_role')

        if (cancelled) return

        if (rpcError) {
          setError(rpcError.message ?? 'Erro ao buscar role do usuário.')
          setRole(null)
        } else {
          setRole(data as UserRole)
          setError(null)
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Erro ao buscar role do usuário.')
        setRole(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    async function loadWithSpinner() {
      if (cancelled) return
      setLoading(true)
      await fetchRole()
    }

    void loadWithSpinner()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!shouldRefetchRoleOnAuthEvent(event)) return
      if (!session) {
        if (cancelled) return
        setRole(null)
        setError(null)
        setLoading(false)
        return
      }
      void loadWithSpinner()
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return { role, loading, error }
}
