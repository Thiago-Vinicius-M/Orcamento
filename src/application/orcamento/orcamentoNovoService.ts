import { fetchCurrentRole } from '../../auth/fetchCurrentRole'
import { parseDecimalInput, parseNullableDecimalInput } from '../../domain/financeiro/numero'
import type { OrcamentoTotais } from '../../domain/orcamento/calculos'
import { calcularSubtotalItem } from '../../domain/orcamento/calculos'
import {
  descontoVendedorExcedeTeto,
  mensagemValorMaximoDescontoVendedor,
} from '../../domain/orcamento/descontoVendedor'
import type { PagamentoForm } from '../../domain/orcamento/pagamento'
import { getDefaultSupabase } from '../../lib/supabaseClient'
import { getCompanySettingsRow } from '../../repositories/companySettingsRepository'
import { getOrcamentoContextWithClient } from '../../repositories/orcamento/orcamentoContextProvider'
import { nextOrcamentoNumeroPdf } from '../../repositories/orcamento/orcamentoNumeracaoService'
import {
  insertOrcamento,
  insertOrcamentoItens,
  insertOrcamentoPagamento,
} from '../../repositories/orcamento/orcamentoWriteRepo'

export type { PagamentoTipo, PagamentoForm } from '../../domain/orcamento/pagamento'

export type ItemForm = {
  produto_id: string
  quantidade: string
  preco_unitario: string
  desconto_percentual: string
}

type CriarOrcamentoInput = {
  clienteId: string
  itens: ItemForm[]
  pagamento: PagamentoForm
  totais: OrcamentoTotais
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

  const supabase = getDefaultSupabase()
  const [{ company_id, vendedor_id }, roleResult, companyRow] = await Promise.all([
    getOrcamentoContextWithClient(supabase),
    fetchCurrentRole(supabase),
    getCompanySettingsRow(),
  ])

  if (!roleResult.ok) {
    throw new Error(roleResult.message)
  }

  const teto = companyRow.max_desconto_vendedor_percentual
  if (roleResult.role === 'vendedor' && teto !== null) {
    if (descontoVendedorExcedeTeto(input.totais.subtotal, input.totais.desconto_total, teto)) {
      throw new Error(mensagemValorMaximoDescontoVendedor(teto))
    }
  }

  const numero_pdf = await nextOrcamentoNumeroPdf()

  const orcamentoId = await insertOrcamento({
    cliente_id: input.clienteId,
    company_id,
    vendedor_id,
    numero_pdf,
    subtotal: input.totais.subtotal,
    desconto_total: input.totais.desconto_total,
    total: input.totais.total,
    desconto_tipo: null,
    desconto_valor: 0,
  })

  const itensPayload = itensValidos.map((item) => {
    const quantidade = parseDecimalInput(item.quantidade)
    const precoUnitario = parseDecimalInput(item.preco_unitario)
    const descontoPercentual = parseDecimalInput(item.desconto_percentual)

    return {
      orcamento_id: orcamentoId,
      produto_id: item.produto_id,
      quantidade,
      preco_unitario: precoUnitario,
      desconto_percentual: descontoPercentual,
      subtotal: calcularSubtotalItem(quantidade, precoUnitario, descontoPercentual),
    }
  })

  await insertOrcamentoItens(itensPayload)

  const pagamentoPayload: {
    orcamento_id: string
    tipo: string
    valor_entrada?: number | null
    num_parcelas?: number | null
    taxa_servico_percentual?: number | null
    aplicar_taxa?: boolean
    primeiro_vencimento?: string | null
    intervalo_dias?: number | null
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

  if (input.pagamento.tipo === 'credito') {
    pagamentoPayload.num_parcelas =
      input.pagamento.num_parcelas.trim() === '' ? null : Number(input.pagamento.num_parcelas) || null
  }

  if (input.pagamento.tipo === 'boleto') {
    pagamentoPayload.num_parcelas =
      input.pagamento.num_parcelas.trim() === '' ? null : Number(input.pagamento.num_parcelas) || null
    pagamentoPayload.primeiro_vencimento = input.pagamento.primeiro_vencimento.trim() || null
    pagamentoPayload.intervalo_dias =
      input.pagamento.intervalo_dias.trim() === '' ? null : Number(input.pagamento.intervalo_dias) || null
  }

  await insertOrcamentoPagamento(pagamentoPayload)
  return orcamentoId
}
