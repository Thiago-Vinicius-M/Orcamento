import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { matchesSearch } from '../lib/searchNormalize'
import { supabaseConfigured, SUPABASE_NOT_CONFIGURED_MESSAGE } from '../lib/supabaseClient'
import { useCrudFormState } from '../hooks/useCrudFormState'
import { useCrudResource } from '../hooks/useCrudResource'
import { PageHeader, LoadingState, EmptyState, DataTable, FormField, type Column } from '../components'
import type { Cliente, ClientePayload } from '../repositories/clienteRepository'
import { clienteRepo } from '../repositories/clienteRepository'

type FormState = {
  id?: string
  nome: string
  documento: string
  email: string
  telefone: string
  endereco: string
}

export function ClientesPage() {
  const {
    items: clientes,
    loading,
    saving,
    error,
    setError,
    create,
    update,
    remove,
  } = useCrudResource(clienteRepo, {
    isConfigured: () => supabaseConfigured,
    notConfiguredMessage: SUPABASE_NOT_CONFIGURED_MESSAGE,
    loadErrorFallback: 'Erro ao carregar clientes.',
    sortItems: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
  })

  const [filtroBusca, setFiltroBusca] = useState('')

  const clientesFiltrados = useMemo(
    () =>
      clientes.filter(
        (c) =>
          matchesSearch(c.nome, filtroBusca) ||
          matchesSearch(c.documento ?? '', filtroBusca),
      ),
    [clientes, filtroBusca],
  )

  const { showForm, setShowForm, form, setForm, isEdit, closeForm, handleNovo } =
    useCrudFormState<FormState>(() => ({
      nome: '',
      documento: '',
      email: '',
      telefone: '',
      endereco: '',
    }))

  function handleEdit(cliente: Cliente) {
    setForm({
      id: cliente.id,
      nome: cliente.nome,
      documento: cliente.documento ?? '',
      email: cliente.email ?? '',
      telefone: cliente.telefone ?? '',
      endereco: cliente.endereco ?? '',
    })
    setShowForm(true)
  }

  async function handleDelete(cliente: Cliente) {
    const confirmar = window.confirm(
      `Remover cliente "${cliente.nome}"? Esta ação não poderá ser desfeita.`,
    )
    if (!confirmar) return

    try {
      await remove(cliente.id)
      if (form.id === cliente.id) {
        closeForm()
      }
      toast.success(`Cliente "${cliente.nome}" excluído com sucesso.`)
    } catch {
      toast.error('Falha ao excluir cliente.')
    }
  }

  function buildPayload(): ClientePayload {
    return {
      nome: form.nome.trim(),
      documento: form.documento.trim() || null,
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      endereco: form.endereco.trim() || null,
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.nome.trim()) {
      setError('Nome é obrigatório.')
      return
    }

    const payload = buildPayload()

    try {
      if (isEdit && form.id) {
        await update(form.id, payload)
        closeForm()
        toast.success('Cliente atualizado com sucesso.')
      } else {
        await create(payload)
        closeForm()
        toast.success('Cliente criado com sucesso.')
      }
    } catch {
      toast.error('Falha ao salvar cliente.')
    }
  }

  const clienteColumns: Column<Cliente>[] = [
    { header: 'Nome', accessor: (c) => c.nome, cellClassName: 'table-cell-wrap' },
    { header: 'Documento', accessor: (c) => c.documento ?? '—' },
    {
      header: 'Contato',
      cellClassName: 'table-cell-wrap',
      accessor: (c) => (
        <div className="stack-vertical">
          {c.email && <span className="text-sm text-muted">{c.email}</span>}
          {c.telefone && <span className="text-sm text-muted">Tel: {c.telefone}</span>}
        </div>
      ),
    },
    {
      header: 'Ações',
      shrink: true,
      accessor: (c) => (
        <div className="table-actions">
          <button type="button" className="btn-link" onClick={() => handleEdit(c)} aria-label={`Editar cliente ${c.nome}`}>
            Editar
          </button>
          <button
            type="button"
            className="btn-link-danger"
            onClick={() => void handleDelete(c)}
            disabled={saving}
            aria-label={`Excluir cliente ${c.nome}`}
          >
            Excluir
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Cadastro e gestão de clientes da empresa."
        error={error}
      />

      <div className="page-grid">
        {showForm && (
          <section className="card">
            <header className="card-header">
              <h2>{isEdit ? 'Editar cliente' : 'Novo cliente'}</h2>
            </header>

            <form onSubmit={handleSubmit} className="form-grid">
              <FormField
                label="Nome *"
                htmlFor="cliente_nome"
                inputProps={{
                  type: 'text',
                  value: form.nome,
                  onChange: (e) => setForm((prev) => ({ ...prev, nome: e.target.value })),
                  required: true,
                }}
              />

              <FormField
                label="Documento"
                htmlFor="cliente_documento"
                inputProps={{
                  type: 'text',
                  value: form.documento,
                  onChange: (e) => setForm((prev) => ({ ...prev, documento: e.target.value })),
                  placeholder: 'CPF ou CNPJ',
                }}
              />

              <FormField
                label="E-mail"
                htmlFor="cliente_email"
                inputProps={{
                  type: 'email',
                  value: form.email,
                  onChange: (e) => setForm((prev) => ({ ...prev, email: e.target.value })),
                }}
              />

              <FormField
                label="Telefone"
                htmlFor="cliente_telefone"
                inputProps={{
                  type: 'tel',
                  value: form.telefone,
                  onChange: (e) => setForm((prev) => ({ ...prev, telefone: e.target.value })),
                }}
              />

              <FormField
                as="textarea"
                label="Endereço"
                htmlFor="cliente_endereco"
                inputProps={{
                  value: form.endereco,
                  onChange: (e) => setForm((prev) => ({ ...prev, endereco: e.target.value })),
                  rows: 3,
                }}
              />

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary-new-client"
                  onClick={closeForm}
                  disabled={saving}
                >
                  {isEdit ? 'Cancelar edição' : 'Cancelar'}
                </button>

                <button type="submit" className="btn-primary-new-client" disabled={saving}>
                  {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar cliente'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="card">
          <header className="card-header card-header-row">
            <h2>Lista de clientes</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn-primary" onClick={handleNovo}>
                Novo
              </button>
              <span className="badge">{clientesFiltrados.length}</span>
              {filtroBusca.trim() && clientes.length > 0 ? (
                <span className="text-sm text-muted">de {clientes.length}</span>
              ) : null}
            </div>
          </header>

          {loading ? (
            <LoadingState message="Carregando clientes..." />
          ) : clientes.length === 0 ? (
            <EmptyState message='Nenhum cliente cadastrado ainda. Clique em "Novo" para adicionar o primeiro.' />
          ) : (
            <>
              <div className="filters-bar" style={{ marginBottom: '1rem' }}>
                <div className="form-row">
                  <label htmlFor="clientes-busca">Buscar</label>
                  <input
                    id="clientes-busca"
                    type="search"
                    className="input-control"
                    value={filtroBusca}
                    onChange={(e) => setFiltroBusca(e.target.value)}
                    placeholder="Buscar por nome ou CPF/CNPJ..."
                    aria-label="Buscar clientes por nome ou documento"
                  />
                </div>
              </div>

              {clientesFiltrados.length === 0 ? (
                <EmptyState message="Nenhum cliente encontrado para esta busca. Ajuste o termo ou limpe o filtro." />
              ) : (
                <DataTable columns={clienteColumns} data={clientesFiltrados} rowKey={(c) => c.id} />
              )}
            </>
          )}
        </section>
      </div>
    </>
  )
}
