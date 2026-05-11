import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getSupabaseClient } from '../lib/supabaseClient'
import {
  isOrcamentoStatus,
  formatarStatusOrcamento,
  getStatusPillClassName,
  type OrcamentoStatus,
} from '../domain/orcamento/status'
import {
  loadOrcamentoReferences,
  loadProfilesDaEmpresaParaFiltro,
  type ClienteRef,
  type ProdutoRef,
} from '../repositories/orcamentoSupabaseRepository'
import { useUserRole } from '../hooks/useUserRole'
import { PageHeader, StatusPill, LoadingState, EmptyState, DataTable, type Column } from '../components'

type OrcamentoRow = {
  id: string
  cliente_nome: string
  status: OrcamentoStatus
  validade_ate: string
  created_at: string
  total: number
  gerado_por_nome: string
}

type OrcamentoClienteRaw = {
  nome?: unknown
}

type OrcamentoListRaw = {
  id?: unknown
  status?: unknown
  validade_ate?: unknown
  created_at?: unknown
  total?: unknown
  created_by_name?: unknown
  clientes?: OrcamentoClienteRaw | OrcamentoClienteRaw[] | null
}

function createdByDisplayName(value: unknown): string {
  if (typeof value !== 'string') {
    return '—'
  }
  const trimmed = value.trim()
  return trimmed === '' ? '—' : trimmed
}

function toOrcamentoRow(row: OrcamentoListRaw): OrcamentoRow {
  const clientes = row.clientes
  const clienteNomeRaw = Array.isArray(clientes) ? clientes[0]?.nome : clientes?.nome
  const clienteNome =
    typeof clienteNomeRaw === 'string' && clienteNomeRaw.length > 0 ? clienteNomeRaw : '—'

  return {
    id: typeof row.id === 'string' ? row.id : '',
    status: isOrcamentoStatus(row.status) ? row.status : 'pendente',
    validade_ate: typeof row.validade_ate === 'string' ? row.validade_ate : '',
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    total: Number(row.total ?? 0),
    cliente_nome: clienteNome,
    gerado_por_nome: createdByDisplayName(row.created_by_name),
  }
}

type Filtros = {
  dataInicio: string
  dataFim: string
  clienteId: string
  produtoId: string
  usuarioId: string
}

const FILTROS_VAZIOS: Filtros = {
  dataInicio: '',
  dataFim: '',
  clienteId: '',
  produtoId: '',
  usuarioId: '',
}

export function OrcamentosPage() {
  const { role } = useUserRole()
  const [orcamentos, setOrcamentos] = useState<OrcamentoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [clientes, setClientes] = useState<ClienteRef[]>([])
  const [produtos, setProdutos] = useState<ProdutoRef[]>([])
  const [usuariosFiltro, setUsuariosFiltro] = useState<{ user_id: string; nome: string }[]>([])

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS)
  const [filtrosAplicados, setFiltrosAplicados] = useState<Filtros>(FILTROS_VAZIOS)

  useEffect(() => {
    if (role !== 'gerente') {
      setUsuariosFiltro([])
      return
    }
    let cancelled = false
    void loadProfilesDaEmpresaParaFiltro()
      .then((list) => {
        if (!cancelled) setUsuariosFiltro(list)
      })
      .catch(() => {
        if (!cancelled) setUsuariosFiltro([])
      })
    return () => {
      cancelled = true
    }
  }, [role])

  useEffect(() => {
    if (role === 'vendedor') {
      setFiltros((prev) => (prev.usuarioId ? { ...prev, usuarioId: '' } : prev))
      setFiltrosAplicados((prev) => (prev.usuarioId ? { ...prev, usuarioId: '' } : prev))
    }
  }, [role])

  useEffect(() => {
    loadOrcamentoReferences()
      .then(({ clientes: c, produtos: p }) => {
        setClientes(c)
        setProdutos(p)
      })
      .catch(() => {
        /* filtros ficam vazios */
      })
  }, [])

  const carregarOrcamentos = useCallback(async (f: Filtros) => {
    setLoading(true)
    setError(null)

    const { client: supabaseClient, error: configError } = getSupabaseClient()
    if (!supabaseClient) {
      setError(configError)
      setLoading(false)
      return
    }

    try {
      let orcamentoIdsFromProduto: string[] | null = null

      if (f.produtoId) {
        const { data: itensData, error: itensErr } = await supabaseClient
          .from('orcamento_itens')
          .select('orcamento_id')
          .eq('produto_id', f.produtoId)

        if (itensErr) {
          setError(itensErr.message)
          setLoading(false)
          return
        }

        orcamentoIdsFromProduto = [
          ...new Set((itensData ?? []).map((r) => r.orcamento_id as string)),
        ]

        if (orcamentoIdsFromProduto.length === 0) {
          setOrcamentos([])
          setLoading(false)
          return
        }
      }

      let query = supabaseClient
        .from('orcamentos')
        .select(
          `
          id,
          status,
          validade_ate,
          created_at,
          total,
          created_by_name,
          clientes!inner ( nome )
        `,
        )
        .order('created_at', { ascending: false })

      if (f.dataInicio) {
        query = query.gte('created_at', `${f.dataInicio}T00:00:00`)
      }
      if (f.dataFim) {
        query = query.lte('created_at', `${f.dataFim}T23:59:59`)
      }
      if (f.clienteId) {
        query = query.eq('cliente_id', f.clienteId)
      }
      if (f.usuarioId) {
        query = query.eq('created_by_user_id', f.usuarioId)
      }
      if (orcamentoIdsFromProduto) {
        query = query.in('id', orcamentoIdsFromProduto)
      }

      const { data, error: err } = await query

      if (err) {
        setError(err.message)
      } else {
        setOrcamentos(
          (data ?? []).map((row) => toOrcamentoRow((row ?? {}) as OrcamentoListRaw)),
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido.')
    }

    setLoading(false)
  }, [])

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

  const orcamentoColumns: Column<OrcamentoRow>[] = [
    { header: 'Nº', accessor: (o) => o.id.slice(0, 8).toUpperCase() },
    { header: 'Cliente', accessor: (o) => o.cliente_nome },
    { header: 'Gerado por', accessor: (o) => o.gerado_por_nome },
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
      accessor: (o) => new Date(o.validade_ate).toLocaleDateString('pt-BR'),
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
