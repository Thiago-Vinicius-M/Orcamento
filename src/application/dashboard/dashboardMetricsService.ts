import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrcamentoStatus } from '../../domain/orcamento/status'
import { isOrcamentoStatus } from '../../domain/orcamento/status'

export type DashboardMetricsStatus = Extract<
  OrcamentoStatus,
  'pendente' | 'vigente' | 'reprovado' | 'cancelado'
>

export type DashboardMetrics = {
  countByStatus: Record<DashboardMetricsStatus, number>
  totalPendentes: number
  totalVigentes: number
  totalGeral: number
}

type OrcamentoResumo = {
  status: unknown
  total: number
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

const emptyMetrics = (): DashboardMetrics => ({
  countByStatus: {
    pendente: 0,
    vigente: 0,
    reprovado: 0,
    cancelado: 0,
  },
  totalPendentes: 0,
  totalVigentes: 0,
  totalGeral: 0,
})

function isDashboardMetricsStatus(value: unknown): value is DashboardMetricsStatus {
  return (
    isOrcamentoStatus(value) &&
    (value === 'pendente' ||
      value === 'vigente' ||
      value === 'reprovado' ||
      value === 'cancelado')
  )
}

export async function loadDashboardMetrics(
  client: SupabaseClient,
): Promise<{ ok: true; metrics: DashboardMetrics } | { ok: false; error: string }> {
  const { data, error } = await client
    .from('orcamentos')
    .select('status, total')
    .in('status', ['pendente', 'vigente', 'reprovado', 'cancelado'])

  if (error) {
    return { ok: false, error: error.message }
  }

  const rows: OrcamentoResumo[] = (data ?? []).map((row) =>
    toOrcamentoResumo((row ?? {}) as OrcamentoResumoRaw),
  )

  const next = emptyMetrics()

  for (const row of rows) {
    if (!isDashboardMetricsStatus(row.status)) continue

    next.countByStatus[row.status] += 1
    next.totalGeral += row.total

    if (row.status === 'pendente') {
      next.totalPendentes += row.total
    }

    if (row.status === 'vigente') {
      next.totalVigentes += row.total
    }
  }

  return { ok: true, metrics: next }
}
