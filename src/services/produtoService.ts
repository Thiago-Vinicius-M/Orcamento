import { db } from "@/db"
import type { Produto } from "@/types"
import type { ProdutoFormData } from "@/schemas/produto"

export const produtoService = {
  async getAll(): Promise<Produto[]> {
    return db.produtos.orderBy("nome").toArray()
  },

  async search(query: string, categoria?: string): Promise<Produto[]> {
    const lower = query.toLowerCase()

    return db.produtos
      .filter((p) => {
        if (categoria && p.categoria !== categoria) return false
        if (p.nome.toLowerCase().includes(lower)) return true
        if (p.codigoSku.toLowerCase().includes(lower)) return true
        return false
      })
      .toArray()
  },

  async getByCategory(categoria: string): Promise<Produto[]> {
    return db.produtos.where("categoria").equals(categoria).sortBy("nome")
  },

  async getById(id: number): Promise<Produto | undefined> {
    return db.produtos.get(id)
  },

  async create(data: ProdutoFormData): Promise<number> {
    const now = new Date()
    const id = await db.produtos.add({
      ...data,
      descricao: data.descricao ?? "",
      imagem: data.imagem ?? "",
      createdAt: now,
      updatedAt: now,
    } as Produto)
    return id as number
  },

  async update(id: number, data: ProdutoFormData): Promise<void> {
    await db.produtos.update(id, {
      ...data,
      descricao: data.descricao ?? "",
      imagem: data.imagem ?? "",
      updatedAt: new Date(),
    })
  },

  async toggleActive(id: number): Promise<void> {
    const produto = await db.produtos.get(id)
    if (!produto) return
    await db.produtos.update(id, {
      ativo: !produto.ativo,
      updatedAt: new Date(),
    })
  },

  async remove(id: number): Promise<void> {
    await db.produtos.delete(id)
  },

  async count(): Promise<number> {
    return db.produtos.count()
  },

  async getCategories(): Promise<string[]> {
    const all = await db.produtos.orderBy("categoria").uniqueKeys()
    return all as string[]
  },
}
