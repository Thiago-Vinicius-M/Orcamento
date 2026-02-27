import { db } from "@/db"
import type { Cliente } from "@/types"
import type { ClienteFormData } from "@/schemas/cliente"
import { textIncludes } from "@/lib/searchUtils"
import { createCrudService } from "./baseCrudService"

const baseCrud = createCrudService<Cliente, ClienteFormData>({
  table: db.clientes,
  orderBy: "nome",
})

export const clienteService = {
  ...baseCrud,

  async search(query: string): Promise<Cliente[]> {
    const digits = query.replace(/\D/g, "")

    return db.clientes
      .filter((c) => {
        if (textIncludes(c.nome, query)) return true
        if (digits && c.cpfCnpj.replace(/\D/g, "").includes(digits)) return true
        return false
      })
      .toArray()
  },
}
