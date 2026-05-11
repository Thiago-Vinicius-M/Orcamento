import type { UserRole } from '../../types/userRole'
import type { StatusPillVariant } from '../../components/StatusPill'

export type OrcamentoStatus =
  | 'pendente'
  | 'vigente'
  | 'reprovado'
  | 'aprovado'
  | 'cancelado'
  | 'rascunho'
  | 'expirado'

const STATUS_LABELS: Record<OrcamentoStatus, string> = {
  pendente: 'Pendente',
  vigente: 'Vigente',
  reprovado: 'Reprovado',
  aprovado: 'Aprovado',
  cancelado: 'Cancelado',
  rascunho: 'Rascunho',
  expirado: 'Expirado',
}

export function isOrcamentoStatus(value: unknown): value is OrcamentoStatus {
  return (
    value === 'pendente' ||
    value === 'vigente' ||
    value === 'reprovado' ||
    value === 'aprovado' ||
    value === 'cancelado' ||
    value === 'rascunho' ||
    value === 'expirado'
  )
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

export function podeAprovar(status: OrcamentoStatus, role: UserRole | null): boolean {
  return status === 'pendente' && role === 'gerente'
}

export function podeReprovar(status: OrcamentoStatus, role: UserRole | null): boolean {
  return status === 'pendente' && role === 'gerente'
}

export function podeCancelar(status: OrcamentoStatus, _role: UserRole | null): boolean {
  return status === 'pendente' || status === 'vigente'
}

export function podeGerarPdf(status: OrcamentoStatus): boolean {
  return status === 'vigente'
}

export function podeExcluir(_status: OrcamentoStatus, role: UserRole | null): boolean {
  return role === 'gerente'
}
