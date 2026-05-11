import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { supabaseConfigured, SUPABASE_NOT_CONFIGURED_MESSAGE } from '../lib/supabaseClient'
import { useCrudFormState } from '../hooks/useCrudFormState'
import { PageHeader, StatusPill, LoadingState, EmptyState, DataTable, FormField, type Column } from '../components'
import type { Produto, ProdutoPayload } from '../repositories/produtoRepository'
import {
  listProdutos as repoListProdutos,
  createProduto,
  updateProduto,
  deleteProduto,
} from '../repositories/produtoRepository'

type FormState = {
  id?: string
  codigo: string
  nome: string
  descricao: string
  preco_unitario: string
  ativo: boolean
}

export function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showForm, setShowForm, form, setForm, isEdit, closeForm, handleNovo } =
    useCrudFormState<FormState>(() => ({
      codigo: '',
      nome: '',
      descricao: '',
      preco_unitario: '',
      ativo: true,
    }))

  const carregarProdutos = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!supabaseConfigured) {
      setError(SUPABASE_NOT_CONFIGURED_MESSAGE)
      setLoading(false)
      return
    }

    try {
      const data = await repoListProdutos()
      setProdutos(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar produtos.')
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void carregarProdutos()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [carregarProdutos])

  function handleEdit(produto: Produto) {
    setForm({
      id: produto.id,
      codigo: produto.codigo,
      nome: produto.nome,
      descricao: produto.descricao ?? '',
      preco_unitario: produto.preco_unitario.toString(),
      ativo: produto.ativo,
    })
    setShowForm(true)
  }

  async function handleDelete(produto: Produto) {
    const confirmar = window.confirm(
      `Remover produto "${produto.nome}"? Esta ação não poderá ser desfeita.`,
    )
    if (!confirmar) return

    setSaving(true)
    setError(null)

    try {
      await deleteProduto(produto.id)
      setProdutos((prev) => prev.filter((p) => p.id !== produto.id))
      if (form.id === produto.id) {
        closeForm()
      }
      toast.success(`Produto "${produto.nome}" excluído com sucesso.`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao excluir produto.'
      setError(msg)
      toast.error(msg)
    }

    setSaving(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.nome.trim()) {
      setError('Nome é obrigatório.')
      return
    }

    if (!form.codigo.trim()) {
      setError('Código é obrigatório.')
      return
    }

    const preco = Number(form.preco_unitario.replace(',', '.'))
    if (Number.isNaN(preco) || preco < 0) {
      setError('Preço unitário inválido.')
      return
    }

    setSaving(true)
    setError(null)

    const payload: ProdutoPayload = {
      codigo: form.codigo.trim(),
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      preco_unitario: preco,
      ativo: form.ativo,
    }

    try {
      if (isEdit && form.id) {
        const updated = await updateProduto(form.id, payload)
        setProdutos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        closeForm()
        toast.success('Produto atualizado com sucesso.')
      } else {
        const created = await createProduto(payload)
        setProdutos((prev) => [...prev, created])
        closeForm()
        toast.success('Produto criado com sucesso.')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao salvar produto.'
      setError(msg)
      toast.error(msg)
    }

    setSaving(false)
  }

  const produtoColumns: Column<Produto>[] = [
    { header: 'Código', accessor: (p) => p.codigo },
    {
      header: 'Nome',
      accessor: (p) => (
        <div className="stack-vertical">
          <span>{p.nome}</span>
          {p.descricao && <span className="text-sm text-muted">{p.descricao}</span>}
        </div>
      ),
    },
    { header: 'Preço', accessor: (p) => `R$ ${p.preco_unitario.toFixed(2)}` },
    {
      header: 'Status',
      accessor: (p) => (
        <StatusPill variant={p.ativo ? 'success' : undefined}>
          {p.ativo ? 'Ativo' : 'Inativo'}
        </StatusPill>
      ),
    },
    {
      header: 'Ações',
      shrink: true,
      accessor: (p) => (
        <div className="table-actions">
          <button type="button" className="btn-link" onClick={() => handleEdit(p)} aria-label={`Editar produto ${p.nome}`}>
            Editar
          </button>
          <button
            type="button"
            className="btn-link-danger"
            onClick={() => void handleDelete(p)}
            disabled={saving}
            aria-label={`Excluir produto ${p.nome}`}
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
        title="Produtos"
        subtitle="Catálogo de produtos da empresa. Apenas gerentes podem criar e editar produtos."
        error={error}
      />

      <div className="page-grid">
        {showForm && (
          <section className="card">
            <header className="card-header">
              <h2>{isEdit ? 'Editar produto' : 'Novo produto'}</h2>
            </header>

            <form onSubmit={handleSubmit} className="form-grid">
              <FormField
                label="Código *"
                htmlFor="produto_codigo"
                inputProps={{
                  type: 'text',
                  value: form.codigo,
                  placeholder: 'SCT001',
                  onChange: (e) => setForm((prev) => ({ ...prev, codigo: e.target.value })),
                  required: true,
                }}
              />

              <FormField
                label="Nome *"
                htmlFor="produto_nome"
                inputProps={{
                  type: 'text',
                  value: form.nome,
                  onChange: (e) => setForm((prev) => ({ ...prev, nome: e.target.value })),
                  required: true,
                }}
              />

              <FormField
                as="textarea"
                label="Descrição"
                htmlFor="produto_descricao"
                inputProps={{
                  value: form.descricao,
                  onChange: (e) => setForm((prev) => ({ ...prev, descricao: e.target.value })),
                  rows: 3,
                }}
              />

              <FormField
                label="Preço unitário (R$)"
                htmlFor="produto_preco"
                inputProps={{
                  type: 'number',
                  step: '0.01',
                  min: '0',
                  value: form.preco_unitario,
                  onChange: (e) => setForm((prev) => ({ ...prev, preco_unitario: e.target.value })),
                  required: true,
                }}
              />

              <div className="form-row-inline">
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, ativo: e.target.checked }))
                    }
                  />
                  Produto ativo
                </label>
              </div>

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
                      : 'Criar produto'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="card">
          <header className="card-header card-header-row">
            <h2>Lista de produtos</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleNovo}
              >
                Novo
              </button>
              <span className="badge">{produtos.length}</span>
            </div>
          </header>

          {loading ? (
            <LoadingState message="Carregando produtos..." />
          ) : produtos.length === 0 ? (
            <EmptyState message='Nenhum produto cadastrado ainda. Clique em "Novo" para adicionar o primeiro.' />
          ) : (
            <DataTable columns={produtoColumns} data={produtos} rowKey={(p) => p.id} />
          )}
        </section>
      </div>
    </>
  )
}
