import type { Orcamento, StatusOrcamento } from "@/types"

const VALID_TRANSITIONS: Record<StatusOrcamento, StatusOrcamento[]> = {
  vigente: ["aprovado", "cancelado"],
  expirado: ["aprovado", "cancelado"],
  aprovado: ["cancelado"],
  cancelado: ["aprovado"],
}

export const STATUS_INICIAL: StatusOrcamento = "vigente"

export function isOrcamentoExpirado(orcamento: Pick<Orcamento, "status" | "dataValidade">): boolean {
  if (orcamento.status !== "vigente") return false
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return new Date(orcamento.dataValidade) < hoje
}

export function getIdsExpirados(
  orcamentos: Pick<Orcamento, "id" | "status" | "dataValidade">[],
): number[] {
  return orcamentos
    .filter(isOrcamentoExpirado)
    .map((o) => o.id!)
}

export function canChangeStatus(
  orcamento: Pick<Orcamento, "status">,
  newStatus: StatusOrcamento,
): boolean {
  if (orcamento.status === newStatus) return false
  return VALID_TRANSITIONS[orcamento.status]?.includes(newStatus) ?? false
}

export function getTransicoesPermitidas(
  orcamento: Pick<Orcamento, "status">,
): StatusOrcamento[] {
  return VALID_TRANSITIONS[orcamento.status] ?? []
}
