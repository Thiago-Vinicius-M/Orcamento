import { describe, expect, it } from 'vitest'
import { digitsOnly, formatCnpjMask, isValidCnpj } from './cnpj'

describe('digitsOnly', () => {
  it('remove não dígitos', () => {
    expect(digitsOnly('12.345.678/0001-90')).toBe('12345678000190')
  })

  it('retorna vazio quando não há dígitos', () => {
    expect(digitsOnly('abc')).toBe('')
  })
})

describe('formatCnpjMask', () => {
  it('aplica máscara progressiva', () => {
    expect(formatCnpjMask('1')).toBe('1')
    expect(formatCnpjMask('12')).toBe('12')
    expect(formatCnpjMask('123')).toBe('12.3')
    expect(formatCnpjMask('12345678')).toBe('12.345.678')
    expect(formatCnpjMask('123456780001')).toBe('12.345.678/0001')
    expect(formatCnpjMask('12345678000190')).toBe('12.345.678/0001-90')
  })

  it('ignora caracteres não numéricos na entrada', () => {
    expect(formatCnpjMask('12.345.678/0001-90')).toBe('12.345.678/0001-90')
  })

  it('corta após 14 dígitos', () => {
    expect(formatCnpjMask('123456780001901234')).toBe('12.345.678/0001-90')
  })
})

describe('isValidCnpj', () => {
  it('aceita CNPJ válido conhecido', () => {
    expect(isValidCnpj('11222333000181')).toBe(true)
  })

  it('aceita entrada mascarada (normaliza com digitsOnly internamente)', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true)
  })

  it('rejeita tamanho diferente de 14', () => {
    expect(isValidCnpj('1122233300018')).toBe(false)
    expect(isValidCnpj('')).toBe(false)
  })

  it('rejeita sequência repetida', () => {
    expect(isValidCnpj('11111111111111')).toBe(false)
  })

  it('rejeita dígitos verificadores incorretos', () => {
    expect(isValidCnpj('11222333000180')).toBe(false)
  })
})
