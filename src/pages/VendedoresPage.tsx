import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { useSupabase } from '../lib/useSupabase'
import { parseFunctionsError } from '../lib/errors'
import {
  PageHeader,
  StatusPill,
  LoadingState,
  EmptyState,
  type Column,
  ResponsiveTable,
  type MobileCardConfig,
} from '../components'

type VendedorRow = {
  auth_user_id: string
  username: string
  active: boolean
  nome: string
}

type CriarForm = {
  nome: string
  username: string
  senha: string
}

type EditarForm = {
  auth_user_id: string
  nome: string
}

type SenhaForm = {
  auth_user_id: string
  username: string
  nova: string
  confirmar: string
}

export function VendedoresPage() {
  const supabaseStatus = useSupabase()

  const [vendedores, setVendedores] = useState<VendedorRow[]>([])
  const [loadingList, setLoadingList] = useState(true)

  const [criarForm, setCriarForm] = useState<CriarForm>({ nome: '', username: '', senha: '' })
  const [criando, setCriando] = useState(false)
  const [criarError, setCriarError] = useState<string | null>(null)
  const [criarSuccess, setCriarSuccess] = useState<string | null>(null)

  const [editarForm, setEditarForm] = useState<EditarForm | null>(null)
  const [senhaForm, setSenhaForm] = useState<SenhaForm | null>(null)
  const [saving, setSaving] = useState(false)

  const carregarVendedores = useCallback(async () => {
    if (supabaseStatus.kind !== 'ready') return
    const supabaseClient = supabaseStatus.client
    setLoadingList(true)

    const { data: creds, error: credsError } = await supabaseClient
      .from('vendedor_credentials')
      .select('auth_user_id, username, active')
      .order('username')

    if (credsError) {
      setLoadingList(false)
      return
    }

    const ids = (creds ?? []).map((c) => c.auth_user_id as string).filter(Boolean)

    const { data: profs } =
      ids.length > 0
        ? await supabaseClient.from('profiles').select('user_id, nome').in('user_id', ids)
        : { data: [] as { user_id: string; nome: string }[] }

    setVendedores(
      (creds ?? []).map((c) => ({
        auth_user_id: c.auth_user_id as string,
        username: c.username as string,
        active: (c.active as boolean) ?? true,
        nome:
          (profs ?? []).find((p) => p.user_id === c.auth_user_id)?.nome ??
          (c.username as string),
      })),
    )
    setLoadingList(false)
  }, [supabaseStatus])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void carregarVendedores()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [carregarVendedores])

  async function handleCriar(event: FormEvent) {
    event.preventDefault()
    setCriarError(null)
    setCriarSuccess(null)

    if (!criarForm.nome || !criarForm.username || !criarForm.senha) {
      setCriarError('Preencha todos os campos obrigatórios.')
      return
    }

    if (supabaseStatus.kind !== 'ready') {
      setCriarError(supabaseStatus.message)
      return
    }

    setCriando(true)
    const { error: fnError } = await supabaseStatus.client.functions.invoke('create-vendedor', {
      body: { nome: criarForm.nome, username: criarForm.username, password: criarForm.senha },
    })
    setCriando(false)

    if (fnError) {
      const detail = await parseFunctionsError(fnError)
      setCriarError(detail ?? fnError.message)
      return
    }

    setCriarSuccess('Vendedor criado com sucesso.')
    setCriarForm({ nome: '', username: '', senha: '' })
    void carregarVendedores()
  }

  async function handleAtualizarNome(event: FormEvent) {
    event.preventDefault()
    if (!editarForm?.nome.trim() || supabaseStatus.kind !== 'ready') return

    setSaving(true)
    const { error: fnError } = await supabaseStatus.client.functions.invoke('update-vendedor', {
      body: { vendedor_user_id: editarForm.auth_user_id, nome: editarForm.nome.trim() },
    })
    setSaving(false)

    if (fnError) {
      const detail = await parseFunctionsError(fnError)
      toast.error(detail ?? fnError.message)
      return
    }

    toast.success('Vendedor atualizado.')
    setEditarForm(null)
    void carregarVendedores()
  }

  async function handleAlterarSenha(event: FormEvent) {
    event.preventDefault()
    if (!senhaForm || supabaseStatus.kind !== 'ready') return

    if (senhaForm.nova.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (senhaForm.nova !== senhaForm.confirmar) {
      toast.error('As senhas não coincidem.')
      return
    }

    setSaving(true)
    const { error: fnError } = await supabaseStatus.client.functions.invoke('update-vendedor', {
      body: { vendedor_user_id: senhaForm.auth_user_id, new_password: senhaForm.nova },
    })
    setSaving(false)

    if (fnError) {
      const detail = await parseFunctionsError(fnError)
      toast.error(detail ?? fnError.message)
      return
    }

    toast.success(`Senha de "${senhaForm.username}" alterada com sucesso.`)
    setSenhaForm(null)
  }

  const colunas: Column<VendedorRow>[] = [
    { header: 'Nome', accessor: (v) => v.nome, cellClassName: 'table-cell-wrap' },
    { header: 'Usuário', accessor: (v) => v.username },
    {
      header: 'Status',
      accessor: (v) => (
        <StatusPill variant={v.active ? 'success' : undefined}>
          {v.active ? 'Ativo' : 'Inativo'}
        </StatusPill>
      ),
    },
    {
      header: 'Ações',
      shrink: true,
      accessor: (v) => (
        <div className="table-actions">
          <button
            type="button"
            className="btn-link"
            onClick={() => { setEditarForm({ auth_user_id: v.auth_user_id, nome: v.nome }); setSenhaForm(null) }}
            aria-label={`Editar ${v.nome}`}
          >
            Editar
          </button>
          <button
            type="button"
            className="btn-link"
            onClick={() => { setSenhaForm({ auth_user_id: v.auth_user_id, username: v.username, nova: '', confirmar: '' }); setEditarForm(null) }}
            aria-label={`Alterar senha de ${v.nome}`}
          >
            Senha
          </button>
        </div>
      ),
    },
  ]

  const mobileCard: MobileCardConfig<VendedorRow> = {
    title: (v) => v.nome,
    badge: (v) => (
      <StatusPill variant={v.active ? 'success' : undefined}>
        {v.active ? 'Ativo' : 'Inativo'}
      </StatusPill>
    ),
    fields: [{ label: 'Usuário', value: (v) => v.username }],
    actions: (v) => (
      <>
        <button
          type="button"
          className="btn-link"
          onClick={() => { setEditarForm({ auth_user_id: v.auth_user_id, nome: v.nome }); setSenhaForm(null) }}
        >
          Editar
        </button>
        <button
          type="button"
          className="btn-link"
          onClick={() => { setSenhaForm({ auth_user_id: v.auth_user_id, username: v.username, nova: '', confirmar: '' }); setEditarForm(null) }}
        >
          Senha
        </button>
      </>
    ),
  }

  return (
    <>
      <PageHeader
        title="Vendedores"
        subtitle="Gerencie os vendedores da sua empresa."
      />

      <div className="page-grid">
        <section className="card">
          <header className="card-header">
            <h2>Cadastrar vendedor</h2>
          </header>
          <p style={{ marginTop: '0.25rem', color: 'var(--text-muted)', padding: '0 1.25rem' }}>
            Crie usuários de vendedor para sua equipe. Eles farão login com o código da empresa +
            usuário + senha.
          </p>

          <form onSubmit={handleCriar} className="form-grid">
            <div className="form-row">
              <label htmlFor="nome">Nome do vendedor *</label>
              <input
                id="nome"
                type="text"
                value={criarForm.nome}
                onChange={(e) => setCriarForm((prev) => ({ ...prev, nome: e.target.value }))}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="username">Usuário (login) *</label>
              <input
                id="username"
                type="text"
                value={criarForm.username}
                onChange={(e) => setCriarForm((prev) => ({ ...prev, username: e.target.value }))}
                required
              />
              <small className="form-help">
                Identificador do vendedor (ex.: joao, maria.vendas). Mínimo 3 caracteres.
              </small>
            </div>

            <div className="form-row">
              <label htmlFor="senha">Senha inicial *</label>
              <input
                id="senha"
                type="password"
                value={criarForm.senha}
                onChange={(e) => setCriarForm((prev) => ({ ...prev, senha: e.target.value }))}
                required
                minLength={6}
              />
            </div>

            {criarError && (
              <div className="form-error" role="alert" aria-live="assertive">
                {criarError}
              </div>
            )}
            {criarSuccess && <div className="form-success">{criarSuccess}</div>}

            <div className="form-actions">
              <button type="submit" className="btn-primary-vend" disabled={criando}>
                {criando ? 'Criando...' : 'Criar vendedor'}
              </button>
            </div>
          </form>
        </section>

        {editarForm && (
          <section className="card">
            <header className="card-header">
              <h2>Editar vendedor</h2>
            </header>
            <form onSubmit={handleAtualizarNome} className="form-grid">
              <div className="form-row">
                <label htmlFor="editar_nome">Nome *</label>
                <input
                  id="editar_nome"
                  type="text"
                  value={editarForm.nome}
                  onChange={(e) => setEditarForm((prev) => prev ? { ...prev, nome: e.target.value } : null)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditarForm(null)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </section>
        )}

        {senhaForm && (
          <section className="card">
            <header className="card-header">
              <h2>Alterar senha — {senhaForm.username}</h2>
            </header>
            <form onSubmit={handleAlterarSenha} className="form-grid">
              <div className="form-row">
                <label htmlFor="senha_nova">Nova senha *</label>
                <input
                  id="senha_nova"
                  type="password"
                  autoComplete="new-password"
                  value={senhaForm.nova}
                  onChange={(e) => setSenhaForm((prev) => prev ? { ...prev, nova: e.target.value } : null)}
                  required
                  minLength={6}
                  autoFocus
                />
              </div>
              <div className="form-row">
                <label htmlFor="senha_confirmar">Confirmar nova senha *</label>
                <input
                  id="senha_confirmar"
                  type="password"
                  autoComplete="new-password"
                  value={senhaForm.confirmar}
                  onChange={(e) => setSenhaForm((prev) => prev ? { ...prev, confirmar: e.target.value } : null)}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSenhaForm(null)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Alterando...' : 'Alterar senha'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="card">
          <header className="card-header card-header-row">
            <h2>Lista de vendedores</h2>
            <span className="badge">{vendedores.length}</span>
          </header>

          {loadingList ? (
            <LoadingState message="Carregando vendedores..." />
          ) : vendedores.length === 0 ? (
            <EmptyState message='Nenhum vendedor cadastrado ainda. Use o formulário acima para adicionar o primeiro.' />
          ) : (
            <ResponsiveTable
              columns={colunas}
              data={vendedores}
              rowKey={(v) => v.auth_user_id}
              mobileCard={mobileCard}
            />
          )}
        </section>
      </div>
    </>
  )
}
