import Dexie, { type EntityTable } from "dexie"
import type {
  Cliente,
  Produto,
  Orcamento,
  ItemOrcamento,
  CondicaoPagamento,
  Loja,
} from "@/types"

class OrcamentoDB extends Dexie {
  loja!: EntityTable<Loja, "id">
  clientes!: EntityTable<Cliente, "id">
  produtos!: EntityTable<Produto, "id">
  orcamentos!: EntityTable<Orcamento, "id">
  itensOrcamento!: EntityTable<ItemOrcamento, "id">
  condicoesPagamento!: EntityTable<CondicaoPagamento, "id">

  constructor() {
    super("OrcamentoDB")

    this.version(1).stores({
      loja: "++id",
      clientes: "++id, nome, cpfCnpj",
      produtos: "++id, nome, codigoSku, categoria, ativo",
      orcamentos: "++id, numero, clienteId, status, dataEmissao",
      itensOrcamento: "++id, orcamentoId, produtoId",
      condicoesPagamento: "++id, orcamentoId",
    })
  }
}

export const db = new OrcamentoDB()
