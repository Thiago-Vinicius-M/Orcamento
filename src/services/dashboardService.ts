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

function getMockDashboardStats(): DashboardStats {
  return {
    total: 5,
    vigente: 3,
    expirado: 1,
    aprovado: 1,
    cancelado: 0,
    valorVigentes: 15000,
    valorAprovados: 8000,
    valorTotal: 23000,
    recentes: [],
    clienteCount: 3,
    produtoCount: 8,
  }
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    if (import.meta.env.VITE_USE_MOCK_DASHBOARD === "true") {
      return getMockDashboardStats()
    }

    try {
      return await apiClient.get<DashboardStats>("/api/dashboard/stats")
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(
          "[dashboardService] Falha ao buscar stats reais, usando dados mock:",
          error,
        )
        return getMockDashboardStats()
      }
      throw error
    }
  },
}
