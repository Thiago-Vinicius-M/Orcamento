import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSupabase } from '../lib/useSupabase'
import { formatCurrencyBRL } from '../domain/financeiro/moeda'
import { formatarStatusOrcamento, getStatusPillClassName } from '../domain/orcamento/status'
import type { OrcamentoListRow } from '../domain/orcamento/mappers'
import { PageHeader, StatusPill, LoadingState, EmptyState, DataTable, type Column } from '../components'
import { loadDashboardMetrics, type DashboardMetrics } from '../application/dashboard/dashboardMetricsService'
import { fetchDashboardOrcamentosList } from '../application/dashboard/dashboardListsService'
import { useAsyncEffect } from '../hooks/useAsyncEffect'

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
  const supaStatus = useSupabase()
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orcamentosPendentes, setOrcamentosPendentes] = useState<OrcamentoListRow[]>([])
  const [loadingPendentes, setLoadingPendentes] = useState(false)
  const [errorPendentes, setErrorPendentes] = useState<string | null>(null)
  const [orcamentosVigentes, setOrcamentosVigentes] = useState<OrcamentoListRow[]>([])
  const [loadingVigentes, setLoadingVigentes] = useState(false)
  const [errorVigentes, setErrorVigentes] = useState<string | null>(null)

  const carregarMetricas = useCallback(async (signal: { cancelled: boolean }) => {
    if (signal.cancelled) return
    setLoading(true)
    setError(null)

    if (supaStatus.kind !== 'ready') {
      if (signal.cancelled) return
      setError(supaStatus.message)
      setLoading(false)
      return
    }
    const supabaseClient = supaStatus.client

    try {
      const result = await loadDashboardMetrics(supabaseClient)
      if (signal.cancelled) return
      if (!result.ok) {
        setError(result.error)
        return
      }
      setMetrics(result.metrics)
    } catch (e) {
      if (signal.cancelled) return
      setError(e instanceof Error ? e.message : 'Erro ao carregar métricas.')
    } finally {
      if (!signal.cancelled) {
        setLoading(false)
      }
    }
  }, [supaStatus])

  const carregarPendentes = useCallback(async (signal: { cancelled: boolean }) => {
    if (signal.cancelled) return
    setLoadingPendentes(true)
    setErrorPendentes(null)

    if (supaStatus.kind !== 'ready') {
      if (signal.cancelled) return
      setErrorPendentes(supaStatus.message)
      setLoadingPendentes(false)
      return
    }
    const supabaseClient = supaStatus.client

    try {
      const rows = await fetchDashboardOrcamentosList(supabaseClient, 'pendente')
      if (signal.cancelled) return
      setOrcamentosPendentes(rows)
    } catch (e) {
      if (signal.cancelled) return
      setErrorPendentes(e instanceof Error ? e.message : 'Erro ao listar pendentes.')
    } finally {
      if (!signal.cancelled) {
        setLoadingPendentes(false)
      }
    }
  }, [supaStatus])

  const carregarVigentes = useCallback(async (signal: { cancelled: boolean }) => {
    if (signal.cancelled) return
    setLoadingVigentes(true)
    setErrorVigentes(null)

    if (supaStatus.kind !== 'ready') {
      if (signal.cancelled) return
      setErrorVigentes(supaStatus.message)
      setLoadingVigentes(false)
      return
    }
    const supabaseClient = supaStatus.client

    try {
      const rows = await fetchDashboardOrcamentosList(supabaseClient, 'vigente')
      if (signal.cancelled) return
      setOrcamentosVigentes(rows)
    } catch (e) {
      if (signal.cancelled) return
      setErrorVigentes(e instanceof Error ? e.message : 'Erro ao listar vigentes.')
    } finally {
      if (!signal.cancelled) {
        setLoadingVigentes(false)
      }
    }
  }, [supaStatus])

  useAsyncEffect(carregarMetricas, [carregarMetricas])
  useAsyncEffect(carregarPendentes, [carregarPendentes])
  useAsyncEffect(carregarVigentes, [carregarVigentes])

  const combinedError = [error, errorPendentes, errorVigentes].filter(Boolean).join(' | ') || null

  const pendentesColumns: Column<OrcamentoListRow>[] = [
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
