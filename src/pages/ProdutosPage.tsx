import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { matchesSearch } from '../lib/searchNormalize'
import { useAuthSession } from '../auth/useAuthSession'
import { formatCurrencyBRL } from '../domain/financeiro/moeda'
import { supabaseConfigured, SUPABASE_NOT_CONFIGURED_MESSAGE } from '../lib/supabaseClient'
import { useCrudFormState } from '../hooks/useCrudFormState'
import { useCrudResource } from '../hooks/useCrudResource'
import { PageHeader, StatusPill, LoadingState, EmptyState, FormField, type Column, ResponsiveTable, type MobileCardConfig } from '../components'
import type { Produto, ProdutoPayload } from '../repositories/produtoRepository'
import { produtoRepo } from '../repositories/produtoRepository'

type FormState = {
  id?: string
  codigo: string
  nome: string
  descricao: string
  preco_unitario: string
  ativo: boolean
}

export function ProdutosPage() {
  const { role } = useAuthSession()
  const readOnly = role === 'vendedor'

  const {
    items: produtos,
    loading,
    saving,
    error,
    setError,
    create,
    update,
    remove,
  } = useCrudResource(produtoRepo, {
    isConfigured: () => supabaseConfigured,
    notConfiguredMessage: SUPABASE_NOT_CONFIGURED_MESSAGE,
    loadErrorFallback: 'Erro ao carregar produtos.',
    sortItems: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
  })

  const [filtroBusca, setFiltroBusca] = useState('')

  const produtosFiltrados = useMemo(
    () =>
      produtos.filter(
        (p) =>
          matchesSearch(p.nome, filtroBusca) || matchesSearch(p.codigo, filtroBusca),
      ),
    [produtos, filtroBusca],
  )

  const { showForm, setShowForm, form, setForm, isEdit, closeForm, handleNovo } =
    useCrudFormState<FormState>(() => ({
      codigo: '',
      nome: '',
      descricao: '',
      preco_unitario: '',
      ativo: true,
    }))

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

    try {
      await remove(produto.id)
      if (form.id === produto.id) {
        closeForm()
      }
      toast.success(`Produto "${produto.nome}" excluído com sucesso.`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao excluir produto.'
      toast.error(msg)
    }
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

    const payload: ProdutoPayload = {
      codigo: form.codigo.trim(),
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      preco_unitario: preco,
      ativo: form.ativo,
    }

    try {
      if (isEdit && form.id) {
        await update(form.id, payload)
        closeForm()
        toast.success('Produto atualizado com sucesso.')
      } else {
        await create(payload)
        closeForm()
        toast.success('Produto criado com sucesso.')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao salvar produto.'
      toast.error(msg)
    }
  }

  const produtoMobileCard: MobileCardConfig<Produto> = {
    title: (p) => p.nome,
    meta: (p) => p.descricao ?? undefined,
    badge: (p) => (
      <StatusPill variant={p.ativo ? 'success' : undefined}>
        {p.ativo ? 'Ativo' : 'Inativo'}
      </StatusPill>
    ),
    fields: [
      { label: 'Código', value: (p) => p.codigo },
      { label: 'Preço', value: (p) => formatCurrencyBRL(p.preco_unitario) },
    ],
    actions: readOnly
      ? undefined
      : (p) => (
          <>
            <button
              type="button"
              className="btn-link"
              onClick={() => handleEdit(p)}
              aria-label={`Editar produto ${p.nome}`}
            >
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
          </>
        ),
  }

  const produtoColumns: Column<Produto>[] = [
    { header: 'Código', accessor: (p) => p.codigo },
    {
      header: 'Nome',
      cellClassName: 'table-cell-wrap',
      accessor: (p) => (
        <div className="stack-vertical">
          <span>{p.nome}</span>
          {p.descricao && <span className="text-sm text-muted">{p.descricao}</span>}
        </div>
      ),
    },
    { header: 'Preço', accessor: (p) => formatCurrencyBRL(p.preco_unitario) },
    {
      header: 'Status',
      accessor: (p) => (
        <StatusPill variant={p.ativo ? 'success' : undefined}>
          {p.ativo ? 'Ativo' : 'Inativo'}
        </StatusPill>
      ),
    },
    ...(readOnly
      ? []
      : [
          {
            header: 'Ações',
            shrink: true,
            accessor: (p: Produto) => (
              <div className="table-actions">
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => handleEdit(p)}
                  aria-label={`Editar produto ${p.nome}`}
                >
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
          } satisfies Column<Produto>,
        ]),
  ]

  return (
    <>
      <PageHeader
        title="Produtos"
        subtitle={
          readOnly
            ? 'Catálogo de produtos da empresa. Apenas o gerente pode alterar produtos.'
            : 'Catálogo de produtos da empresa. Apenas gerentes podem criar e editar produtos.'
        }
        error={error}
      />

      <div className="page-grid">
        {!readOnly && showForm && (
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
                    onChange={(e) => setForm((prev) => ({ ...prev, ativo: e.target.checked }))}
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
                  {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar produto'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="card">
          <header className="card-header card-header-row">
            <h2>Lista de produtos</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {!readOnly && (
                <button type="button" className="btn-primary" onClick={handleNovo}>
                  Novo
                </button>
              )}
              <span className="badge">{produtosFiltrados.length}</span>
              {filtroBusca.trim() && produtos.length > 0 ? (
                <span className="text-sm text-muted">de {produtos.length}</span>
              ) : null}
            </div>
          </header>

          {loading ? (
            <LoadingState message="Carregando produtos..." />
          ) : produtos.length === 0 ? (
            <EmptyState
              message={
                readOnly
                  ? 'Nenhum produto cadastrado.'
                  : 'Nenhum produto cadastrado ainda. Clique em "Novo" para adicionar o primeiro.'
              }
            />
          ) : (
            <>
              <div className="filters-bar" style={{ marginBottom: '1rem' }}>
                <div className="form-row">
                  <label htmlFor="produtos-busca">Buscar</label>
                  <input
                    id="produtos-busca"
                    type="search"
                    className="input-control"
                    value={filtroBusca}
                    onChange={(e) => setFiltroBusca(e.target.value)}
                    placeholder="Buscar por nome ou código/SKU..."
                    aria-label="Buscar produtos por nome ou código"
                  />
                </div>
              </div>

              {produtosFiltrados.length === 0 ? (
                <EmptyState message="Nenhum produto encontrado para esta busca. Ajuste o termo ou limpe o filtro." />
              ) : (
                <ResponsiveTable columns={produtoColumns} data={produtosFiltrados} rowKey={(p) => p.id} mobileCard={produtoMobileCard} />
              )}
            </>
          )}
        </section>
      </div>
    </>
  )
}
