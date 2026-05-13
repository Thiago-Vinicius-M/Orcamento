import { formatCurrencyBRL } from '../financeiro/moeda'
import { parseNullableDecimalInput } from '../financeiro/numero'
import type { OrcamentoTotais } from './calculos'
import { calcularResumoFinanciamento } from './calculos'

const PAGAMENTO_TIPOS_BASICOS = ['dinheiro', 'debito', 'credito', 'pix', 'boleto'] as const

/** Shape mínimo do bloco pagamento vindo de fontes externas ao domínio (ex.: apresentação PDF). */
export type PagamentoPdfInput = {
  tipo: string
  valor_entrada?: number | null
  num_parcelas?: number | null
  taxa_servico_percentual?: number | null
  aplicar_taxa?: boolean | null
}

export type PagamentoTipoBasico = (typeof PAGAMENTO_TIPOS_BASICOS)[number]
export type PagamentoTipo = PagamentoTipoBasico | 'financiamento'

export type PagamentoBasico = {
  tipo: PagamentoTipoBasico
}

export type PagamentoFinanciamento = {
  tipo: 'financiamento'
  valor_entrada: number | null
  num_parcelas: number | null
  taxa_servico_percentual: number | null
  aplicar_taxa: boolean
}

export type Pagamento = PagamentoBasico | PagamentoFinanciamento

export type PagamentoForm = {
  tipo: PagamentoTipo
  valor_entrada: string
  num_parcelas: string
  taxa_servico_percentual: string
  aplicar_taxa: boolean
}

/** Campos gravados em `orcamento_pagamento` (exceto `orcamento_id`). */
export type OrcamentoPagamentoInsertFields = {
  tipo: PagamentoTipo
  valor_entrada?: number | null
  num_parcelas?: number | null
  taxa_servico_percentual?: number | null
  aplicar_taxa?: boolean
}

export function isPagamentoTipoBasico(value: string): value is PagamentoTipoBasico {
  return (PAGAMENTO_TIPOS_BASICOS as readonly string[]).includes(value)
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
  if (isPagamentoTipoBasico(p.tipo)) {
    return { tipo: p.tipo }
  }
  throw new Error(`Tipo de pagamento inválido: ${String(p.tipo)}`)
}

export function isPagamentoFinanciamento(p: Pagamento): p is PagamentoFinanciamento {
  return p.tipo === 'financiamento'
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
  if (isPagamentoTipoBasico(form.tipo)) {
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
  if (isPagamentoTipoBasico(pagamento.tipo)) {
    return { tipo: pagamento.tipo }
  }
  return null
}

export interface PagamentoStrategy {
  buildInsertFields(p: Pagamento, _totais: OrcamentoTotais): OrcamentoPagamentoInsertFields
  buildResumoPdf(p: Pagamento, totais: OrcamentoTotais): string
}

const basicoStrategy: PagamentoStrategy = {
  buildInsertFields(p) {
    if (p.tipo === 'financiamento') {
      throw new Error('Estratégia de pagamento básica recebeu financiamento.')
    }
    return { tipo: p.tipo }
  },
  buildResumoPdf(p, _totais) {
    if (p.tipo === 'financiamento') {
      throw new Error('Estratégia de pagamento básica recebeu financiamento.')
    }
    return `Forma: ${p.tipo}`
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
  credito: basicoStrategy,
  pix: basicoStrategy,
  boleto: basicoStrategy,
  financiamento: financiamentoStrategy,
}

export function getPagamentoStrategy(p: Pagamento): PagamentoStrategy {
  return pagamentoStrategy[p.tipo]
}

export function buildPagamentoResumoPdf(p: Pagamento, totais: OrcamentoTotais): string {
  return getPagamentoStrategy(p).buildResumoPdf(p, totais)
}
