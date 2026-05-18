import { parseDecimalInput } from '../financeiro/numero'

export type ItemCalculoInput = {
  quantidade: string
  preco_unitario: string
  desconto_percentual?: string
}

export type OrcamentoTotais = {
  subtotal: number
  desconto_total: number
  total: number
}

export function calcularSubtotalBrutoItem(quantidade: number, precoUnitario: number): number {
  return quantidade * precoUnitario
}

export function calcularSubtotalItem(
  quantidade: number,
  precoUnitario: number,
  descontoPercentual = 0,
): number {
  const fator = Math.max(0, Math.min(100, descontoPercentual))
  return Math.round(quantidade * precoUnitario * (1 - fator / 100) * 100) / 100
}

export function calcularTotaisOrcamento(itens: ItemCalculoInput[]): OrcamentoTotais {
  let subtotalBruto = 0
  let subtotalLiquido = 0

  for (const item of itens) {
    const qtd = parseDecimalInput(item.quantidade)
    const preco = parseDecimalInput(item.preco_unitario)
    const descPct = parseDecimalInput(item.desconto_percentual ?? '0')
    subtotalBruto += calcularSubtotalBrutoItem(qtd, preco)
    subtotalLiquido += calcularSubtotalItem(qtd, preco, descPct)
  }

  const desconto_total = Math.round((subtotalBruto - subtotalLiquido) * 100) / 100
  const total = Math.max(subtotalLiquido, 0)

  return { subtotal: subtotalBruto, desconto_total, total }
}

export type PagamentoFinanciamentoInput = {
  total: number
  valor_entrada: number | null
  num_parcelas: number | null
  taxa_servico_percentual: number | null
  aplicar_taxa: boolean
}

export type PagamentoFinanciamentoResumo = {
  entrada: number
  valorFinanciado: number
  parcelas: number
  taxa: number
  aplicarTaxa: boolean
  totalComTaxa: number
  valorParcela: number
}

export function calcularResumoFinanciamento(
  input: PagamentoFinanciamentoInput,
): PagamentoFinanciamentoResumo {
  const entrada = input.valor_entrada ?? 0
  const valorFinanciado = Math.max(input.total - entrada, 0)
  const parcelas = input.num_parcelas ?? 1
  const taxa = input.taxa_servico_percentual ?? 0
  const aplicarTaxa = input.aplicar_taxa ?? false
  const totalComTaxa = aplicarTaxa && taxa > 0 ? valorFinanciado * (1 + taxa / 100) : valorFinanciado
  const valorParcela = parcelas > 0 ? totalComTaxa / parcelas : totalComTaxa

  return {
    entrada,
    valorFinanciado,
    parcelas,
    taxa,
    aplicarTaxa,
    totalComTaxa,
    valorParcela,
  }
}
