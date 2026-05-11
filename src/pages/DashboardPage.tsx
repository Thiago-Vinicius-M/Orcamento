import { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import { formatCurrencyBRL } from '../domain/financeiro/moeda'
import { formatarStatusOrcamento, getStatusPillClassName } from '../domain/orcamento/status'
import { toOrcamentoListRow, type OrcamentoListRow, type OrcamentoRawRow } from '../domain/orcamento/mappers'
import { PageHeader, StatusPill, LoadingState, EmptyState, DataTable, type Column } from '../components'

type OrcamentoResumo = {
  status: unknown
  total: number
}

type DashboardStatus = 'pendente' | 'vigente' | 'reprovado' | 'cancelado'

const dashboardStatuses: readonly DashboardStatus[] = ['pendente', 'vigente', 'reprovado', 'cancelado'] as const

function isDashboardStatus(value: unknown): value is DashboardStatus {
  return typeof value === 'string' && (dashboardStatuses as readonly string[]).includes(value)
}

type DashboardMetrics = {
  countByStatus: Record<DashboardStatus, number>
  totalPendentes: number
  totalVigentes: number
  totalGeral: number
}

type OrcamentoResumoRaw = {
  status?: unknown
  total?: unknown
}

function toOrcamentoResumo(row: OrcamentoResumoRaw): OrcamentoResumo {
  return {
    status: row.status,
    total: Number(row.total ?? 0),
  }
}

const initialMetrics: DashboardMetrics = {
  countByStatus: {
    pendente: 0,
    vigente: 0,
    reprovado: 0,
    cancelado: 0,
  },
  totalPendentes: 0,
  totalVigentes: 0,
  totalGeral: 0,
}

export function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orcamentosPendentes, setOrcamentosPendentes] = useState<OrcamentoListRow[]>([])
  const [loadingPendentes, setLoadingPendentes] = useState(false)
  const [errorPendentes, setErrorPendentes] = useState<string | null>(null)
  const [orcamentosVigentes, setOrcamentosVigentes] = useState<OrcamentoListRow[]>([])
  const [loadingVigentes, setLoadingVigentes] = useState(false)
  const [errorVigentes, setErrorVigentes] = useState<string | null>(null)

  const carregar = useCallback(async (isCancelled: () => boolean) => {
    if (isCancelled()) return
    setLoading(true)
    setError(null)

    const { client: supabaseClient, error: configError } = getSupabaseClient()
    if (!supabaseClient) {
      if (isCancelled()) return
      setError(configError)
      setLoading(false)
      return
    }

    const { data, error: err } = await supabaseClient
      .from('orcamentos')
      .select('status, total')
      .in('status', ['pendente', 'vigente', 'reprovado', 'cancelado'])

    if (isCancelled()) return

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const rows: OrcamentoResumo[] = (data ?? []).map((row) => toOrcamentoResumo((row ?? {}) as OrcamentoResumoRaw))

    const next: DashboardMetrics = {
      countByStatus: {
        pendente: 0,
        vigente: 0,
        reprovado: 0,
        cancelado: 0,
      },
      totalPendentes: 0,
      totalVigentes: 0,
      totalGeral: 0,
    }

    for (const row of rows) {
      if (!isDashboardStatus(row.status)) continue

      next.countByStatus[row.status] += 1
      next.totalGeral += row.total

      if (row.status === 'pendente') {
        next.totalPendentes += row.total
      }

      if (row.status === 'vigente') {
        next.totalVigentes += row.total
      }
    }

    if (isCancelled()) return
    setMetrics(next)
    setLoading(false)
  }, [])

  const carregarPendentes = useCallback(async (isCancelled: () => boolean) => {
    if (isCancelled()) return
    setLoadingPendentes(true)
    setErrorPendentes(null)

    const { client: supabaseClient, error: configError } = getSupabaseClient()
    if (!supabaseClient) {
      if (isCancelled()) return
      setErrorPendentes(configError)
      setLoadingPendentes(false)
      return
    }

    const { data, error: err } = await supabaseClient
      .from('orcamentos')
      .select(
        `
          id,
          status,
          created_at,
          total,
          created_by_user_id,
          created_by_name,
          clientes!inner ( nome )
        `,
      )
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })

    if (isCancelled()) return

    if (err) {
      setErrorPendentes(err.message)
      setLoadingPendentes(false)
      return
    }

    const rows = (data ?? []).map((row) => toOrcamentoListRow((row ?? {}) as OrcamentoRawRow, 'pendente'))

    if (isCancelled()) return
    setOrcamentosPendentes(rows)
    setLoadingPendentes(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    const timeout = window.setTimeout(() => {
      void carregar(() => cancelled)
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [carregar])

  const carregarVigentes = useCallback(async (isCancelled: () => boolean) => {
    if (isCancelled()) return
    setLoadingVigentes(true)
    setErrorVigentes(null)

    const { client: supabaseClient, error: configError } = getSupabaseClient()
    if (!supabaseClient) {
      if (isCancelled()) return
      setErrorVigentes(configError)
      setLoadingVigentes(false)
      return
    }

    const { data, error: err } = await supabaseClient
      .from('orcamentos')
      .select(
        `
          id,
          status,
          created_at,
          total,
          created_by_user_id,
          created_by_name,
          clientes!inner ( nome )
        `,
      )
      .eq('status', 'vigente')
      .order('created_at', { ascending: false })

    if (isCancelled()) return

    if (err) {
      setErrorVigentes(err.message)
      setLoadingVigentes(false)
      return
    }

    const rows = (data ?? []).map((row) => toOrcamentoListRow((row ?? {}) as OrcamentoRawRow, 'vigente'))

    if (isCancelled()) return
    setOrcamentosVigentes(rows)
    setLoadingVigentes(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    const timeout = window.setTimeout(() => {
      void carregarPendentes(() => cancelled)
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [carregarPendentes])

  useEffect(() => {
    let cancelled = false
    const timeout = window.setTimeout(() => {
      void carregarVigentes(() => cancelled)
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [carregarVigentes])

  const combinedError = [error, errorPendentes, errorVigentes].filter(Boolean).join(' | ') || null

  const pendentesColumns: Column<OrcamentoListRow>[] = [
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
    { header: 'Criado em', accessor: (o) => new Date(o.created_at).toLocaleDateString('pt-BR') },
    { header: 'Total (R$)', accessor: (o) => `R$ ${o.total.toFixed(2)}` },
    {
      header: 'Ações',
      shrink: true,
      accessor: (o) => (
        <div className="table-actions">
          <Link className="btn-link" to={`/orcamentos/${o.id}`}>Detalhes</Link>
        </div>
      ),
    },
  ]

  const vigentesColumns: Column<OrcamentoListRow>[] = [
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
    { header: 'Criado em', accessor: (o) => new Date(o.created_at).toLocaleDateString('pt-BR') },
    { header: 'Total (R$)', accessor: (o) => `R$ ${o.total.toFixed(2)}` },
    {
      header: 'Ações',
      shrink: true,
      accessor: (o) => (
        <div className="table-actions">
          <Link className="btn-link" to={`/orcamentos/${o.id}`}>Detalhes</Link>
        </div>
      ),
    },
  ]

  return (
    <>
      <header className="dashboard-page__header">
        <PageHeader
          title="Dashboard"
          subtitle="Visão geral dos orçamentos e indicadores por status, com totais em R$."
          error={combinedError}
        />
      </header>

      <section className="dashboard-section" aria-labelledby="dashboard-contagem-heading">
        <h2 id="dashboard-contagem-heading" className="dashboard-section__title">
          Contagem por status
        </h2>
        <div className="metrics-grid metrics-grid--status">
          <div className="card card--accent-orange">
            <div className="card__label">Pendentes</div>
            <div className="card__value">
              {loading ? '…' : metrics.countByStatus.pendente}
            </div>
          </div>
          <div className="card card--accent-green">
            <div className="card__label">Vigentes</div>
            <div className="card__value">
              {loading ? '…' : metrics.countByStatus.vigente}
            </div>
          </div>
          <div className="card card--accent-red">
            <div className="card__label">Reprovados</div>
            <div className="card__value">
              {loading ? '…' : metrics.countByStatus.reprovado}
            </div>
          </div>
          <div className="card">
            <div className="card__label">Cancelados</div>
            <div className="card__value">
              {loading ? '…' : metrics.countByStatus.cancelado}
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="dashboard-totais-heading">
        <h2 id="dashboard-totais-heading" className="dashboard-section__title">
          Totais em R$
        </h2>
        <div className="metrics-grid metrics-grid--totals">
          <div className="card card--accent-orange">
            <div className="card__label">Total em orçamentos pendentes</div>
            <div className="card__value">
              {loading ? '…' : formatCurrencyBRL(metrics.totalPendentes)}
            </div>
          </div>
          <div className="card card--accent-green">
            <div className="card__label">Total em orçamentos vigentes</div>
            <div className="card__value">
              {loading ? '…' : formatCurrencyBRL(metrics.totalVigentes)}
            </div>
          </div>
          <div className="card">
            <div className="card__label">Total geral em orçamentos</div>
            <div className="card__value">
              {loading ? '…' : formatCurrencyBRL(metrics.totalGeral)}
            </div>
          </div>
        </div>
      </section>

      <div className="dashboard-tables section-mt">
        <section className="card" aria-labelledby="dashboard-pendentes-heading">
          <header className="card-header card-header-row">
            <h2 id="dashboard-pendentes-heading">Orçamentos pendentes</h2>
            <span className="badge">{orcamentosPendentes.length}</span>
          </header>

          {loadingPendentes ? (
            <LoadingState message="Carregando orçamentos pendentes..." />
          ) : orcamentosPendentes.length === 0 ? (
            <EmptyState message="Nenhum orçamento pendente encontrado." />
          ) : (
            <DataTable columns={pendentesColumns} data={orcamentosPendentes} rowKey={(o) => o.id} />
          )}
        </section>

        <section className="card" aria-labelledby="dashboard-vigentes-heading">
          <header className="card-header card-header-row">
            <h2 id="dashboard-vigentes-heading">Orçamentos vigentes</h2>
            <span className="badge">{orcamentosVigentes.length}</span>
          </header>

          {loadingVigentes ? (
            <LoadingState message="Carregando orçamentos vigentes..." />
          ) : orcamentosVigentes.length === 0 ? (
            <EmptyState message="Nenhum orçamento vigente encontrado." />
          ) : (
            <DataTable columns={vigentesColumns} data={orcamentosVigentes} rowKey={(o) => o.id} />
          )}
        </section>
      </div>
    </>
  )
}
