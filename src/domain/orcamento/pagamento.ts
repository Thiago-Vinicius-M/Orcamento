import { formatCurrencyBRL } from '../financeiro/moeda'
import { parseNullableDecimalInput } from '../financeiro/numero'
import type { OrcamentoTotais } from './calculos'
import { calcularResumoFinanciamento } from './calculos'
import {
  calcularParcelasCredito,
  calcularParcelasBoleto,
  formatarDataBR,
  gerarVencimentosBoleto,
} from './parcelamento'
import {
  isPagamentoTipoSimples,
  type PagamentoTipoSimples,
} from '../pagamento/PaymentTypeRegistry'

// Re-exports para compatibilidade com importadores existentes
export type { PagamentoTipo, PagamentoTipoSimples } from '../pagamento/PaymentTypeRegistry'
export { isPagamentoTipoSimples }

/** Shape mínimo do bloco pagamento vindo de fontes externas ao domínio (ex.: apresentação PDF). */
export type PagamentoPdfInput = {
  tipo: string
  valor_entrada?: number | null
  num_parcelas?: number | null
  taxa_servico_percentual?: number | null
  aplicar_taxa?: boolean | null
  primeiro_vencimento?: string | null
  intervalo_dias?: number | null
}

/** Alias amplo: qualquer tipo não-financiamento. */
export type PagamentoTipoBasico = 'dinheiro' | 'debito' | 'credito' | 'pix' | 'boleto'

export type PagamentoBasico = { tipo: 'dinheiro' | 'debito' | 'pix' }

export type PagamentoCredito = {
  tipo: 'credito'
  num_parcelas: number | null
}

export type PagamentoBoleto = {
  tipo: 'boleto'
  num_parcelas: number | null
  primeiro_vencimento: string | null
  intervalo_dias: number | null
}

export type PagamentoFinanciamento = {
  tipo: 'financiamento'
  valor_entrada: number | null
  num_parcelas: number | null
  taxa_servico_percentual: number | null
  aplicar_taxa: boolean
}

export type Pagamento = PagamentoBasico | PagamentoCredito | PagamentoBoleto | PagamentoFinanciamento

export type PagamentoForm = {
  tipo: 'dinheiro' | 'debito' | 'credito' | 'pix' | 'boleto' | 'financiamento'
  valor_entrada: string
  num_parcelas: string
  taxa_servico_percentual: string
  aplicar_taxa: boolean
  primeiro_vencimento: string
  intervalo_dias: string
}

/** Campos gravados em `orcamento_pagamento` (exceto `orcamento_id`). */
export type OrcamentoPagamentoInsertFields = {
  tipo: 'dinheiro' | 'debito' | 'credito' | 'pix' | 'boleto' | 'financiamento'
  valor_entrada?: number | null
  num_parcelas?: number | null
  taxa_servico_percentual?: number | null
  aplicar_taxa?: boolean
  primeiro_vencimento?: string | null
  intervalo_dias?: number | null
}

/** Guard amplo: qualquer tipo não-financiamento. */
export function isPagamentoTipoBasico(value: string): value is PagamentoTipoBasico {
  return value !== 'financiamento' && ['dinheiro', 'debito', 'credito', 'pix', 'boleto'].includes(value)
}

export function isPagamentoFinanciamento(p: Pagamento): p is PagamentoFinanciamento {
  return p.tipo === 'financiamento'
}

export function isPagamentoCredito(p: Pagamento): p is PagamentoCredito {
  return p.tipo === 'credito'
}

export function isPagamentoBoleto(p: Pagamento): p is PagamentoBoleto {
  return p.tipo === 'boleto'
}

export function pagamentoFromPdfModel(p: PagamentoPdfInput): Pagamento {
  if (p.tipo === 'financiamento') {
    return {
      tipo: 'financiamento',
      valor_entrada: p.valor_entrada ?? null,
      num_parcelas: p.num_parcelas ?? null,
      taxa_servico_percentual: p.taxa_servico_percentual ?? null,
      aplicar_taxa: p.aplicar_taxa ?? false,
    }
  }
  if (p.tipo === 'credito') {
    return { tipo: 'credito', num_parcelas: p.num_parcelas ?? null }
  }
  if (p.tipo === 'boleto') {
    return {
      tipo: 'boleto',
      num_parcelas: p.num_parcelas ?? null,
      primeiro_vencimento: p.primeiro_vencimento ?? null,
      intervalo_dias: p.intervalo_dias ?? null,
    }
  }
  if (isPagamentoTipoSimples(p.tipo)) {
    return { tipo: p.tipo }
  }
  throw new Error(`Tipo de pagamento inválido: ${String(p.tipo)}`)
}

export function pagamentoFromForm(form: PagamentoForm): Pagamento {
  if (form.tipo === 'financiamento') {
    return {
      tipo: 'financiamento',
      valor_entrada: parseNullableDecimalInput(form.valor_entrada),
      num_parcelas:
        form.num_parcelas.trim() === '' ? null : Number(form.num_parcelas) || null,
      taxa_servico_percentual: parseNullableDecimalInput(form.taxa_servico_percentual),
      aplicar_taxa: form.aplicar_taxa,
    }
  }
  if (form.tipo === 'credito') {
    return {
      tipo: 'credito',
      num_parcelas: form.num_parcelas.trim() === '' ? null : Number(form.num_parcelas) || null,
    }
  }
  if (form.tipo === 'boleto') {
    return {
      tipo: 'boleto',
      num_parcelas: form.num_parcelas.trim() === '' ? null : Number(form.num_parcelas) || null,
      primeiro_vencimento: form.primeiro_vencimento.trim() || null,
      intervalo_dias: form.intervalo_dias.trim() === '' ? null : Number(form.intervalo_dias) || null,
    }
  }
  if (isPagamentoTipoSimples(form.tipo)) {
    return { tipo: form.tipo }
  }
  throw new Error(`Tipo de pagamento inválido: ${form.tipo}`)
}

export function pagamentoFromDetalheRow(pagamento: {
  tipo: string
  valor_entrada?: number | null
  num_parcelas?: number | null
  taxa_servico_percentual?: number | null
  aplicar_taxa?: boolean | null
  primeiro_vencimento?: string | null
  intervalo_dias?: number | null
}): Pagamento | null {
  if (pagamento.tipo === 'financiamento') {
    return {
      tipo: 'financiamento',
      valor_entrada: pagamento.valor_entrada ?? null,
      num_parcelas: pagamento.num_parcelas ?? null,
      taxa_servico_percentual: pagamento.taxa_servico_percentual ?? null,
      aplicar_taxa: pagamento.aplicar_taxa ?? false,
    }
  }
  if (pagamento.tipo === 'credito') {
    return { tipo: 'credito', num_parcelas: pagamento.num_parcelas ?? null }
  }
  if (pagamento.tipo === 'boleto') {
    return {
      tipo: 'boleto',
      num_parcelas: pagamento.num_parcelas ?? null,
      primeiro_vencimento: pagamento.primeiro_vencimento ?? null,
      intervalo_dias: pagamento.intervalo_dias ?? null,
    }
  }
  if (isPagamentoTipoSimples(pagamento.tipo)) {
    return { tipo: pagamento.tipo as PagamentoTipoSimples }
  }
  return null
}

export interface PagamentoStrategy {
  buildInsertFields(p: Pagamento, _totais: OrcamentoTotais): OrcamentoPagamentoInsertFields
  buildResumoPdf(p: Pagamento, totais: OrcamentoTotais): string
}

const basicoStrategy: PagamentoStrategy = {
  buildInsertFields(p) {
    if (!isPagamentoTipoSimples(p.tipo)) {
      throw new Error(`Estratégia básica não suporta tipo: ${p.tipo}`)
    }
    return { tipo: p.tipo }
  },
  buildResumoPdf(p) {
    return `Forma: ${p.tipo}`
  },
}

const creditoStrategy: PagamentoStrategy = {
  buildInsertFields(p) {
    if (p.tipo !== 'credito') throw new Error('Estratégia crédito recebeu tipo incorreto.')
    return {
      tipo: 'credito',
      num_parcelas: (p as PagamentoCredito).num_parcelas,
    }
  },
  buildResumoPdf(p, totais) {
    if (p.tipo !== 'credito') throw new Error('Estratégia crédito recebeu tipo incorreto.')
    const { num_parcelas } = p as PagamentoCredito
    const n = num_parcelas ?? 1
    const parcelas = calcularParcelasCredito(totais.total, n)
    const valorParcela = parcelas[0]?.valor ?? totais.total
    return `Crédito | ${n}x de ${formatCurrencyBRL(valorParcela)}`
  },
}

const boletoStrategy: PagamentoStrategy = {
  buildInsertFields(p) {
    if (p.tipo !== 'boleto') throw new Error('Estratégia boleto recebeu tipo incorreto.')
    const b = p as PagamentoBoleto
    return {
      tipo: 'boleto',
      num_parcelas: b.num_parcelas,
      primeiro_vencimento: b.primeiro_vencimento,
      intervalo_dias: b.intervalo_dias,
    }
  },
  buildResumoPdf(p, totais) {
    if (p.tipo !== 'boleto') throw new Error('Estratégia boleto recebeu tipo incorreto.')
    const b = p as PagamentoBoleto
    const n = b.num_parcelas ?? 1
    if (!b.primeiro_vencimento || !b.intervalo_dias) {
      return `Boleto | ${n}x`
    }
    const datas = gerarVencimentosBoleto(b.primeiro_vencimento, b.intervalo_dias, n)
    const parcelas = calcularParcelasBoleto(totais.total, datas)
    const valorParcela = parcelas[0]?.valor ?? totais.total
    const inicio = formatarDataBR(datas[0] ?? '')
    const fim = formatarDataBR(datas[datas.length - 1] ?? '')
    return `Boleto | ${n}x | ${inicio} → ${fim} | ${formatCurrencyBRL(valorParcela)}/parcela`
  },
}

const financiamentoStrategy: PagamentoStrategy = {
  buildInsertFields(p) {
    if (p.tipo !== 'financiamento') {
      throw new Error('Estratégia de financiamento recebeu pagamento básico.')
    }
    return {
      tipo: 'financiamento',
      valor_entrada: p.valor_entrada,
      num_parcelas: p.num_parcelas,
      taxa_servico_percentual: p.taxa_servico_percentual,
      aplicar_taxa: p.aplicar_taxa,
    }
  },
  buildResumoPdf(p, totais) {
    if (p.tipo !== 'financiamento') {
      throw new Error('Estratégia de financiamento recebeu pagamento básico.')
    }
    const base = `Forma: ${p.tipo}`

    const { entrada, valorFinanciado, parcelas, taxa, aplicarTaxa, valorParcela } =
      calcularResumoFinanciamento({
        total: totais.total,
        valor_entrada: p.valor_entrada,
        num_parcelas: p.num_parcelas,
        taxa_servico_percentual: p.taxa_servico_percentual,
        aplicar_taxa: p.aplicar_taxa,
      })

    const taxaNominalTotal =
      aplicarTaxa && taxa > 0 ? Math.max(0, valorFinanciado * (taxa / 100)) : 0
    const taxaPorParcela =
      taxaNominalTotal > 0 && parcelas > 0 ? taxaNominalTotal / parcelas : 0

    return [
      base,
      `Entrada: ${formatCurrencyBRL(entrada)}`,
      `Valor financiado: ${formatCurrencyBRL(valorFinanciado)}`,
      aplicarTaxa && taxa > 0 ? `Taxa serviço: ${taxa.toFixed(2)}%` : undefined,
      `Parcelas: ${parcelas} x ${formatCurrencyBRL(valorParcela)} | Incluindo ${formatCurrencyBRL(taxaPorParcela)} de taxa por parcela`,
    ]
      .filter(Boolean)
      .join(' | ')
  },
}

export const pagamentoStrategy: { [K in Pagamento['tipo']]: PagamentoStrategy } = {
  dinheiro: basicoStrategy,
  debito: basicoStrategy,
  pix: basicoStrategy,
  credito: creditoStrategy,
  boleto: boletoStrategy,
  financiamento: financiamentoStrategy,
}

export function getPagamentoStrategy(p: Pagamento): PagamentoStrategy {
  return pagamentoStrategy[p.tipo]
}

export function buildPagamentoResumoPdf(p: Pagamento, totais: OrcamentoTotais): string {
  return getPagamentoStrategy(p).buildResumoPdf(p, totais)
}
