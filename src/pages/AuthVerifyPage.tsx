import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { EmailOtpType } from '@supabase/supabase-js'
import { useSupabase } from '../lib/useSupabase'

type Status = 'verificando' | 'sucesso' | 'erro'

export function AuthVerifyPage() {
  const navigate = useNavigate()
  const supaStatus = useSupabase()
  const [status, setStatus] = useState<Status>('verificando')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const verifiedRef = useRef(false)

  useEffect(() => {
    if (supaStatus.kind !== 'ready') return
    if (verifiedRef.current) return
    verifiedRef.current = true

    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token_hash')
    const type = params.get('type') as EmailOtpType | null

    if (!tokenHash || !type) {
      setStatus('erro')
      setErrorMessage('Link de verificação inválido ou expirado.')
      return
    }

    // Remove o token da URL antes de qualquer redirect ou log do browser
    window.history.replaceState(null, document.title, window.location.pathname)

    supaStatus.client.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
      if (error) {
        setStatus('erro')
        setErrorMessage(error.message)
        return
      }
      setStatus('sucesso')
      window.setTimeout(() => navigate('/', { replace: true }), 1500)
    })
  }, [navigate, supaStatus])

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Confirmação de e-mail</h1>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
          {status === 'verificando' && 'Verificando seu e-mail...'}
          {status === 'sucesso' && 'E-mail confirmado! Redirecionando para o dashboard...'}
          {status === 'erro' && (
            <>Não foi possível confirmar o e-mail. {errorMessage}</>
          )}
        </p>
        {status === 'erro' && (
          <div style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/login-gerente', { replace: true })}
            >
              Voltar ao login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
