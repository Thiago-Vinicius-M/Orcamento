import { describe, it, expect } from 'vitest'
import { formatCurrencyBRL } from './moeda'

describe('formatCurrencyBRL', () => {
  it('formats zero', () => {
    expect(formatCurrencyBRL(0)).toMatch(/R\$\s*0,00/)
  })

  it('formats integer value', () => {
    expect(formatCurrencyBRL(1000)).toMatch(/R\$\s*1\.000,00/)
  })

  it('formats decimal value', () => {
    expect(formatCurrencyBRL(49.9)).toMatch(/R\$\s*49,90/)
  })

  it('formats large value with thousands separator', () => {
    expect(formatCurrencyBRL(1234567.89)).toMatch(/R\$\s*1\.234\.567,89/)
  })

  it('formats negative value', () => {
    const result = formatCurrencyBRL(-500)
    expect(result).toContain('500,00')
    expect(result).toMatch(/-/)
  })

  it('rounds to 2 decimal places', () => {
    const result = formatCurrencyBRL(10.999)
    expect(result).toMatch(/R\$\s*11,00/)
  })
})
