import { describe, it, expect } from 'vitest'
import {
  calcularSubtotalItem,
  calcularDescontoTotal,
  calcularTotaisOrcamento,
  calcularResumoFinanciamento,
} from './calculos'
import type {
  DescontoInput,
  PagamentoFinanciamentoInput,
} from './calculos'

describe('calcularSubtotalItem', () => {
  it('multiplies quantity by unit price', () => {
    expect(calcularSubtotalItem(3, 10)).toBe(30)
  })

  it('returns 0 when quantity is 0', () => {
    expect(calcularSubtotalItem(0, 100)).toBe(0)
  })

  it('returns 0 when price is 0', () => {
    expect(calcularSubtotalItem(5, 0)).toBe(0)
  })

  it('handles decimal values', () => {
    expect(calcularSubtotalItem(2.5, 4.4)).toBeCloseTo(11)
  })
})

describe('calcularDescontoTotal', () => {
  it('returns 0 when no discount', () => {
    expect(calcularDescontoTotal(1000)).toBe(0)
    expect(calcularDescontoTotal(1000, undefined)).toBe(0)
  })

  it('returns 0 when discount tipo is null', () => {
    const desconto: DescontoInput = { tipo: null, valor: 10 }
    expect(calcularDescontoTotal(1000, desconto)).toBe(0)
  })

  it('returns 0 when discount value is 0', () => {
    const desconto: DescontoInput = { tipo: 'fixo', valor: 0 }
    expect(calcularDescontoTotal(1000, desconto)).toBe(0)
  })

  it('returns 0 when discount value is negative', () => {
    const desconto: DescontoInput = { tipo: 'fixo', valor: -5 }
    expect(calcularDescontoTotal(1000, desconto)).toBe(0)
  })

  it('calculates percentage discount', () => {
    const desconto: DescontoInput = { tipo: 'percentual', valor: 10 }
    expect(calcularDescontoTotal(1000, desconto)).toBe(100)
  })

  it('caps percentage discount at 100%', () => {
    const desconto: DescontoInput = { tipo: 'percentual', valor: 150 }
    expect(calcularDescontoTotal(1000, desconto)).toBe(1000)
  })

  it('calculates fixed discount', () => {
    const desconto: DescontoInput = { tipo: 'fixo', valor: 50 }
    expect(calcularDescontoTotal(1000, desconto)).toBe(50)
  })

  it('caps fixed discount at subtotal', () => {
    const desconto: DescontoInput = { tipo: 'fixo', valor: 2000 }
    expect(calcularDescontoTotal(1000, desconto)).toBe(1000)
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

  it('applies percentage discount', () => {
    const itens = [{ quantidade: '1', preco_unitario: '200' }]
    const desconto: DescontoInput = { tipo: 'percentual', valor: 10 }

    const result = calcularTotaisOrcamento(itens, desconto)

    expect(result.subtotal).toBe(200)
    expect(result.desconto_total).toBe(20)
    expect(result.total).toBe(180)
  })

  it('applies fixed discount', () => {
    const itens = [{ quantidade: '1', preco_unitario: '500' }]
    const desconto: DescontoInput = { tipo: 'fixo', valor: 100 }

    const result = calcularTotaisOrcamento(itens, desconto)

    expect(result.subtotal).toBe(500)
    expect(result.desconto_total).toBe(100)
    expect(result.total).toBe(400)
  })

  it('total is never negative', () => {
    const itens = [{ quantidade: '1', preco_unitario: '50' }]
    const desconto: DescontoInput = { tipo: 'fixo', valor: 100 }

    const result = calcularTotaisOrcamento(itens, desconto)

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
