import { describe, it, expect } from 'vitest'
import {
  calcularSubtotalItem,
  calcularSubtotalBrutoItem,
  calcularTotaisOrcamento,
  calcularResumoFinanciamento,
} from './calculos'
import type { PagamentoFinanciamentoInput } from './calculos'

describe('calcularSubtotalBrutoItem', () => {
  it('multiplies quantity by unit price', () => {
    expect(calcularSubtotalBrutoItem(3, 10)).toBe(30)
  })

  it('returns 0 when quantity is 0', () => {
    expect(calcularSubtotalBrutoItem(0, 100)).toBe(0)
  })
})

describe('calcularSubtotalItem', () => {
  it('no discount: equals bruto', () => {
    expect(calcularSubtotalItem(3, 10)).toBe(30)
    expect(calcularSubtotalItem(3, 10, 0)).toBe(30)
  })

  it('returns 0 when quantity is 0', () => {
    expect(calcularSubtotalItem(0, 100, 10)).toBe(0)
  })

  it('returns 0 when price is 0', () => {
    expect(calcularSubtotalItem(5, 0, 10)).toBe(0)
  })

  it('applies percentage discount', () => {
    expect(calcularSubtotalItem(1, 100, 10)).toBe(90)
  })

  it('caps discount at 100%', () => {
    expect(calcularSubtotalItem(1, 100, 150)).toBe(0)
  })

  it('clamps negative discount to 0', () => {
    expect(calcularSubtotalItem(1, 100, -5)).toBe(100)
  })

  it('handles decimal values', () => {
    expect(calcularSubtotalItem(2.5, 4.4, 0)).toBeCloseTo(11)
  })
})

describe('calcularTotaisOrcamento', () => {
  it('calculates totals for multiple items without discount', () => {
    const itens = [
      { quantidade: '2', preco_unitario: '100' },
      { quantidade: '3', preco_unitario: '50' },
    ]

    const result = calcularTotaisOrcamento(itens)

    expect(result.subtotal).toBe(350)
    expect(result.desconto_total).toBe(0)
    expect(result.total).toBe(350)
  })

  it('applies per-item percentage discount', () => {
    const itens = [{ quantidade: '1', preco_unitario: '200', desconto_percentual: '10' }]

    const result = calcularTotaisOrcamento(itens)

    expect(result.subtotal).toBe(200)
    expect(result.desconto_total).toBe(20)
    expect(result.total).toBe(180)
  })

  it('mixes items with and without discount', () => {
    const itens = [
      { quantidade: '1', preco_unitario: '100', desconto_percentual: '10' },
      { quantidade: '1', preco_unitario: '100' },
    ]

    const result = calcularTotaisOrcamento(itens)

    expect(result.subtotal).toBe(200)
    expect(result.desconto_total).toBe(10)
    expect(result.total).toBe(190)
  })

  it('total is never negative', () => {
    const itens = [{ quantidade: '1', preco_unitario: '50', desconto_percentual: '100' }]

    const result = calcularTotaisOrcamento(itens)

    expect(result.total).toBe(0)
  })

  it('handles empty items', () => {
    const result = calcularTotaisOrcamento([])

    expect(result.subtotal).toBe(0)
    expect(result.desconto_total).toBe(0)
    expect(result.total).toBe(0)
  })

  it('parses comma-separated decimals from input strings', () => {
    const itens = [{ quantidade: '2,5', preco_unitario: '10,00' }]

    const result = calcularTotaisOrcamento(itens)

    expect(result.subtotal).toBe(25)
  })
})

describe('calcularResumoFinanciamento', () => {
  it('calculates basic financing without fee', () => {
    const input: PagamentoFinanciamentoInput = {
      total: 1000,
      valor_entrada: 200,
      num_parcelas: 4,
      taxa_servico_percentual: 0,
      aplicar_taxa: false,
    }

    const result = calcularResumoFinanciamento(input)

    expect(result.entrada).toBe(200)
    expect(result.valorFinanciado).toBe(800)
    expect(result.parcelas).toBe(4)
    expect(result.totalComTaxa).toBe(800)
    expect(result.valorParcela).toBe(200)
  })

  it('applies service fee when enabled', () => {
    const input: PagamentoFinanciamentoInput = {
      total: 1000,
      valor_entrada: 0,
      num_parcelas: 10,
      taxa_servico_percentual: 10,
      aplicar_taxa: true,
    }

    const result = calcularResumoFinanciamento(input)

    expect(result.valorFinanciado).toBe(1000)
    expect(result.totalComTaxa).toBe(1100)
    expect(result.valorParcela).toBe(110)
  })

  it('does not apply fee when aplicar_taxa is false', () => {
    const input: PagamentoFinanciamentoInput = {
      total: 1000,
      valor_entrada: 0,
      num_parcelas: 10,
      taxa_servico_percentual: 10,
      aplicar_taxa: false,
    }

    const result = calcularResumoFinanciamento(input)

    expect(result.totalComTaxa).toBe(1000)
    expect(result.valorParcela).toBe(100)
  })

  it('handles null values with defaults', () => {
    const input: PagamentoFinanciamentoInput = {
      total: 500,
      valor_entrada: null,
      num_parcelas: null,
      taxa_servico_percentual: null,
      aplicar_taxa: false,
    }

    const result = calcularResumoFinanciamento(input)

    expect(result.entrada).toBe(0)
    expect(result.valorFinanciado).toBe(500)
    expect(result.parcelas).toBe(1)
    expect(result.valorParcela).toBe(500)
  })

  it('clamps financed value to zero when down payment exceeds total', () => {
    const input: PagamentoFinanciamentoInput = {
      total: 500,
      valor_entrada: 800,
      num_parcelas: 5,
      taxa_servico_percentual: null,
      aplicar_taxa: false,
    }

    const result = calcularResumoFinanciamento(input)

    expect(result.valorFinanciado).toBe(0)
    expect(result.valorParcela).toBe(0)
  })

  it('handles zero installments', () => {
    const input: PagamentoFinanciamentoInput = {
      total: 1000,
      valor_entrada: 0,
      num_parcelas: 0,
      taxa_servico_percentual: null,
      aplicar_taxa: false,
    }

    const result = calcularResumoFinanciamento(input)

    expect(result.totalComTaxa).toBe(1000)
    expect(result.valorParcela).toBe(1000)
  })
})
