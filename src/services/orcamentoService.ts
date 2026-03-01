import { apiClient } from "@/api/client"
import type {
  Orcamento,
  ItemOrcamento,
  CondicaoPagamento,
  StatusOrcamento,
  Produto,
  Cliente,
} from "@/types"
import type { OrcamentoFormData } from "@/schemas/orcamento"

export interface OrcamentoListItem extends Orcamento {
  clienteNome: string
}

export interface OrcamentoCompleto {
  orcamento: Orcamento
  itens: ItemOrcamento[]
  condicoes: CondicaoPagamento[]
}

export interface OrcamentoComDetalhes extends OrcamentoCompleto {
  cliente: Cliente | undefined
  produtosMap: Map<number, Produto>
}

interface OrcamentoDetalhadoResponse {
  orcamento: Orcamento
  itens: ItemOrcamento[]
  condicoes: CondicaoPagamento[]
  cliente: Cliente | null
  produtosMap: Record<string, Produto>
}

function parseDetalhesResponse(
  data: OrcamentoDetalhadoResponse,
): OrcamentoComDetalhes {
  const produtosMap = new Map<number, Produto>(
    Object.entries(data.produtosMap).map(([k, v]) => [Number(k), v]),
  )
  return {
    orcamento: data.orcamento,
    itens: data.itens,
    condicoes: data.condicoes,
    cliente: data.cliente ?? undefined,
    produtosMap,
  }
}

export const orcamentoService = {
  async create(data: OrcamentoFormData): Promise<number> {
    const result = await apiClient.post<{ id: number }>(
      "/api/orcamentos",
      data,
    )
    return result.id
  },

  async getAll(): Promise<OrcamentoListItem[]> {
    return apiClient.get<OrcamentoListItem[]>("/api/orcamentos")
  },

  async getById(id: number): Promise<OrcamentoCompleto | undefined> {
    const data =
      await apiClient.get<OrcamentoDetalhadoResponse>(`/api/orcamentos/${id}`)
    return {
      orcamento: data.orcamento,
      itens: data.itens,
      condicoes: data.condicoes,
    }
  },

  async getByIdWithDetails(
    id: number,
  ): Promise<OrcamentoComDetalhes | undefined> {
    const data =
      await apiClient.get<OrcamentoDetalhadoResponse>(`/api/orcamentos/${id}`)
    return parseDetalhesResponse(data)
  },

  async update(id: number, data: OrcamentoFormData): Promise<void> {
    await apiClient.put(`/api/orcamentos/${id}`, data)
  },

  async updateStatus(id: number, status: StatusOrcamento): Promise<void> {
    await apiClient.patch(`/api/orcamentos/${id}/status`, { status })
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/api/orcamentos/${id}`)
  },

  async duplicate(id: number): Promise<number> {
    const result = await apiClient.post<{ id: number }>(
      `/api/orcamentos/${id}/duplicar`,
    )
    return result.id
  },
}
