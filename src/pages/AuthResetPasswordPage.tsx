import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthSession } from '../auth/useAuthSession'
import { useSupabase } from '../lib/useSupabase'

type Step = 'loading' | 'form' | 'no-token'

export function AuthResetPasswordPage() {
  const navigate = useNavigate()
  const supabaseStatus = useSupabase()
  const { user, loading: sessionLoading } = useAuthSession()

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasRecoveryToken =
    window.location.hash.includes('type=recovery') ||
    window.location.search.includes('type=recovery')

  const step: Step = sessionLoading
    ? 'loading'
    : user && hasRecoveryToken
      ? 'form'
      : 'no-token'

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (novaSenha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (novaSenha !== confirmarSenha) {
      setError('As senhas não coincidem.')
      return
    }
    if (supabaseStatus.kind !== 'ready') {
      setError(supabaseStatus.message)
      return
    }
    setSubmitting(true)
    setError(null)
    const { error: updateError } = await supabaseStatus.client.auth.updateUser({ password: novaSenha })
    if (updateError) {
      setError(updateError.message)
      setSubmitting(false)
      return
    }
    await supabaseStatus.client.auth.signOut()
    toast.success('Senha alterada com sucesso. Faça login com a nova senha.')
    navigate('/login-gerente', { replace: true })
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        {step === 'loading' && (
          <p style={{ color: 'var(--text-muted)' }}>Verificando...</p>
        )}

        {step === 'no-token' && (
          <>
            <h1>Link inválido ou expirado</h1>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
              O link de recuperação não é válido ou já foi utilizado. Solicite um novo link na
              tela de login.
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: '1.25rem' }}
              onClick={() => navigate('/login-gerente')}
            >
              Voltar ao login
            </button>
          </>
        )}

        {step === 'form' && (
          <>
            <h1>Redefinir senha</h1>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
              Defina uma nova senha para sua conta.
            </p>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-row">
                <label htmlFor="nova_senha">Nova senha</label>
                <input
                  id="nova_senha"
                  type="password"
                  autoComplete="new-password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
              </div>
              <div className="form-row">
                <label htmlFor="confirmar_senha">Confirmar nova senha</label>
                <input
                  id="confirmar_senha"
                  type="password"
                  autoComplete="new-password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && (
                <div className="form-error" role="alert" aria-live="assertive">
                  {error}
                </div>
              )}
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Alterando...' : 'Alterar senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
