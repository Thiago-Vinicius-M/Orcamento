import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabaseClient } from '../lib/supabaseClient'

type Status = 'carregando' | 'autenticado' | 'nao_autenticado' | 'erro'

export function ConfiguracoesPage() {
  const navigate = useNavigate()

  const [postConfirmFlow] = useState(() => {
    if (typeof window === 'undefined') return false
    // Supabase coloca tokens de autenticação no `hash`/`search` após confirmar e-mail.
    const hashHasTokens = window.location.hash.includes('access_token=')
    const searchHasTokens = window.location.search.includes('access_token=')
    return hashHasTokens || searchHasTokens
  })

  const [status, setStatus] = useState<Status>('carregando')
  const [email, setEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const redirecting = status === 'autenticado' && postConfirmFlow

  const verificarSessao = useCallback(async () => {
    setError(null)
    setStatus('carregando')

    const { client: supabaseClient, error: configError } = getSupabaseClient()
    if (!supabaseClient) {
      setError(configError)
      setStatus('erro')
      return
    }

    // `getSession()` faz o parse da URL quando há tokens vindos do link de e-mail
    // (confirmar conta via SMTP/Gmail), garantindo que o usuário fique autenticado.
    const {
      data: { session },
      error: sessionErr,
    } = await supabaseClient.auth.getSession()

    if (sessionErr) {
      setError(sessionErr.message)
      setStatus('erro')
      return
    }

    if (!session) {
      setStatus('nao_autenticado')
      return
    }

    const {
      data: { user },
      error: userErr,
    } = await supabaseClient.auth.getUser()

    if (userErr) {
      setError(userErr.message)
      setStatus('erro')
      return
    }

    setEmail(user?.email ?? null)
    setStatus('autenticado')
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void verificarSessao()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [verificarSessao])

  useEffect(() => {
    // Se esta página foi acessada via link de confirmação, ao autenticar
    // automaticamente encaminhamos para o dashboard.
    if (!redirecting) {
      return
    }

    // Best-effort para remover tokens da URL e reduzir reprocessamento.
    try {
      if (
        window.location.hash.includes('access_token=') ||
        window.location.search.includes('access_token=')
      ) {
        window.history.replaceState(
          null,
          document.title,
          window.location.pathname + window.location.search,
        )
      }
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
      <h1>Configurações</h1>
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
            Se você acabou de confirmar seu e-mail, aguarde alguns segundos e clique
            em Verificar novamente.
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
          onClick={() => void verificarSessao()}
          disabled={status === 'carregando' || redirecting}
        >
          Verificar novamente
        </button>
      </div>

      {status !== 'autenticado' && (
        <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>
          Configurações da empresa (em breve).
        </p>
      )}
    </>
  )
}
