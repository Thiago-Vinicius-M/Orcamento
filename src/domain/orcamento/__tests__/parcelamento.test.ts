import { describe, it, expect } from 'vitest'
import {
  calcularParcelasCredito,
  calcularParcelasBoleto,
  gerarVencimentosBoleto,
  formatarDataBR,
  formatarIntervaloLabel,
} from '../parcelamento'

// ──────────────────────────────────────────────
// calcularParcelasCredito
// ──────────────────────────────────────────────
describe('calcularParcelasCredito', () => {
  it('1x retorna parcela igual ao total', () => {
    const parcelas = calcularParcelasCredito(1000, 1)
    expect(parcelas).toHaveLength(1)
    expect(parcelas[0].valor).toBe(1000)
  })

  it('4x com divisão exata', () => {
    const parcelas = calcularParcelasCredito(1000, 4)
    expect(parcelas).toHaveLength(4)
    parcelas.forEach((p) => expect(p.valor).toBe(250))
  })

  it('3x com residuo: soma é igual ao total', () => {
    const parcelas = calcularParcelasCredito(10, 3)
    expect(parcelas).toHaveLength(3)
    const soma = parcelas.reduce((acc, p) => acc + p.valor, 0)
    expect(Math.round(soma * 100) / 100).toBe(10)
  })

  it('3x com R$ 10,00: últimas parcelas absorvem centavos', () => {
    const parcelas = calcularParcelasCredito(10, 3)
    // 10 / 3 = 3.33, 3.33, 3.34
    expect(parcelas[0].valor).toBe(3.33)
    expect(parcelas[1].valor).toBe(3.33)
    expect(parcelas[2].valor).toBe(3.34)
  })

  it('valor quebrado: soma exata sem perda de centavo', () => {
    const total = 999.99
    const parcelas = calcularParcelasCredito(total, 7)
    const soma = parcelas.reduce((acc, p) => acc + p.valor, 0)
    expect(Math.round(soma * 100) / 100).toBe(total)
  })

  it('total zero retorna array vazio', () => {
    expect(calcularParcelasCredito(0, 3)).toHaveLength(0)
  })

  it('zero parcelas retorna array vazio', () => {
    expect(calcularParcelasCredito(1000, 0)).toHaveLength(0)
  })

  it('numera parcelas corretamente', () => {
    const parcelas = calcularParcelasCredito(100, 3)
    expect(parcelas.map((p) => p.numero)).toEqual([1, 2, 3])
  })
})

// ──────────────────────────────────────────────
// gerarVencimentosBoleto
// ──────────────────────────────────────────────
describe('gerarVencimentosBoleto', () => {
  it('gera 4 datas com intervalo de 7 dias', () => {
    const datas = gerarVencimentosBoleto('2026-05-20', 7, 4)
    expect(datas).toEqual(['2026-05-20', '2026-05-27', '2026-06-03', '2026-06-10'])
  })

  it('virada de mês: 28/01 + 7 dias = 04/02', () => {
    const datas = gerarVencimentosBoleto('2026-01-28', 7, 3)
    expect(datas).toEqual(['2026-01-28', '2026-02-04', '2026-02-11'])
  })

  it('virada de ano: dezembro para janeiro', () => {
    const datas = gerarVencimentosBoleto('2026-12-25', 10, 3)
    expect(datas).toEqual(['2026-12-25', '2027-01-04', '2027-01-14'])
  })

  it('fevereiro em ano não-bissexto: 28 dias', () => {
    const datas = gerarVencimentosBoleto('2026-02-20', 7, 2)
    expect(datas).toEqual(['2026-02-20', '2026-02-27'])
  })

  it('ano bissexto: aceita 29/02', () => {
    const datas = gerarVencimentosBoleto('2028-02-22', 7, 2)
    expect(datas).toEqual(['2028-02-22', '2028-02-29'])
  })

  it('1 parcela retorna apenas a data inicial', () => {
    const datas = gerarVencimentosBoleto('2026-06-01', 15, 1)
    expect(datas).toEqual(['2026-06-01'])
  })

  it('intervalo zero retorna array vazio', () => {
    expect(gerarVencimentosBoleto('2026-05-01', 0, 3)).toHaveLength(0)
  })

  it('zero parcelas retorna array vazio', () => {
    expect(gerarVencimentosBoleto('2026-05-01', 7, 0)).toHaveLength(0)
  })

  it('data vazia retorna array vazio', () => {
    expect(gerarVencimentosBoleto('', 7, 4)).toHaveLength(0)
  })
})

// ──────────────────────────────────────────────
// calcularParcelasBoleto
// ──────────────────────────────────────────────
describe('calcularParcelasBoleto', () => {
  it('distribui total igualmente quando divisível', () => {
    const datas = ['2026-05-20', '2026-05-27', '2026-06-03', '2026-06-10']
    const parcelas = calcularParcelasBoleto(1000, datas)
    expect(parcelas).toHaveLength(4)
    parcelas.forEach((p) => expect(p.valor).toBe(250))
  })

  it('soma das parcelas é igual ao total', () => {
    const datas = gerarVencimentosBoleto('2026-05-20', 7, 3)
    const parcelas = calcularParcelasBoleto(100, datas)
    const soma = parcelas.reduce((acc, p) => acc + p.valor, 0)
    expect(Math.round(soma * 100) / 100).toBe(100)
  })

  it('associa corretamente data e numero a cada parcela', () => {
    const datas = ['2026-05-20', '2026-05-27']
    const parcelas = calcularParcelasBoleto(200, datas)
    expect(parcelas[0]).toMatchObject({ numero: 1, data: '2026-05-20', valor: 100 })
    expect(parcelas[1]).toMatchObject({ numero: 2, data: '2026-05-27', valor: 100 })
  })

  it('datas vazias retorna array vazio', () => {
    expect(calcularParcelasBoleto(1000, [])).toHaveLength(0)
  })

  it('total zero retorna array vazio', () => {
    expect(calcularParcelasBoleto(0, ['2026-05-20'])).toHaveLength(0)
  })

  it('valor quebrado: sem perda de centavo', () => {
    const datas = ['2026-05-20', '2026-05-27', '2026-06-03']
    const parcelas = calcularParcelasBoleto(10, datas)
    const soma = parcelas.reduce((acc, p) => acc + p.valor, 0)
    expect(Math.round(soma * 100) / 100).toBe(10)
  })
})

// ──────────────────────────────────────────────
// formatarDataBR
// ──────────────────────────────────────────────
describe('formatarDataBR', () => {
  it('converte YYYY-MM-DD para DD/MM/YYYY', () => {
    expect(formatarDataBR('2026-05-20')).toBe('20/05/2026')
  })

  it('mantém zero-padding no dia e mês', () => {
    expect(formatarDataBR('2026-01-03')).toBe('03/01/2026')
  })

  it('funciona para datas de virada de ano', () => {
    expect(formatarDataBR('2027-01-01')).toBe('01/01/2027')
  })
})

// ──────────────────────────────────────────────
// formatarIntervaloLabel
// ──────────────────────────────────────────────
describe('formatarIntervaloLabel', () => {
  it('4 parcelas de 7 dias → "7/14/21/28 dias"', () => {
    expect(formatarIntervaloLabel(7, 4)).toBe('7/14/21/28 dias')
  })

  it('1 parcela → "7 dias"', () => {
    expect(formatarIntervaloLabel(7, 1)).toBe('7 dias')
  })

  it('3 parcelas de 30 dias → "30/60/90 dias"', () => {
    expect(formatarIntervaloLabel(30, 3)).toBe('30/60/90 dias')
  })

  it('intervalo zero retorna string vazia', () => {
    expect(formatarIntervaloLabel(0, 4)).toBe('')
  })

  it('zero parcelas retorna string vazia', () => {
    expect(formatarIntervaloLabel(7, 0)).toBe('')
  })
})
