import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { formatarStatusOrcamento, getStatusPillClassName } from '../domain/orcamento/status'
import { toOrcamentoListRow, type OrcamentoListRow } from '../domain/orcamento/mappers'
import {
  listOrcamentosComFiltrosWithClient,
  loadOrcamentoReferencesWithClient,
  type OrcamentosListFiltros,
  type ClienteRef,
  type ProdutoRef,
} from '../repositories/orcamento/orcamentoReadRepo'
import { loadProfilesDaEmpresaParaFiltroWithClient } from '../repositories/orcamento/profileRepo'
import { useSupabase } from '../lib/useSupabase'
import { useUserRole } from '../hooks/useUserRole'
import { PageHeader, StatusPill, LoadingState, EmptyState, DataTable, type Column } from '../components'

const FILTROS_VAZIOS: OrcamentosListFiltros = {
  dataInicio: '',
  dataFim: '',
  clienteId: '',
  produtoId: '',
  usuarioId: '',
}

export function OrcamentosPage() {
  const supaStatus = useSupabase()
  const { role } = useUserRole()
  const [orcamentos, setOrcamentos] = useState<OrcamentoListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [clientes, setClientes] = useState<ClienteRef[]>([])
  const [produtos, setProdutos] = useState<ProdutoRef[]>([])
  const [usuariosFiltro, setUsuariosFiltro] = useState<{ user_id: string; nome: string }[]>([])

  const [filtros, setFiltros] = useState<OrcamentosListFiltros>(FILTROS_VAZIOS)
  const [filtrosAplicados, setFiltrosAplicados] = useState<OrcamentosListFiltros>(FILTROS_VAZIOS)

  useEffect(() => {
    if (role !== 'gerente') {
      queueMicrotask(() => {
        setUsuariosFiltro([])
      })
      return
    }
    if (supaStatus.kind !== 'ready') {
      return
    }
    const client = supaStatus.client
    let cancelled = false
    void loadProfilesDaEmpresaParaFiltroWithClient(client)
      .then((list) => {
        if (!cancelled) setUsuariosFiltro(list)
      })
      .catch(() => {
        if (!cancelled) setUsuariosFiltro([])
      })
    return () => {
      cancelled = true
    }
  }, [role, supaStatus])

  useEffect(() => {
    if (role === 'vendedor') {
      queueMicrotask(() => {
        setFiltros((prev) => (prev.usuarioId ? { ...prev, usuarioId: '' } : prev))
        setFiltrosAplicados((prev) => (prev.usuarioId ? { ...prev, usuarioId: '' } : prev))
      })
    }
  }, [role])

  useEffect(() => {
    if (supaStatus.kind !== 'ready') {
      return
    }
    const client = supaStatus.client
    loadOrcamentoReferencesWithClient(client)
      .then(({ clientes: c, produtos: p }) => {
        setClientes(c)
        setProdutos(p)
      })
      .catch(() => {
        /* filtros ficam vazios */
      })
  }, [supaStatus])

  const carregarOrcamentos = useCallback(
    async (f: OrcamentosListFiltros) => {
      setLoading(true)
      setError(null)

      if (supaStatus.kind !== 'ready') {
        setError(supaStatus.message)
        setLoading(false)
        return
      }

      try {
        const rows = await listOrcamentosComFiltrosWithClient(supaStatus.client, f)
        setOrcamentos(rows.map((row) => toOrcamentoListRow(row)))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro desconhecido.')
      }

      setLoading(false)
    },
    [supaStatus],
  )

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void carregarOrcamentos(filtrosAplicados)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [filtrosAplicados, carregarOrcamentos])

  function aplicarFiltros() {
    setFiltrosAplicados({ ...filtros })
  }

  function limparFiltros() {
    setFiltros(FILTROS_VAZIOS)
    setFiltrosAplicados(FILTROS_VAZIOS)
  }

  const temFiltrosAtivos =
    filtrosAplicados.dataInicio !== '' ||
    filtrosAplicados.dataFim !== '' ||
    filtrosAplicados.clienteId !== '' ||
    filtrosAplicados.produtoId !== '' ||
    filtrosAplicados.usuarioId !== ''

  const orcamentoColumns: Column<OrcamentoListRow>[] = [
    { header: 'Nº', accessor: (o) => o.id.slice(0, 8).toUpperCase() },
    { header: 'Cliente', accessor: (o) => o.cliente_nome, cellClassName: 'table-cell-wrap' },
    { header: 'Gerado por', accessor: (o) => o.gerado_por_nome, cellClassName: 'table-cell-wrap' },
    {
      header: 'Status',
      accessor: (o) => (
        <StatusPill variant={getStatusPillClassName(o.status)}>
          {formatarStatusOrcamento(o.status)}
        </StatusPill>
      ),
    },
    {
      header: 'Criado em',
      accessor: (o) =>
        o.created_at ? new Date(o.created_at).toLocaleDateString('pt-BR') : '—',
    },
    {
      header: 'Validade até',
      accessor: (o) =>
        o.validade_ate
          ? new Date(o.validade_ate).toLocaleDateString('pt-BR')
          : '—',
    },
    { header: 'Total (R$)', accessor: (o) => `R$ ${o.total.toFixed(2)}` },
    {
      header: 'Ações',
      shrink: true,
      accessor: (o) => (
        <div className="table-actions">
          <Link className="btn-link" to={`/orcamentos/${o.id}`}>
            Detalhes
          </Link>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Orçamentos"
        subtitle="Todos os orçamentos que você pode acessar, de acordo com seu perfil (gerente ou vendedor)."
        error={error}
      />

      <div className="filters-bar" style={{ marginTop: '1rem' }}>
        <div className="form-row">
          <label htmlFor="filtro-data-inicio">Data início</label>
          <input
            id="filtro-data-inicio"
            type="date"
            value={filtros.dataInicio}
            onChange={(e) => setFiltros((prev) => ({ ...prev, dataInicio: e.target.value }))}
          />
        </div>

        <div className="form-row">
          <label htmlFor="filtro-data-fim">Data fim</label>
          <input
            id="filtro-data-fim"
            type="date"
            value={filtros.dataFim}
            onChange={(e) => setFiltros((prev) => ({ ...prev, dataFim: e.target.value }))}
          />
        </div>

        <div className="form-row">
          <label htmlFor="filtro-cliente">Cliente</label>
          <select
            id="filtro-cliente"
            value={filtros.clienteId}
            onChange={(e) => setFiltros((prev) => ({ ...prev, clienteId: e.target.value }))}
          >
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label htmlFor="filtro-produto">Produto</label>
          <select
            id="filtro-produto"
            value={filtros.produtoId}
            onChange={(e) => setFiltros((prev) => ({ ...prev, produtoId: e.target.value }))}
          >
            <option value="">Todos</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>

        {role === 'gerente' && (
          <div className="form-row">
            <label htmlFor="filtro-gerado-por">Gerado por</label>
            <select
              id="filtro-gerado-por"
              value={filtros.usuarioId}
              onChange={(e) => setFiltros((prev) => ({ ...prev, usuarioId: e.target.value }))}
            >
              <option value="">Todos</option>
              {usuariosFiltro.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filters-actions">
          <button className="btn-filter btn-filter-primary" onClick={aplicarFiltros}>
            Filtrar
          </button>
          {temFiltrosAtivos && (
            <button className="btn-filter" onClick={limparFiltros}>
              Limpar
            </button>
          )}
        </div>
      </div>

      <section className="card" style={{ marginTop: '1rem' }}>
        <header className="card-header card-header-row">
          <h2>Lista de orçamentos</h2>
          <span className="badge">{orcamentos.length}</span>
        </header>

        {loading ? (
          <LoadingState message="Carregando orçamentos..." />
        ) : orcamentos.length === 0 ? (
          <EmptyState
            message={
              temFiltrosAtivos
                ? 'Nenhum orçamento encontrado com os filtros selecionados.'
                : 'Nenhum orçamento cadastrado ainda. Clique em "+ Novo Orçamento" no topo para criar o primeiro.'
            }
          />
        ) : (
          <DataTable columns={orcamentoColumns} data={orcamentos} rowKey={(o) => o.id} />
        )}
      </section>
    </>
  )
}
