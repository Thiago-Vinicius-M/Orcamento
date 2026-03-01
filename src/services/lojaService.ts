import { apiClient } from "@/api/client"
import type { Loja } from "@/types"
import type { LojaFormData } from "@/schemas/loja"

export const lojaService = {
  async get(): Promise<Loja | undefined> {
    const result = await apiClient.get<Loja | null>("/api/loja")
    return result ?? undefined
  },

  async save(data: LojaFormData): Promise<void> {
    await apiClient.put("/api/loja", data)
  },
}
