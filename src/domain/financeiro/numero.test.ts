import { describe, it, expect } from 'vitest'
import { parseDecimalInput, parseNullableDecimalInput } from './numero'

describe('parseDecimalInput', () => {
  it('parses integer string', () => {
    expect(parseDecimalInput('42')).toBe(42)
  })

  it('parses decimal with dot', () => {
    expect(parseDecimalInput('12.5')).toBe(12.5)
  })

  it('parses decimal with comma (pt-BR format)', () => {
    expect(parseDecimalInput('12,5')).toBe(12.5)
  })

  it('parses milhares pt-BR (ponto + vírgula)', () => {
    expect(parseDecimalInput('1.234,56')).toBe(1234.56)
  })

  it('returns 0 for empty string', () => {
    expect(parseDecimalInput('')).toBe(0)
  })

  it('returns 0 for non-numeric string', () => {
    expect(parseDecimalInput('abc')).toBe(0)
  })

  it('returns 0 for "0"', () => {
    expect(parseDecimalInput('0')).toBe(0)
  })

  it('parses negative values', () => {
    expect(parseDecimalInput('-10')).toBe(-10)
  })

  it('handles whitespace around number', () => {
    expect(parseDecimalInput(' 5 ')).toBe(5)
  })
})

describe('parseNullableDecimalInput', () => {
  it('returns null for empty string', () => {
    expect(parseNullableDecimalInput('')).toBeNull()
  })

  it('returns null for whitespace-only string', () => {
    expect(parseNullableDecimalInput('   ')).toBeNull()
  })

  it('parses valid integer', () => {
    expect(parseNullableDecimalInput('10')).toBe(10)
  })

  it('parses decimal with comma', () => {
    expect(parseNullableDecimalInput('3,14')).toBe(3.14)
  })

  it('parses decimal with dot', () => {
    expect(parseNullableDecimalInput('3.14')).toBe(3.14)
  })

  it('returns null for non-numeric non-empty string', () => {
    expect(parseNullableDecimalInput('abc')).toBeNull()
  })

  it('returns null for "0" (falsy result from Number())', () => {
    expect(parseNullableDecimalInput('0')).toBeNull()
  })
})
