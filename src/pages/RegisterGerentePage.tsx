import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCurrentRole } from '../auth/fetchCurrentRole'
import { setPreferredLogin } from '../auth/preferredLogin'
import { ensureSupabase, getFunctionsErrorMessage } from '../auth/authFlow'
import { useAuthFlow } from '../auth/useAuthFlow'

type Step = 'signup' | 'check-email'

function buildRegisterGerenteErrorMessage(rawMessage: string): string {
  const normalized = rawMessage.trim()
  if (!normalized) return 'Falha ao criar conta. Tente novamente em instantes.'

  const lower = normalized.toLowerCase()

  if (lower.includes('database error saving new user')) {
    return (
      'Falha ao criar conta: erro ao salvar usuário no banco durante o onboarding da empresa/perfil. ' +
      `Detalhe técnico: ${normalized}`
    )
  }

  if (lower.includes('user already registered') || lower.includes('already registered')) {
    return `Este e-mail já está cadastrado. Use outro e-mail ou faça login. Detalhe técnico: ${normalized}`
  }

  if (lower.includes('invalid login credentials')) {
    return `Credenciais inválidas para a operação de cadastro. Verifique os dados enviados. Detalhe técnico: ${normalized}`
  }

  return `Falha ao criar conta no serviço de cadastro. Detalhe técnico: ${normalized}`
}

export function RegisterGerentePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('signup')
  const { loading, error, setError, clearError, run } = useAuthFlow(
    'Erro inesperado ao criar conta.',
  )

  const authRedirectBase =
    (import.meta.env.VITE_AUTH_REDIRECT_BASE as string | undefined) ?? window.location.origin

  const [form, setForm] = useState({
    razaoSocial: '',
    cnpj: '',
    username: '',
    email: '',
    senha: '',
  })
  const [loginCodeGerado, setLoginCodeGerado] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function redirectIfAlreadyAuthenticated() {
      const { client: supabaseClient } = ensureSupabase()
      if (!supabaseClient) return

      const {
        data: { session },
      } = await supabaseClient.auth.getSession()
      if (!session || cancelled) return

      const roleResult = await fetchCurrentRole(supabaseClient)
      if (cancelled) return
      if (roleResult.ok && (roleResult.role === 'gerente' || roleResult.role === 'vendedor')) {
        navigate('/', { replace: true })
      }
    }

    void redirectIfAlreadyAuthenticated()
    return () => {
      cancelled = true
    }
  }, [navigate])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    clearError()

    if (
      !form.razaoSocial ||
      !form.cnpj ||
      !form.username ||
      !form.email ||
      !form.senha
    ) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }

    const { client: supabaseClient, error: configError } = ensureSupabase()
    if (!supabaseClient) {
      setError(configError)
      return
    }

    await run(async () => {
      // Supabase exige que o `emailRedirectTo` esteja em `Site URL`/`Allowed Redirect URLs`.
      const emailRedirectTo = new URL('/configuracoes', authRedirectBase).toString()

      const { data: registerData, error: registerError } = await supabaseClient.functions.invoke(
        'register-gerente',
        {
          body: {
            razaoSocial: form.razaoSocial,
            cnpj: form.cnpj,
            username: form.username,
            email: form.email,
            password: form.senha,
            emailRedirectTo,
          },
        },
      )

      if (registerError) {
        const detail = await getFunctionsErrorMessage(registerError)
        setError(buildRegisterGerenteErrorMessage(detail ?? registerError.message))
        return
      }

      const reg = registerData as
        | { success?: boolean; error?: string; login_code?: string; session?: unknown }
        | null

      if (reg && typeof reg === 'object' && reg.error) {
        setError(buildRegisterGerenteErrorMessage(String(reg.error)))
        return
      }

      if (reg && reg.success === false) {
        setError('Cadastro não concluído. Verifique se a edge function register-gerente está deployada (DEPLOY.md).')
        return
      }

      if (reg?.login_code) {
        setLoginCodeGerado(reg.login_code)
      }

      // Em alguns ambientes a função pode retornar sessão quando confirmação de e-mail está desativada.
      if (reg?.session) {
        setPreferredLogin('gerente')
        navigate('/', { replace: true })
        return
      }

      setStep('check-email')
    })
  }

  if (step === 'check-email') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Confirme seu e-mail</h1>
          <p>
            Enviamos um link de confirmação para <strong>{form.email}</strong>. Clique no link
            para ativar sua conta e depois faça login normalmente.
          </p>
          {loginCodeGerado && (
            <p style={{ marginTop: '1rem' }}>
              <strong>Código da empresa (guarde para o login):</strong>{' '}
              <code style={{ fontSize: '1.1rem' }}>{loginCodeGerado}</code>
            </p>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/login-gerente')}
          >
            Voltar ao login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Criar conta (Gerente)</h1>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
          Cadastre a empresa e o e-mail do gerente. Um link de confirmação será enviado para você
          ativar a conta.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <label htmlFor="razao_social">Razao Social *</label>
            <input
              id="razao_social"
              type="text"
              value={form.razaoSocial}
              onChange={(e) => setForm((prev) => ({ ...prev, razaoSocial: e.target.value }))}
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="cnpj">CNPJ *</label>
            <input
              id="cnpj"
              type="text"
              value={form.cnpj}
              onChange={(e) => setForm((prev) => ({ ...prev, cnpj: e.target.value }))}
              placeholder="00.000.000/0000-00"
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="username">Usuário *</label>
            <input
              id="username"
              type="text"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="email">E-mail *</label>
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
            <label htmlFor="senha">Senha *</label>
            <input
              id="senha"
              type="password"
              autoComplete="new-password"
              value={form.senha}
              onChange={(e) => setForm((prev) => ({ ...prev, senha: e.target.value }))}
              required
              minLength={6}
            />
            <small className="form-help">A senha deve ter no mínimo 6 caracteres.</small>
          </div>

          {error && <div className="form-error" role="alert" aria-live="assertive">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Enviando...' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}

