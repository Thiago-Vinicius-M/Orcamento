import type { FormaPagamento } from "@/types"

interface ItemInput {
  quantidade: number
  precoUnitario: number
}

interface ItemComSubtotal extends ItemInput {
  subtotal: number
}

interface CondicaoInput {
  formaPagamento: FormaPagamento
  parcelas: number
  descontoPercentual?: number
  observacoes?: string
}

interface CondicaoCalculada {
  formaPagamento: FormaPagamento
  parcelas: number
  valorTotal: number
  valorParcela: number
  descontoPercentual: number
  observacoes: string
}

interface TotaisOrcamento {
  itensComSubtotal: ItemComSubtotal[]
  subtotal: number
  descontoValor: number
  descontoPercentual: number
  total: number
}

const DEFAULT_VALIDADE_DIAS = 30

export function calcularSubtotalItem(item: ItemInput): number {
  return item.quantidade * item.precoUnitario
}

export function calcularTotaisOrcamento(
  itens: ItemInput[],
  descontoPercentual: number,
  descontoValor: number,
): TotaisOrcamento {
  const itensComSubtotal = itens.map((item) => ({
    ...item,
    subtotal: calcularSubtotalItem(item),
  }))

  const subtotal = itensComSubtotal.reduce(
    (sum, item) => sum + item.subtotal,
    0,
  )

  let descontoFinal = descontoValor
  if (descontoPercentual > 0) {
    descontoFinal = subtotal * (descontoPercentual / 100)
  }

  const total = Math.max(0, subtotal - descontoFinal)

  return {
    itensComSubtotal,
    subtotal,
    descontoValor: descontoFinal,
    descontoPercentual,
    total,
  }
}

export function calcularCondicaoPagamento(
  condicao: CondicaoInput,
  totalOrcamento: number,
): CondicaoCalculada {
  const desconto = condicao.descontoPercentual || 0
  const condTotal = Number(
    (totalOrcamento * (1 - desconto / 100)).toFixed(2),
  )
  const parcelas = condicao.parcelas || 1
  const condParcela = Number((condTotal / parcelas).toFixed(2))

  return {
    formaPagamento: condicao.formaPagamento,
    parcelas: condicao.parcelas,
    valorTotal: condTotal,
    valorParcela: condParcela,
    descontoPercentual: desconto,
    observacoes: condicao.observacoes ?? "",
  }
}

export function calcularCondicoesPagamento(
  condicoes: CondicaoInput[],
  totalOrcamento: number,
): CondicaoCalculada[] {
  return condicoes.map((cond) =>
    calcularCondicaoPagamento(cond, totalOrcamento),
  )
}

export function criarDatasOrcamento(validadeDias = DEFAULT_VALIDADE_DIAS) {
  const dataEmissao = new Date()
  dataEmissao.setHours(0, 0, 0, 0)
  const dataValidade = new Date(dataEmissao)
  dataValidade.setDate(dataValidade.getDate() + validadeDias)
  return { dataEmissao, dataValidade }
}
