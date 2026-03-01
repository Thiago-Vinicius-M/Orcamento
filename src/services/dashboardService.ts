import { apiClient } from "@/api/client"
import type { OrcamentoListItem } from "./orcamentoService"

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
  clienteCount: number
  produtoCount: number
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    return apiClient.get<DashboardStats>("/api/dashboard/stats")
  },
}
