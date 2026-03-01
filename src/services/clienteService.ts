import { apiClient } from "@/api/client"
import type { Cliente } from "@/types"
import type { ClienteFormData } from "@/schemas/cliente"

export const clienteService = {
  async getAll(): Promise<Cliente[]> {
    return apiClient.get<Cliente[]>("/api/clientes")
  },

  async getById(id: number): Promise<Cliente | undefined> {
    return apiClient.get<Cliente>(`/api/clientes/${id}`)
  },

  async create(data: ClienteFormData): Promise<number> {
    const result = await apiClient.post<{ id: number }>("/api/clientes", data)
    return result.id
  },

  async update(id: number, data: ClienteFormData): Promise<void> {
    await apiClient.put(`/api/clientes/${id}`, data)
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/api/clientes/${id}`)
  },

  async count(): Promise<number> {
    const result = await apiClient.get<{ count: number }>("/api/clientes/count")
    return result.count
  },

  async search(query: string): Promise<Cliente[]> {
    return apiClient.get<Cliente[]>(
      `/api/clientes?search=${encodeURIComponent(query)}`,
    )
  },
}
