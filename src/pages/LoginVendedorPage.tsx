import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCurrentRole } from '../auth/fetchCurrentRole'
import { setPreferredLogin } from '../auth/preferredLogin'
import { parseFunctionsError } from '../lib/errors'
import { useSupabase } from '../lib/useSupabase'
import { useAuthFlow } from '../auth/useAuthFlow'

const NUMERIC_LOGIN_CODE_PATTERN = /^\d+$/

export function LoginVendedorPage() {
  const navigate = useNavigate()
  const supaStatus = useSupabase()
  const { loading, error, setError, clearError, run } = useAuthFlow(
    'Erro inesperado ao fazer login.',
  )

  const [form, setForm] = useState({
    loginCode: '',
    username: '',
    password: '',
  })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    clearError()

    const loginCode = form.loginCode.trim()

    if (!loginCode || !form.username || !form.password) {
      setError('Preencha todos os campos.')
      return
    }

    if (!NUMERIC_LOGIN_CODE_PATTERN.test(loginCode)) {
      setError('O código da empresa deve conter apenas números.')
      return
    }

    if (supaStatus.kind !== 'ready') {
      setError(supaStatus.message)
      return
    }
    const supabaseClient = supaStatus.client

    await run(async () => {
      const { data, error: fnError } = await supabaseClient.functions.invoke<{
        access_token: string
        refresh_token: string
      }>('login-vendedor', {
        body: {
          company_code: loginCode,
          username: form.username,
          password: form.password,
        },
      })

      if (fnError) {
        const detail = await parseFunctionsError(fnError)
        setError(detail ?? fnError.message)
        return
      }

      const accessToken = data?.access_token
      const refreshToken = data?.refresh_token
      if (!accessToken || !refreshToken) {
        setError('Resposta inválida do serviço de autenticação.')
        return
      }

      const { error: sessionError } = await supabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (sessionError) {
        setError(sessionError.message)
        return
      }

      const roleResult = await fetchCurrentRole(supabaseClient)
      if (!roleResult.ok) {
        await supabaseClient.auth.signOut()
        setError(roleResult.message)
        return
      }
      if (roleResult.role !== 'vendedor') {
        await supabaseClient.auth.signOut()
        setError(
          'Esta conta não é de vendedor. Se você é gerente, use o login do gerente com e-mail e senha.',
        )
        return
      }

      setPreferredLogin('vendedor')
      navigate('/', { replace: true })
    })
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Login</h1>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
          Acesse com o código da empresa, seu usuário e senha.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <label htmlFor="login_code">Código da empresa</label>
            <input
              id="login_code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Ex.: 1"
              value={form.loginCode}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, '')
                setForm((prev) => ({ ...prev, loginCode: digitsOnly }))
              }}
              required
            />
            <small className="form-help">Use apenas números.</small>
          </div>

          <div className="form-row">
            <label htmlFor="username">Usuário</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
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
            onClick={() => navigate('/login-gerente')}
          >
            Entrar como gerente
          </button>
        </form>
      </div>
    </div>
  )
}

