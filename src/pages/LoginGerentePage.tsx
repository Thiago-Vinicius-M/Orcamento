import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCurrentRole } from '../auth/fetchCurrentRole'
import { setPreferredLogin } from '../auth/preferredLogin'
import { ensureSupabase } from '../auth/authFlow'
import { useAuthFlow } from '../auth/useAuthFlow'

export function LoginGerentePage() {
  const navigate = useNavigate()
  const { loading, error, setError, clearError, run } = useAuthFlow(
    'Erro inesperado ao fazer login.',
  )

  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    clearError()

    if (!form.email || !form.password) {
      setError('Preencha e-mail e senha.')
      return
    }

    const { client: supabaseClient, error: configError } = ensureSupabase()
    if (!supabaseClient) {
      setError(configError)
      return
    }

    await run(async () => {
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      const roleResult = await fetchCurrentRole(supabaseClient)
      if (!roleResult.ok) {
        await supabaseClient.auth.signOut()
        setError(roleResult.message)
        return
      }
      if (roleResult.role !== 'gerente') {
        await supabaseClient.auth.signOut()
        setError('Acesso não permitido para este perfil.')
        return
      }

      setPreferredLogin('gerente')
      navigate('/', { replace: true })
    })
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Login do gerente</h1>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
          Acesse com seu e-mail e senha. A conta precisa ter e-mail confirmado.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required
              minLength={6}
            />
          </div>

          {error && <div className="form-error" role="alert" aria-live="assertive">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <button
            type="button"
            className="btn-primary"
            disabled={loading}
            style={{
              background: 'transparent',
              border: '1px solid rgba(148, 163, 184, 0.7)',
              color: 'var(--accent-blue)',
              boxShadow: 'none',
            }}
            onClick={() => navigate('/register')}
          >
            Criar conta (Gerente)
          </button>

          <button
            type="button"
            className="btn-primary"
            disabled={loading}
            style={{
              background: 'transparent',
              border: '1px solid rgba(148, 163, 184, 0.7)',
              color: 'var(--accent-blue)',
              boxShadow: 'none',
            }}
            onClick={() => navigate('/login-vendedor')}
          >
            Entrar como vendedor
          </button>
        </form>
      </div>
    </div>
  )
}

