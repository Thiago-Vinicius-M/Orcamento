import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthSession } from '../auth/useAuthSession'

function urlHasConfirmationParams(): boolean {
  if (typeof window === 'undefined') return false
  const { hash, search } = window.location
  // PKCE flow: Supabase embeds a short-lived `code` in the query string
  // Implicit flow (legacy): access_token in hash or query string
  return (
    search.includes('code=') ||
    hash.includes('access_token=') ||
    search.includes('access_token=')
  )
}

type Status = 'carregando' | 'autenticado' | 'nao_autenticado' | 'erro'

export function AuthConfirmCallbackPage() {
  const navigate = useNavigate()
  const { user, loading, error: authError } = useAuthSession()

  const [postConfirmFlow] = useState(urlHasConfirmationParams)
  const redirecting = Boolean(!loading && user && postConfirmFlow)

  const status: Status = loading ? 'carregando' : authError ? 'erro' : user ? 'autenticado' : 'nao_autenticado'
  const email = user?.email ?? null
  const error = authError

  useEffect(() => {
    if (!redirecting) {
      return
    }

    try {
      // Remove `code` (PKCE) e `access_token` (implicit) da URL para não vazar tokens
      // no histórico do browser nem em ferramentas de analytics.
      const params = new URLSearchParams(window.location.search)
      params.delete('code')
      const cleanSearch = params.toString()
      window.history.replaceState(
        null,
        document.title,
        window.location.pathname + (cleanSearch ? '?' + cleanSearch : ''),
      )
    } catch {
      // Se falhar (ex: bloqueio de history), ainda assim redirecionamos.
    }

    const timeout = window.setTimeout(() => {
      navigate('/', { replace: true })
    }, 1500)

    return () => window.clearTimeout(timeout)
  }, [navigate, redirecting])

  return (
    <>
      <h1>Confirmação de e-mail</h1>
      <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
        {status === 'autenticado' ? (
          <>
            {redirecting
              ? 'E-mail confirmado! Redirecionando para o dashboard...'
              : 'E-mail confirmado! Você já está autenticado'}
            {email ? ` (${email})` : ''}.
          </>
        ) : status === 'nao_autenticado' ? (
          <>
            Se você acabou de confirmar seu e-mail, aguarde alguns segundos e recarregue a página ou faça login
            novamente.
          </>
        ) : status === 'erro' ? (
          <>Não foi possível confirmar a sessão. {error ? error : ''}</>
        ) : (
          <>Processando confirmação do e-mail...</>
        )}
      </p>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate('/', { replace: true })}
          disabled={status !== 'autenticado'}
        >
          Ir para Dashboard
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => window.location.reload()}
          disabled={status === 'carregando' || redirecting}
        >
          Recarregar página
        </button>
      </div>
    </>
  )
}
