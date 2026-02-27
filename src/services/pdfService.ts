import { orcamentoService } from "@/services/orcamentoService"
import { clienteService } from "@/services/clienteService"
import { produtoService } from "@/services/produtoService"
import { gerarPdfOrcamento } from "@/pdf/gerarPdf"
import { db } from "@/db"
import type { Produto } from "@/types"

export class LojaNotConfiguredError extends Error {
  constructor() {
    super("Configure os dados da loja antes de gerar o PDF.")
    this.name = "LojaNotConfiguredError"
  }
}

export async function generateOrcamentoPdf(orcamentoId: number): Promise<void> {
  const data = await orcamentoService.getById(orcamentoId)
  if (!data) throw new Error("Orçamento não encontrado.")

  const cliente = await clienteService.getById(data.orcamento.clienteId)
  if (!cliente) throw new Error("Cliente não encontrado.")

  const loja = await db.loja.toCollection().first()
  if (!loja) throw new LojaNotConfiguredError()

  const produtosMap = new Map<number, Produto>()
  for (const item of data.itens) {
    if (!produtosMap.has(item.produtoId)) {
      const produto = await produtoService.getById(item.produtoId)
      if (produto) produtosMap.set(item.produtoId, produto)
    }
  }

  const itensComProduto = data.itens.map((item) => ({
    ...item,
    produto: produtosMap.get(item.produtoId)!,
  }))

  await gerarPdfOrcamento({
    loja,
    cliente,
    orcamento: data.orcamento,
    itens: itensComProduto,
    condicoes: data.condicoes,
  })
}
