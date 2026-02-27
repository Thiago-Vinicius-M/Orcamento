import { getIdsExpirados } from "@/lib/orcamentoDomain"
import {
  orcamentoRepository,
  type OrcamentoListItem,
} from "./orcamentoRepository"

export interface DashboardStats {
  total: number
  vigente: number
  expirado: number
  aprovado: number
  cancelado: number
  valorVigentes: number
  valorAprovados: number
  valorTotal: number
  recentes: OrcamentoListItem[]
}

async function verificarExpiracoes(): Promise<void> {
  const vigentes = await orcamentoRepository.findByStatus("vigente")
  const ids = getIdsExpirados(vigentes)
  if (ids.length) {
    await orcamentoRepository.marcarExpirados(ids)
  }
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    await verificarExpiracoes()

    const all = await orcamentoRepository.findAll()

    const stats = {
      total: all.length,
      vigente: 0,
      expirado: 0,
      aprovado: 0,
      cancelado: 0,
      valorVigentes: 0,
      valorAprovados: 0,
      valorTotal: 0,
    }

    for (const orc of all) {
      stats[orc.status]++
      stats.valorTotal += orc.total
      if (orc.status === "vigente") stats.valorVigentes += orc.total
      if (orc.status === "aprovado") stats.valorAprovados += orc.total
    }

    const recentes = await orcamentoRepository.enrichWithClienteNome(
      all.slice(0, 5),
    )

    return { ...stats, recentes }
  },
}
