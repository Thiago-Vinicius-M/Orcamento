import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getPreferredLoginPath } from './preferredLogin'
import { ensureSupabase, getErrorMessage } from './authFlow'

type RequireAuthProps = {
  children: ReactNode
}

type AuthStatus = 'loading' | 'authed' | 'unauth'

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function verificarSessao() {
      setError(null)

      const { client: supabaseClient, error: configError } = ensureSupabase()
      if (!supabaseClient) {
        setError(configError)
        setStatus('unauth')
        return
      }

      const {
        data: { session },
        error: sessionErr,
      } = await supabaseClient.auth.getSession()

      if (sessionErr) {
        setError(getErrorMessage(sessionErr, 'Não foi possível validar a sessão.'))
        setStatus('unauth')
        return
      }

      setStatus(session ? 'authed' : 'unauth')
    }

    void verificarSessao()

    // Mantém o guard consistente quando a sessão muda enquanto a app está aberta.
    const {
      data: { subscription },
    } = ensureSupabase().client?.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? 'authed' : 'unauth')
    }) ?? { data: { subscription: null } }

    return () => {
      subscription?.unsubscribe?.()
    }
  }, [])

  if (status === 'loading') {
    return <div style={{ padding: '1rem' }}>Carregando...</div>
  }

  if (status === 'unauth') {
    // Se for erro de configuração de envs, ainda redirecionamos para não prender o usuário.
    // O erro fica visível apenas durante o carregamento inicial via estado `error`.
    return (
      <>
        {error ? (
          <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>{error}</p>
        ) : null}
        <Navigate
          to={getPreferredLoginPath()}
          replace
          state={{ from: location.pathname }}
        />
      </>
    )
  }

  return <>{children}</>
}

