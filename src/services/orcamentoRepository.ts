import { db } from "@/db"
import type {
  Orcamento,
  ItemOrcamento,
  CondicaoPagamento,
  StatusOrcamento,
  Produto,
} from "@/types"

export interface OrcamentoListItem extends Orcamento {
  clienteNome: string
}

export const orcamentoRepository = {
  async findAll(): Promise<Orcamento[]> {
    return db.orcamentos.orderBy("numero").reverse().toArray()
  },

  async findById(id: number): Promise<Orcamento | undefined> {
    return db.orcamentos.get(id)
  },

  async findByStatus(status: StatusOrcamento): Promise<Orcamento[]> {
    return db.orcamentos.where("status").equals(status).toArray()
  },

  async findItens(orcamentoId: number): Promise<ItemOrcamento[]> {
    return db.itensOrcamento
      .where("orcamentoId")
      .equals(orcamentoId)
      .toArray()
  },

  async findCondicoes(orcamentoId: number): Promise<CondicaoPagamento[]> {
    return db.condicoesPagamento
      .where("orcamentoId")
      .equals(orcamentoId)
      .toArray()
  },

  async findLastByNumero(): Promise<Orcamento | undefined> {
    return db.orcamentos.orderBy("numero").last()
  },

  async count(): Promise<number> {
    return db.orcamentos.count()
  },

  async countByStatus(status: StatusOrcamento): Promise<number> {
    return db.orcamentos.where("status").equals(status).count()
  },

  async insert(data: Omit<Orcamento, "id">): Promise<number> {
    return (await db.orcamentos.add(data as Orcamento)) as number
  },

  async update(id: number, data: Partial<Orcamento>): Promise<void> {
    await db.orcamentos.update(id, data)
  },

  async deleteById(id: number): Promise<void> {
    await db.orcamentos.delete(id)
  },

  async insertItensAndCondicoes(
    orcamentoId: number,
    itens: Omit<ItemOrcamento, "id" | "orcamentoId">[],
    condicoes: Omit<CondicaoPagamento, "id" | "orcamentoId">[],
  ): Promise<void> {
    await Promise.all(
      itens.map((item) =>
        db.itensOrcamento.add({
          orcamentoId,
          ...item,
        } as ItemOrcamento),
      ),
    )
    await Promise.all(
      condicoes.map((cond) =>
        db.condicoesPagamento.add({
          orcamentoId,
          ...cond,
        } as CondicaoPagamento),
      ),
    )
  },

  async deleteItensAndCondicoes(orcamentoId: number): Promise<void> {
    await db.itensOrcamento.where("orcamentoId").equals(orcamentoId).delete()
    await db.condicoesPagamento
      .where("orcamentoId")
      .equals(orcamentoId)
      .delete()
  },

  async marcarExpirados(ids: number[]): Promise<void> {
    await Promise.all(
      ids.map((id) =>
        db.orcamentos.update(id, {
          status: "expirado" satisfies StatusOrcamento,
          updatedAt: new Date(),
        }),
      ),
    )
  },

  async enrichWithClienteNome(
    orcamentos: Orcamento[],
  ): Promise<OrcamentoListItem[]> {
    const result: OrcamentoListItem[] = []
    for (const orc of orcamentos) {
      const cliente = await db.clientes.get(orc.clienteId)
      result.push({
        ...orc,
        clienteNome: cliente?.nome ?? "Cliente removido",
      })
    }
    return result
  },

  async buildProdutosMap(
    itens: ItemOrcamento[],
  ): Promise<Map<number, Produto>> {
    const produtosMap = new Map<number, Produto>()
    for (const item of itens) {
      if (!produtosMap.has(item.produtoId)) {
        const produto = await db.produtos.get(item.produtoId)
        if (produto) produtosMap.set(item.produtoId, produto)
      }
    }
    return produtosMap
  },

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return db.transaction(
      "rw",
      [db.orcamentos, db.itensOrcamento, db.condicoesPagamento],
      fn,
    )
  },
}
