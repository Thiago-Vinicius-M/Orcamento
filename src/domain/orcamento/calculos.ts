import { parseDecimalInput } from '../financeiro/numero'

export type ItemCalculoInput = {
  quantidade: string
  preco_unitario: string
}

export type DescontoInput = {
  tipo: 'percentual' | 'fixo' | null
  valor: number
}

export type OrcamentoTotais = {
  subtotal: number
  desconto_total: number
  total: number
}

export function calcularSubtotalItem(quantidade: number, precoUnitario: number): number {
  return quantidade * precoUnitario
}

export function calcularDescontoTotal(subtotal: number, desconto?: DescontoInput): number {
  if (!desconto || !desconto.tipo || desconto.valor <= 0) return 0

  if (desconto.tipo === 'percentual') {
    const pct = Math.min(desconto.valor, 100)
    return Math.round(subtotal * pct) / 100
  }

  return Math.min(desconto.valor, subtotal)
}

export function calcularTotaisOrcamento(
  itens: ItemCalculoInput[],
  desconto?: DescontoInput,
): OrcamentoTotais {
  const subtotal = itens.reduce((acc, item) => {
    const qtd = parseDecimalInput(item.quantidade)
    const preco = parseDecimalInput(item.preco_unitario)
    return acc + calcularSubtotalItem(qtd, preco)
  }, 0)

  const desconto_total = calcularDescontoTotal(subtotal, desconto)
  const total = Math.max(subtotal - desconto_total, 0)

  return { subtotal, desconto_total, total }
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
