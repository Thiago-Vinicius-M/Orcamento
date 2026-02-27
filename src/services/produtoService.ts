import { db } from "@/db"
import type { Produto } from "@/types"
import type { ProdutoFormData } from "@/schemas/produto"
import { textIncludes } from "@/lib/searchUtils"
import { createCrudService } from "./baseCrudService"

const transformData = (data: ProdutoFormData): Partial<Produto> => ({
  ...data,
  descricao: data.descricao ?? "",
  imagem: data.imagem ?? "",
})

const baseCrud = createCrudService<Produto, ProdutoFormData>({
  table: db.produtos,
  orderBy: "nome",
  transformData,
})

export const produtoService = {
  ...baseCrud,

  async search(query: string, categoria?: string): Promise<Produto[]> {
    return db.produtos
      .filter((p) => {
        if (categoria && p.categoria !== categoria) return false
        if (textIncludes(p.nome, query)) return true
        if (textIncludes(p.codigoSku, query)) return true
        return false
      })
      .toArray()
  },

  async getByCategory(categoria: string): Promise<Produto[]> {
    return db.produtos.where("categoria").equals(categoria).sortBy("nome")
  },

  async toggleActive(id: number): Promise<void> {
    const produto = await db.produtos.get(id)
    if (!produto) return
    await db.produtos.update(id, {
      ativo: !produto.ativo,
      updatedAt: new Date(),
    })
  },

  async getCategories(): Promise<string[]> {
    const all = await db.produtos.orderBy("categoria").uniqueKeys()
    return all as string[]
  },
}
