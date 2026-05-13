import { Money } from './money'

export function parseDecimalInput(value: string): number {
  return Money.fromBRLString(value).toNumber()
}

export function parseNullableDecimalInput(value: string): number | null {
  if (value.trim() === '') {
    return null
  }

  const n = Money.fromBRLString(value).toNumber()
  if (n === 0) {
    return null
  }

  return n
}
