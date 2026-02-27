import { db } from "@/db"
import type { Cliente } from "@/types"
import type { ClienteFormData } from "@/schemas/cliente"

export const clienteService = {
  async getAll(): Promise<Cliente[]> {
    return db.clientes.orderBy("nome").toArray()
  },

  async search(query: string): Promise<Cliente[]> {
    const lower = query.toLowerCase()
    const digits = query.replace(/\D/g, "")

    return db.clientes
      .filter((c) => {
        if (c.nome.toLowerCase().includes(lower)) return true
        if (digits && c.cpfCnpj.replace(/\D/g, "").includes(digits)) return true
        return false
      })
      .toArray()
  },

  async getById(id: number): Promise<Cliente | undefined> {
    return db.clientes.get(id)
  },

  async create(data: ClienteFormData): Promise<number> {
    const now = new Date()
    const id = await db.clientes.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    } as Cliente)
    return id as number
  },

  async update(id: number, data: ClienteFormData): Promise<void> {
    await db.clientes.update(id, {
      ...data,
      updatedAt: new Date(),
    })
  },

  async remove(id: number): Promise<void> {
    await db.clientes.delete(id)
  },

  async count(): Promise<number> {
    return db.clientes.count()
  },
}
