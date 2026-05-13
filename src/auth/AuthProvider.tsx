import type { Session, SupabaseClient } from '@supabase/supabase-js'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import { resolveCompanyId } from '../lib/companyContext'
import { useSupabase } from '../lib/useSupabase'
import { AuthSessionContext } from './authSessionContext'
import type { AuthSessionApi, AuthSessionState } from './authSessionTypes'
import { fetchCurrentRole } from './fetchCurrentRole'

const AUTH_SESSION_CLEARED: AuthSessionState = {
  user: null,
  role: null,
  companyId: null,
  loading: false,
  error: null,
}

type SyncGenRef = MutableRefObject<number>

async function resolveAuthSessionSlice(
  client: SupabaseClient,
  session: Session,
  gen: number,
  syncGenRef: SyncGenRef,
  isStale: () => boolean,
): Promise<AuthSessionState | 'stale'> {
  const user = session.user
  const roleRes = await fetchCurrentRole(client)

  if (isStale() || gen !== syncGenRef.current) return 'stale'

  if (!roleRes.ok) {
    return {
      user,
      role: null,
      companyId: null,
      loading: false,
      error: roleRes.message,
    }
  }

  try {
    const companyId = await resolveCompanyId(client)
    if (isStale() || gen !== syncGenRef.current) return 'stale'
    return {
      user,
      role: roleRes.role,
      companyId,
      loading: false,
      error: null,
    }
  } catch (e) {
    if (isStale() || gen !== syncGenRef.current) return 'stale'
    return {
      user,
      role: roleRes.role,
      companyId: null,
      loading: false,
      error: e instanceof Error ? e.message : 'Erro ao resolver empresa.',
    }
  }
}

function shouldRefetchRoleOnAuthEvent(event: string) {
  return (
    event === 'INITIAL_SESSION' ||
    event === 'SIGNED_IN' ||
    event === 'TOKEN_REFRESHED' ||
    event === 'USER_UPDATED'
  )
}

type AuthProviderProps = { children: ReactNode }

export function AuthProvider({ children }: AuthProviderProps) {
  const supaStatus = useSupabase()
  const [state, setState] = useState<AuthSessionState>({
    user: null,
    role: null,
    companyId: null,
    loading: true,
    error: null,
  })

  const syncGenRef = useRef(0)

  useEffect(() => {
    if (supaStatus.kind !== 'ready') {
      return
    }

    const client = supaStatus.client
    let cancelled = false

    async function applySession(session: Session | null) {
      if (!session) {
        if (cancelled) return
        setState(AUTH_SESSION_CLEARED)
        return
      }

      const gen = ++syncGenRef.current
      if (cancelled) return

      setState(s => ({
        ...s,
        loading: true,
        error: null,
      }))

      const next = await resolveAuthSessionSlice(client, session, gen, syncGenRef, () => cancelled)
      if (next === 'stale') return
      setState(next)
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!session) {
        void applySession(null)
        return
      }
      if (!shouldRefetchRoleOnAuthEvent(event)) return
      void applySession(session)
    })

    void client.auth.getSession().then(({ data: { session }, error: sessionErr }) => {
      if (cancelled) return
      if (sessionErr) {
        setState({
          user: null,
          role: null,
          companyId: null,
          loading: false,
          error: sessionErr.message?.trim() || 'Não foi possível validar a sessão.',
        })
        return
      }
      void applySession(session)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supaStatus])

  const refresh = useCallback(async () => {
    if (supaStatus.kind !== 'ready') return
    const gen = ++syncGenRef.current
    const {
      data: { session },
      error: sessionErr,
    } = await supaStatus.client.auth.getSession()
    if (gen !== syncGenRef.current) return
    if (sessionErr) {
      setState(s => ({
        ...s,
        error: sessionErr.message?.trim() || 'Não foi possível validar a sessão.',
      }))
      return
    }
    if (!session) {
      setState(AUTH_SESSION_CLEARED)
      return
    }
    setState(s => ({ ...s, loading: true, error: null }))
    const next = await resolveAuthSessionSlice(
      supaStatus.client,
      session,
      gen,
      syncGenRef,
      () => gen !== syncGenRef.current,
    )
    if (next === 'stale') return
    setState(next)
  }, [supaStatus])

  const sessionSlice = useMemo<AuthSessionState>(() => {
    if (supaStatus.kind !== 'ready') {
      return {
        user: null,
        role: null,
        companyId: null,
        loading: false,
        error: supaStatus.message,
      }
    }
    return state
  }, [supaStatus, state])

  const value = useMemo<AuthSessionApi>(
    () => ({
      ...sessionSlice,
      refresh,
    }),
    [sessionSlice, refresh],
  )

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}
