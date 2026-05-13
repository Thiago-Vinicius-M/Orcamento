import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSupabase } from '../lib/useSupabase'

type FormState = {
  nome: string
  username: string
  senha: string
}

export function VendedoresPage() {
  const supabaseStatus = useSupabase()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    nome: '',
    username: '',
    senha: '',
  })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!form.nome || !form.username || !form.senha) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }

    setLoading(true)
    try {
      if (supabaseStatus.kind !== 'ready') {
        setError(supabaseStatus.message)
        return
      }
      const supabaseClient = supabaseStatus.client

      const { error: fnError } = await supabaseClient.functions.invoke('create-vendedor', {
        body: {
          nome: form.nome,
          username: form.username,
          password: form.senha,
        },
      })

      if (fnError) {
        setError(fnError.message)
        return
      }

      setSuccess('Vendedor criado com sucesso.')
      setForm({ nome: '', username: '', senha: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao criar vendedor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1>Vendedores</h1>
      <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
        Cadastro de vendedores para a sua empresa.
      </p>
      <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1.5rem' }}>
        <section className="card">
          <h2>Cadastro de vendedores</h2>
          <p style={{ marginTop: '0.25rem', color: 'var(--text-muted)' }}>
            Crie usuários de vendedor para sua equipe. Eles farão login com o código da empresa +
            usuário + senha.
          </p>

          <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: '1rem' }}>
            <div className="form-row">
              <label htmlFor="nome">Nome do vendedor *</label>
              <input
                id="nome"
                type="text"
                value={form.nome}
                onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="username">Usuário (login) *</label>
              <input
                id="username"
                type="text"
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                required
              />
              <small className="form-help">
                Este é o identificador do vendedor dentro da empresa (ex.: joao, maria.vendas).
              </small>
            </div>

            <div className="form-row">
              <label htmlFor="senha">Senha inicial *</label>
              <input
                id="senha"
                type="password"
                value={form.senha}
                onChange={(e) => setForm((prev) => ({ ...prev, senha: e.target.value }))}
                required
                minLength={6}
              />
            </div>

            {error && <div className="form-error" role="alert" aria-live="assertive">{error}</div>}
            {success && <div className="form-success">{success}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Criando...' : 'Criar vendedor'}
            </button>
          </form>
        </section>
      </div>
    </>
  )
}

