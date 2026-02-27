import { orcamentoService } from "@/services/orcamentoService"
import { lojaService } from "@/services/lojaService"
import { gerarPdfOrcamento } from "@/pdf/gerarPdf"

export class LojaNotConfiguredError extends Error {
  constructor() {
    super("Configure os dados da loja antes de gerar o PDF.")
    this.name = "LojaNotConfiguredError"
  }
}

export async function generateOrcamentoPdf(orcamentoId: number): Promise<void> {
  const data = await orcamentoService.getByIdWithDetails(orcamentoId)
  if (!data) throw new Error("Orçamento não encontrado.")
  if (!data.cliente) throw new Error("Cliente não encontrado.")

  const loja = await lojaService.get()
  if (!loja) throw new LojaNotConfiguredError()

  const itensComProduto = data.itens.map((item) => ({
    ...item,
    produto: data.produtosMap.get(item.produtoId)!,
  }))

  await gerarPdfOrcamento({
    loja,
    cliente: data.cliente,
    orcamento: data.orcamento,
    itens: itensComProduto,
    condicoes: data.condicoes,
  })
}
