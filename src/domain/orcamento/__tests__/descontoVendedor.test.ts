import { describe, it, expect } from 'vitest'
import { calcularDescontoTotal, type DescontoInput } from '../calculos'
import {
  PERCENTUAL_DESCONTO_VENDEDOR_TETO_EPS,
  descontoVendedorExcedeTeto,
  mensagemValorMaximoDescontoVendedor,
  percentualDescontoEfetivoSobreSubtotal,
} from '../descontoVendedor'

describe('percentualDescontoEfetivoSobreSubtotal', () => {
  it('subtotal zero: retorna 0 (evita divisão por zero)', () => {
    expect(percentualDescontoEfetivoSobreSubtotal(0, 0)).toBe(0)
    expect(percentualDescontoEfetivoSobreSubtotal(0, 50)).toBe(0)
  })

  it('subtotal negativo: retorna 0', () => {
    expect(percentualDescontoEfetivoSobreSubtotal(-100, 10)).toBe(0)
  })

  it('desconto zero: percentual efetivo 0', () => {
    expect(percentualDescontoEfetivoSobreSubtotal(1_000, 0)).toBe(0)
  })
})

describe('mensagemValorMaximoDescontoVendedor', () => {
  it('inteiro sem decimais desnecessários', () => {
    expect(mensagemValorMaximoDescontoVendedor(7)).toBe('Valor máximo de desconto: 7%')
  })

  it('decimal usa formatação pt-BR', () => {
    expect(mensagemValorMaximoDescontoVendedor(7.5)).toBe('Valor máximo de desconto: 7,5%')
  })
})

describe('descontoVendedorExcedeTeto', () => {
  it('subtotal zero: não excede teto arbitrário (efetivo tratado como 0)', () => {
    expect(descontoVendedorExcedeTeto(0, 0, 7)).toBe(false)
    expect(descontoVendedorExcedeTeto(0, 0, 0.5)).toBe(false)
  })

  it('desconto zero com teto 7%: permitido', () => {
    expect(descontoVendedorExcedeTeto(500, 0, 7)).toBe(false)
  })

  it('teto null: nunca excede', () => {
    expect(descontoVendedorExcedeTeto(100, 99, null)).toBe(false)
  })

  it('limite exato 7% alinhado a calcularDescontoTotal: não bloqueia', () => {
    const subtotal = 1_000
    const desconto: DescontoInput = { tipo: 'percentual', valor: 7 }
    const desconto_total = calcularDescontoTotal(subtotal, desconto)
    expect(desconto_total).toBe(70)
    expect(percentualDescontoEfetivoSobreSubtotal(subtotal, desconto_total)).toBeCloseTo(7, 12)
    expect(descontoVendedorExcedeTeto(subtotal, desconto_total, 7)).toBe(false)
  })

  it('ligeiramente acima de 7% (7.1%) com mesmo teto: bloqueia', () => {
    const subtotal = 1_000
    const desconto: DescontoInput = { tipo: 'percentual', valor: 7.1 }
    const desconto_total = calcularDescontoTotal(subtotal, desconto)
    expect(desconto_total).toBe(71)
    const efetivo = percentualDescontoEfetivoSobreSubtotal(subtotal, desconto_total)
    expect(efetivo).toBeCloseTo(7.1, 12)
    expect(descontoVendedorExcedeTeto(subtotal, desconto_total, 7)).toBe(true)
  })

  it('comparação usa epsilon exportado', () => {
    const teto = 7
    const logoAcima = teto + PERCENTUAL_DESCONTO_VENDEDOR_TETO_EPS * 2
    expect(descontoVendedorExcedeTeto(100, logoAcima, teto)).toBe(true)
    const noLimiteRuido = teto + PERCENTUAL_DESCONTO_VENDEDOR_TETO_EPS / 2
    expect(descontoVendedorExcedeTeto(100, noLimiteRuido, teto)).toBe(false)
  })
})
