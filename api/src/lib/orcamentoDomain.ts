type StatusOrcamento = "vigente" | "expirado" | "aprovado" | "cancelado"

const VALID_TRANSITIONS: Record<StatusOrcamento, StatusOrcamento[]> = {
  vigente: ["aprovado", "cancelado"],
  expirado: ["aprovado", "cancelado"],
  aprovado: ["cancelado"],
  cancelado: ["aprovado"],
}

export const STATUS_INICIAL: StatusOrcamento = "vigente"

export function isOrcamentoExpirado(orcamento: {
  status: string
  dataValidade: Date
}): boolean {
  if (orcamento.status !== "vigente") return false
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return new Date(orcamento.dataValidade) < hoje
}

export function getIdsExpirados(
  orcamentos: { id: number; status: string; dataValidade: Date }[],
): number[] {
  return orcamentos.filter(isOrcamentoExpirado).map((o) => o.id)
}

export function canChangeStatus(
  currentStatus: string,
  newStatus: string,
): boolean {
  if (currentStatus === newStatus) return false
  const allowed =
    VALID_TRANSITIONS[currentStatus as StatusOrcamento] ?? []
  return allowed.includes(newStatus as StatusOrcamento)
}
