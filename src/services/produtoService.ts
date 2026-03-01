import { apiClient } from "@/api/client"
import type { Produto } from "@/types"
import type { ProdutoFormData } from "@/schemas/produto"

export const produtoService = {
  async getAll(): Promise<Produto[]> {
    return apiClient.get<Produto[]>("/api/produtos")
  },

  async getById(id: number): Promise<Produto | undefined> {
    return apiClient.get<Produto>(`/api/produtos/${id}`)
  },

  async create(data: ProdutoFormData): Promise<number> {
    const result = await apiClient.post<{ id: number }>("/api/produtos", data)
    return result.id
  },

  async update(id: number, data: ProdutoFormData): Promise<void> {
    await apiClient.put(`/api/produtos/${id}`, data)
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/api/produtos/${id}`)
  },

  async count(): Promise<number> {
    const all = await this.getAll()
    return all.length
  },

  async search(query: string, categoria?: string): Promise<Produto[]> {
    const params = new URLSearchParams({ search: query })
    if (categoria) params.set("categoria", categoria)
    return apiClient.get<Produto[]>(`/api/produtos?${params}`)
  },

  async getByCategory(categoria: string): Promise<Produto[]> {
    return apiClient.get<Produto[]>(
      `/api/produtos?categoria=${encodeURIComponent(categoria)}`,
    )
  },

  async toggleActive(id: number): Promise<void> {
    await apiClient.patch(`/api/produtos/${id}/toggle-ativo`)
  },

  async getCategories(): Promise<string[]> {
    return apiClient.get<string[]>("/api/produtos/categorias")
  },
}
