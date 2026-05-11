import { parseDecimalInput, parseNullableDecimalInput } from '../../domain/financeiro/numero'
import type { OrcamentoTotais } from '../../domain/orcamento/calculos'
import { calcularSubtotalItem } from '../../domain/orcamento/calculos'
import {
  getOrcamentoContext,
  insertOrcamento,
  insertOrcamentoItens,
  insertOrcamentoPagamento,
  nextOrcamentoNumeroPdf,
} from '../../repositories/orcamentoSupabaseRepository'

export type PagamentoTipo = 'dinheiro' | 'debito' | 'credito' | 'pix' | 'boleto' | 'financiamento'

export type ItemForm = {
  produto_id: string
  quantidade: string
  preco_unitario: string
}

export type PagamentoForm = {
  tipo: PagamentoTipo
  valor_entrada: string
  num_parcelas: string
  taxa_servico_percentual: string
  aplicar_taxa: boolean
}

export type DescontoForm = {
  tipo: 'percentual' | 'fixo' | ''
  valor: string
}

type CriarOrcamentoInput = {
  clienteId: string
  itens: ItemForm[]
  pagamento: PagamentoForm
  totais: OrcamentoTotais
  desconto: DescontoForm
}

function normalizarItensValidos(itens: ItemForm[]): ItemForm[] {
  return itens.filter((item) => item.produto_id && Number(item.quantidade) > 0)
}

export async function criarOrcamento(input: CriarOrcamentoInput): Promise<string> {
  if (!input.clienteId) {
    throw new Error('Selecione um cliente.')
  }

  const itensValidos = normalizarItensValidos(input.itens)
  if (itensValidos.length === 0) {
    throw new Error('Adicione pelo menos um item com produto e quantidade.')
  }

  const { company_id, vendedor_id } = await getOrcamentoContext()
  const numero_pdf = await nextOrcamentoNumeroPdf()

  const descontoTipo = input.desconto.tipo || null
  const descontoValor = parseDecimalInput(input.desconto.valor)

  const orcamentoId = await insertOrcamento({
    cliente_id: input.clienteId,
    company_id,
    vendedor_id,
    numero_pdf,
    subtotal: input.totais.subtotal,
    desconto_total: input.totais.desconto_total,
    total: input.totais.total,
    desconto_tipo: descontoTipo,
    desconto_valor: descontoValor,
  })

  const itensPayload = itensValidos.map((item) => {
    const quantidade = parseDecimalInput(item.quantidade)
    const precoUnitario = parseDecimalInput(item.preco_unitario)

    return {
      orcamento_id: orcamentoId,
      produto_id: item.produto_id,
      quantidade,
      preco_unitario: precoUnitario,
      subtotal: calcularSubtotalItem(quantidade, precoUnitario),
    }
  })

  await insertOrcamentoItens(itensPayload)

  const pagamentoPayload: {
    orcamento_id: string
    tipo: PagamentoTipo
    valor_entrada?: number | null
    num_parcelas?: number | null
    taxa_servico_percentual?: number | null
    aplicar_taxa?: boolean
  } = {
    orcamento_id: orcamentoId,
    tipo: input.pagamento.tipo,
  }

  if (input.pagamento.tipo === 'financiamento') {
    pagamentoPayload.valor_entrada = parseNullableDecimalInput(input.pagamento.valor_entrada)
    pagamentoPayload.num_parcelas =
      input.pagamento.num_parcelas.trim() === '' ? null : Number(input.pagamento.num_parcelas) || null
    pagamentoPayload.taxa_servico_percentual = parseNullableDecimalInput(input.pagamento.taxa_servico_percentual)
    pagamentoPayload.aplicar_taxa = input.pagamento.aplicar_taxa
  }

  await insertOrcamentoPagamento(pagamentoPayload)
  return orcamentoId
}
