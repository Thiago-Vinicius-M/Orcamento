import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCurrentRole } from '../auth/fetchCurrentRole'
import { setPreferredLogin } from '../auth/preferredLogin'
import { parseFunctionsError } from '../lib/errors'
import { useAuthFlow } from '../auth/useAuthFlow'
import { useSupabase } from '../lib/useSupabase'
import { resolveAuthRedirectBase } from '../lib/resolveAuthRedirectBase'

type Tab = 'gerente' | 'vendedor'
type ForgotStep = 'idle' | 'input' | 'sent'

type Props = {
  initialTab?: Tab
}

const NUMERIC_LOGIN_CODE_PATTERN = /^\d+$/

export function LoginPage({ initialTab = 'gerente' }: Props) {
  const navigate = useNavigate()
  const supabaseStatus = useSupabase()
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  const [gerenteForm, setGerenteForm] = useState({ email: '', password: '' })
  const {
    loading: gerenteLoading,
    error: gerenteError,
    setError: setGerenteError,
    clearError: clearGerenteError,
    run: runGerente,
  } = useAuthFlow('Erro inesperado ao fazer login.')

  const [vendedorForm, setVendedorForm] = useState({ loginCode: '', username: '', password: '' })
  const {
    loading: vendedorLoading,
    error: vendedorError,
    setError: setVendedorError,
    clearError: clearVendedorError,
    run: runVendedor,
  } = useAuthFlow('Erro inesperado ao fazer login.')

  const [forgotStep, setForgotStep] = useState<ForgotStep>('idle')
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)

  const loading = gerenteLoading || vendedorLoading

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    setForgotStep('idle')
    setForgotError(null)
  }

  async function handleGerenteSubmit(event: FormEvent) {
    event.preventDefault()
    clearGerenteError()
    if (!gerenteForm.email || !gerenteForm.password) {
      setGerenteError('Preencha e-mail e senha.')
      return
    }
    if (supabaseStatus.kind !== 'ready') {
      setGerenteError(supabaseStatus.message)
      return
    }
    const supabaseClient = supabaseStatus.client
    await runGerente(async () => {
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: gerenteForm.email,
        password: gerenteForm.password,
      })
      if (signInError) {
        setGerenteError(signInError.message)
        return
      }
      const roleResult = await fetchCurrentRole(supabaseClient)
      if (!roleResult.ok) {
        await supabaseClient.auth.signOut()
        setGerenteError(roleResult.message)
        return
      }
      if (roleResult.role !== 'gerente') {
        await supabaseClient.auth.signOut()
        setGerenteError('Acesso não permitido para este perfil.')
        return
      }
      setPreferredLogin('gerente')
      navigate('/', { replace: true })
    })
  }

  async function handleVendedorSubmit(event: FormEvent) {
    event.preventDefault()
    clearVendedorError()
    const loginCode = vendedorForm.loginCode.trim()
    if (!loginCode || !vendedorForm.username || !vendedorForm.password) {
      setVendedorError('Preencha todos os campos.')
      return
    }
    if (!NUMERIC_LOGIN_CODE_PATTERN.test(loginCode)) {
      setVendedorError('O código da empresa deve conter apenas números.')
      return
    }
    if (supabaseStatus.kind !== 'ready') {
      setVendedorError(supabaseStatus.message)
      return
    }
    const supabaseClient = supabaseStatus.client
    await runVendedor(async () => {
      const { data, error: fnError } = await supabaseClient.functions.invoke<{
        access_token: string
        refresh_token: string
      }>('login-vendedor', {
        body: {
          company_code: loginCode,
          username: vendedorForm.username,
          password: vendedorForm.password,
        },
      })
      if (fnError) {
        const detail = await parseFunctionsError(fnError)
        setVendedorError(detail ?? fnError.message)
        return
      }
      const accessToken = data?.access_token
      const refreshToken = data?.refresh_token
      if (!accessToken || !refreshToken) {
        setVendedorError('Resposta inválida do serviço de autenticação.')
        return
      }
      const { error: sessionError } = await supabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (sessionError) {
        setVendedorError(sessionError.message)
        return
      }
      const roleResult = await fetchCurrentRole(supabaseClient)
      if (!roleResult.ok) {
        await supabaseClient.auth.signOut()
        setVendedorError(roleResult.message)
        return
      }
      if (roleResult.role !== 'vendedor') {
        await supabaseClient.auth.signOut()
        setVendedorError(
          'Esta conta não é de vendedor. Se você é gerente, use a aba Gerente.',
        )
        return
      }
      setPreferredLogin('vendedor')
      navigate('/', { replace: true })
    })
  }

  async function handleForgotSubmit(event: FormEvent) {
    event.preventDefault()
    if (!forgotEmail.trim()) {
      setForgotError('Informe o e-mail.')
      return
    }
    if (supabaseStatus.kind !== 'ready') {
      setForgotError(supabaseStatus.message)
      return
    }
    setForgotLoading(true)
    setForgotError(null)
    const redirectTo = resolveAuthRedirectBase(window.location.origin) + '/auth/reset-password'
    const { error } = await supabaseStatus.client.auth.resetPasswordForEmail(
      forgotEmail.trim(),
      { redirectTo },
    )
    setForgotLoading(false)
    if (error) {
      setForgotError(error.message)
      return
    }
    setForgotStep('sent')
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Login</h1>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
          {activeTab === 'gerente'
            ? 'Acesse com seu e-mail e senha.'
            : 'Acesse com o código da empresa, seu usuário e senha.'}
        </p>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'gerente'}
            className={`auth-tab-btn${activeTab === 'gerente' ? ' auth-tab-btn--active' : ''}`}
            onClick={() => handleTabChange('gerente')}
          >
            Gerente
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'vendedor'}
            className={`auth-tab-btn${activeTab === 'vendedor' ? ' auth-tab-btn--active' : ''}`}
            onClick={() => handleTabChange('vendedor')}
          >
            Vendedor
          </button>
        </div>

        {activeTab === 'gerente' && forgotStep === 'idle' && (
          <form onSubmit={handleGerenteSubmit} className="auth-form">
            <div className="form-row">
              <label htmlFor="ger_email">E-mail</label>
              <input
                id="ger_email"
                type="email"
                autoComplete="email"
                value={gerenteForm.email}
                onChange={(e) => setGerenteForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="ger_password">Senha</label>
              <input
                id="ger_password"
                type="password"
                autoComplete="current-password"
                value={gerenteForm.password}
                onChange={(e) => setGerenteForm((prev) => ({ ...prev, password: e.target.value }))}
                required
                minLength={6}
              />
            </div>
            {gerenteError && (
              <div className="form-error" role="alert" aria-live="assertive">
                {gerenteError}
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={loading}>
              {gerenteLoading ? 'Entrando...' : 'Entrar'}
            </button>
            <div className="auth-footer-links">
              <button
                type="button"
                className="auth-link"
                onClick={() => navigate('/register')}
                disabled={loading}
              >
                Criar conta
              </button>
              <button
                type="button"
                className="auth-link auth-link--muted"
                onClick={() => setForgotStep('input')}
                disabled={loading}
              >
                Esqueci minha senha
              </button>
            </div>
          </form>
        )}

        {activeTab === 'gerente' && forgotStep === 'input' && (
          <form onSubmit={handleForgotSubmit} className="auth-form">
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Informe o e-mail cadastrado e enviaremos um link para redefinição de senha.
            </p>
            <div className="form-row">
              <label htmlFor="forgot_email">E-mail</label>
              <input
                id="forgot_email"
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            {forgotError && (
              <div className="form-error" role="alert" aria-live="assertive">
                {forgotError}
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={forgotLoading}>
              {forgotLoading ? 'Enviando...' : 'Enviar link'}
            </button>
            <button
              type="button"
              className="auth-link auth-link--muted"
              onClick={() => { setForgotStep('idle'); setForgotError(null) }}
              disabled={forgotLoading}
            >
              Cancelar
            </button>
          </form>
        )}

        {activeTab === 'gerente' && forgotStep === 'sent' && (
          <div className="auth-form">
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Link enviado para <strong style={{ color: 'var(--text)' }}>{forgotEmail}</strong>.
              Verifique sua caixa de entrada e clique no link para redefinir a senha.
            </p>
            <button
              type="button"
              className="auth-link auth-link--muted"
              onClick={() => { setForgotStep('idle'); setForgotEmail('') }}
            >
              Voltar ao login
            </button>
          </div>
        )}

        {activeTab === 'vendedor' && (
          <form onSubmit={handleVendedorSubmit} className="auth-form">
            <div className="form-row">
              <label htmlFor="vend_login_code">Código da empresa</label>
              <input
                id="vend_login_code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ex.: 1"
                value={vendedorForm.loginCode}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '')
                  setVendedorForm((prev) => ({ ...prev, loginCode: digitsOnly }))
                }}
                required
              />
              <small className="form-help">Use apenas números.</small>
            </div>
            <div className="form-row">
              <label htmlFor="vend_username">Usuário</label>
              <input
                id="vend_username"
                type="text"
                autoComplete="username"
                value={vendedorForm.username}
                onChange={(e) =>
                  setVendedorForm((prev) => ({ ...prev, username: e.target.value }))
                }
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="vend_password">Senha</label>
              <input
                id="vend_password"
                type="password"
                autoComplete="current-password"
                value={vendedorForm.password}
                onChange={(e) =>
                  setVendedorForm((prev) => ({ ...prev, password: e.target.value }))
                }
                required
                minLength={6}
              />
            </div>
            {vendedorError && (
              <div className="form-error" role="alert" aria-live="assertive">
                {vendedorError}
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={loading}>
              {vendedorLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
