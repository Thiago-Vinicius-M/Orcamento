import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { supabaseConfigured, SUPABASE_NOT_CONFIGURED_MESSAGE } from '../lib/supabaseClient'
import { useCrudFormState } from '../hooks/useCrudFormState'
import { PageHeader, LoadingState, EmptyState, DataTable, FormField, type Column } from '../components'
import type { Cliente, ClientePayload } from '../repositories/clienteRepository'
import {
  listClientes as repoListClientes,
  createCliente,
  updateCliente,
  deleteCliente,
} from '../repositories/clienteRepository'

type FormState = {
  id?: string
  nome: string
  documento: string
  email: string
  telefone: string
  endereco: string
}

export function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showForm, setShowForm, form, setForm, isEdit, resetForm, closeForm, handleNovo } =
    useCrudFormState<FormState>(() => ({
      nome: '',
      documento: '',
      email: '',
      telefone: '',
      endereco: '',
    }))

  const carregarClientes = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!supabaseConfigured) {
      setError(SUPABASE_NOT_CONFIGURED_MESSAGE)
      setLoading(false)
      return
    }

    try {
      const data = await repoListClientes()
      setClientes(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar clientes.')
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void carregarClientes()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [carregarClientes])

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

    setSaving(true)
    setError(null)

    try {
      await deleteCliente(cliente.id)
      setClientes((prev) => prev.filter((c) => c.id !== cliente.id))
      if (form.id === cliente.id) {
        closeForm()
      }
      toast.success(`Cliente "${cliente.nome}" excluído com sucesso.`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao excluir cliente.'
      setError(msg)
      toast.error('Falha ao excluir cliente.')
    }

    setSaving(false)
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

    setSaving(true)
    setError(null)
    const payload = buildPayload()

    try {
      if (isEdit && form.id) {
        const updated = await updateCliente(form.id, payload)
        setClientes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        resetForm()
        setShowForm(false)
        toast.success('Cliente atualizado com sucesso.')
      } else {
        const created = await createCliente(payload)
        setClientes((prev) => [...prev, created])
        resetForm()
        setShowForm(false)
        toast.success('Cliente criado com sucesso.')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao salvar cliente.'
      setError(msg)
      toast.error('Falha ao salvar cliente.')
    }

    setSaving(false)
  }

  const clienteColumns: Column<Cliente>[] = [
    { header: 'Nome', accessor: (c) => c.nome },
    { header: 'Documento', accessor: (c) => c.documento ?? '—' },
    {
      header: 'Contato',
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
                  className="btn-secondary"
                  onClick={closeForm}
                  disabled={saving}
                >
                  {isEdit ? 'Cancelar edição' : 'Cancelar'}
                </button>

                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving
                    ? 'Salvando...'
                    : isEdit
                      ? 'Salvar alterações'
                      : 'Criar cliente'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="card">
          <header className="card-header card-header-row">
            <h2>Lista de clientes</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button type="button" className="btn-primary" onClick={handleNovo}>
                Novo
              </button>
              <span className="badge">{clientes.length}</span>
            </div>
          </header>

          {loading ? (
            <LoadingState message="Carregando clientes..." />
          ) : clientes.length === 0 ? (
            <EmptyState message='Nenhum cliente cadastrado ainda. Clique em "Novo" para adicionar o primeiro.' />
          ) : (
            <DataTable columns={clienteColumns} data={clientes} rowKey={(c) => c.id} />
          )}
        </section>
      </div>
    </>
  )
}
