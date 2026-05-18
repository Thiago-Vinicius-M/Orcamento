import { describe, it, expect } from 'vitest'
import {
  calcularSubtotalItem,
  calcularResumoFinanciamento,
  type PagamentoFinanciamentoInput,
} from '../calculos'

describe('calcularSubtotalItem (fronteiras)', () => {
  it('desconto exatamente 100% zera o subtotal', () => {
    expect(calcularSubtotalItem(2, 500, 100)).toBe(0)
  })

  it('desconto exatamente 0% não altera subtotal', () => {
    expect(calcularSubtotalItem(2, 500, 0)).toBe(1000)
  })
})

describe('calcularResumoFinanciamento (fronteiras)', () => {
  it('parcelas 0 com taxa aplicada: valorParcela converge ao totalComTaxa', () => {
    const input: PagamentoFinanciamentoInput = {
      total: 900,
      valor_entrada: 100,
      num_parcelas: 0,
      taxa_servico_percentual: 5,
      aplicar_taxa: true,
    }
    const r = calcularResumoFinanciamento(input)
    expect(r.parcelas).toBe(0)
    expect(r.valorFinanciado).toBe(800)
    expect(r.totalComTaxa).toBe(840)
    expect(r.valorParcela).toBe(840)
  })

  it('taxa 0 com aplicar_taxa true não altera total financiado', () => {
    const input: PagamentoFinanciamentoInput = {
      total: 500,
      valor_entrada: null,
      num_parcelas: 5,
      taxa_servico_percentual: 0,
      aplicar_taxa: true,
    }
    const r = calcularResumoFinanciamento(input)
    expect(r.totalComTaxa).toBe(500)
    expect(r.valorParcela).toBe(100)
  })

  it('taxa positiva com aplicar_taxa false mantém valorParcela sem taxa', () => {
    const input: PagamentoFinanciamentoInput = {
      total: 1_200,
      valor_entrada: 200,
      num_parcelas: 4,
      taxa_servico_percentual: 10,
      aplicar_taxa: false,
    }
    const r = calcularResumoFinanciamento(input)
    expect(r.valorFinanciado).toBe(1_000)
    expect(r.totalComTaxa).toBe(1_000)
    expect(r.valorParcela).toBe(250)
  })

  it('entrada null, parcelas 0 e sem taxa', () => {
    const input: PagamentoFinanciamentoInput = {
      total: 300,
      valor_entrada: null,
      num_parcelas: 0,
      taxa_servico_percentual: null,
      aplicar_taxa: false,
    }
    const r = calcularResumoFinanciamento(input)
    expect(r.entrada).toBe(0)
    expect(r.valorParcela).toBe(300)
  })
})
