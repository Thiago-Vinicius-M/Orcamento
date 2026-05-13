import type { StatusPillVariant } from '../../components/StatusPill'
import { assertNever } from '../../lib/assertNever'
import type { UserRole } from '../../types/userRole'

export const STATUS_LABELS = {
  pendente: 'Pendente',
  vigente: 'Vigente',
  reprovado: 'Reprovado',
  aprovado: 'Aprovado',
  cancelado: 'Cancelado',
  rascunho: 'Rascunho',
  expirado: 'Expirado',
} as const

export type OrcamentoStatus = keyof typeof STATUS_LABELS

export function isOrcamentoStatus(value: unknown): value is OrcamentoStatus {
  return typeof value === 'string' && value in STATUS_LABELS
}

/** Valor vindo do banco/IO: só aceita status conhecido; caso contrário usa fallback. */
export function parseOrcamentoStatusValue(
  value: unknown,
  fallback: OrcamentoStatus = 'pendente',
): OrcamentoStatus {
  return isOrcamentoStatus(value) ? value : fallback
}

export function formatarStatusOrcamento(status: OrcamentoStatus): string {
  return STATUS_LABELS[status]
}

const STATUS_PILL_CLASS: Record<OrcamentoStatus, StatusPillVariant> = {
  pendente: 'warning',
  vigente: 'success',
  reprovado: 'danger',
  aprovado: 'success',
  cancelado: 'muted',
  rascunho: 'muted',
  expirado: 'muted',
}

export function getStatusPillClassName(status: OrcamentoStatus): StatusPillVariant {
  return STATUS_PILL_CLASS[status]
}

export type AcaoOrcamento = 'aprovar' | 'reprovar' | 'cancelar' | 'excluir' | 'gerarPdf'

export interface OrcamentoStateMachine {
  podeExecutar(
    acao: AcaoOrcamento,
    ctx: { status: OrcamentoStatus; role: UserRole | null },
  ): boolean
  proximoStatus(acao: AcaoOrcamento, atual: OrcamentoStatus): OrcamentoStatus | null
}

function podeExecutarAcao(
  acao: AcaoOrcamento,
  ctx: { status: OrcamentoStatus; role: UserRole | null },
): boolean {
  switch (acao) {
    case 'aprovar':
      return ctx.status === 'pendente' && ctx.role === 'gerente'
    case 'reprovar':
      return ctx.status === 'pendente' && ctx.role === 'gerente'
    case 'cancelar':
      return ctx.status === 'pendente' || ctx.status === 'vigente'
    case 'excluir':
      return ctx.role === 'gerente'
    case 'gerarPdf':
      return ctx.status === 'vigente'
    default:
      throw assertNever(acao)
  }
}

function proximoStatusParaAcao(
  acao: AcaoOrcamento,
  atual: OrcamentoStatus,
): OrcamentoStatus | null {
  switch (acao) {
    case 'aprovar':
      return atual === 'pendente' ? 'vigente' : null
    case 'reprovar':
      return atual === 'pendente' ? 'reprovado' : null
    case 'cancelar':
      return atual === 'pendente' || atual === 'vigente' ? 'cancelado' : null
    case 'excluir':
    case 'gerarPdf':
      return null
    default:
      throw assertNever(acao)
  }
}

export const orcamentoStateMachine: OrcamentoStateMachine = {
  podeExecutar: podeExecutarAcao,
  proximoStatus: proximoStatusParaAcao,
}

export function podeAprovar(status: OrcamentoStatus, role: UserRole | null): boolean {
  return orcamentoStateMachine.podeExecutar('aprovar', { status, role })
}

export function podeReprovar(status: OrcamentoStatus, role: UserRole | null): boolean {
  return orcamentoStateMachine.podeExecutar('reprovar', { status, role })
}

export function podeCancelar(status: OrcamentoStatus, _role: UserRole | null): boolean {
  return orcamentoStateMachine.podeExecutar('cancelar', { status, role: _role })
}

export function podeGerarPdf(status: OrcamentoStatus): boolean {
  return orcamentoStateMachine.podeExecutar('gerarPdf', {
    status,
    role: null,
  })
}

export function podeExcluir(_status: OrcamentoStatus, role: UserRole | null): boolean {
  return orcamentoStateMachine.podeExecutar('excluir', { status: _status, role })
}
