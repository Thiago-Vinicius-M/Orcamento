import { db } from "@/db"
import type { Loja } from "@/types"
import type { LojaFormData } from "@/schemas/loja"

export const lojaService = {
  async get(): Promise<Loja | undefined> {
    const all = await db.loja.toArray()
    return all[0]
  },

  async save(data: LojaFormData): Promise<void> {
    const existing = await this.get()
    const now = new Date()

    if (existing?.id) {
      await db.loja.update(existing.id, {
        ...data,
        updatedAt: now,
      })
    } else {
      await db.loja.add({
        ...data,
        updatedAt: now,
      } as Loja)
    }
  },
}
