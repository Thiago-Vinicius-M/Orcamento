import { describe, it, expect } from 'vitest'
import { Money } from './money'

describe('Money', () => {
  it('zero', () => {
    expect(Money.zero().toCentavos()).toBe(0)
    expect(Money.zero().toBRL()).toMatch(/R\$\s*0,00/)
  })

  it('fromBRLString: vírgula decimal', () => {
    expect(Money.fromBRLString('10,50').toCentavos()).toBe(1050)
    expect(Money.fromBRLString('0,01').toCentavos()).toBe(1)
  })

  it('fromBRLString: milhar pt-BR', () => {
    expect(Money.fromBRLString('1.234,56').toCentavos()).toBe(123456)
  })

  it('fromBRLString: remove símbolo R$', () => {
    expect(Money.fromBRLString('R$ 42,00').toCentavos()).toBe(4200)
  })

  it('fromNumberBRL: half-even nos centavos', () => {
    expect(Money.fromNumberBRL(0.105).toCentavos()).toBe(10)
    expect(Money.fromNumberBRL(0.115).toCentavos()).toBe(12)
    expect(Money.fromNumberBRL(0.125).toCentavos()).toBe(12)
    expect(Money.fromNumberBRL(0.135).toCentavos()).toBe(14)
  })

  it('add / sub', () => {
    const a = Money.fromCentavos(100)
    const b = Money.fromCentavos(50)
    expect(a.add(b).toCentavos()).toBe(150)
    expect(a.sub(b).toCentavos()).toBe(50)
  })

  it('mul arredonda centavos', () => {
    expect(Money.fromCentavos(100).mul(0.333).toCentavos()).toBe(33)
  })

  it('toNumber', () => {
    expect(Money.fromCentavos(12345).toNumber()).toBe(123.45)
  })
})
