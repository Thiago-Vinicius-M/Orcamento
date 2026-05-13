import { formatCurrencyBRL } from './moeda'

/** Arredondamento para inteiro com half-away-from-zero nos .5 */
function roundHalfAwayFromZero(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  const sign = value < 0 ? -1 : 1
  const abs = Math.abs(value)
  const floor = Math.floor(abs)
  const frac = abs - floor
  if (frac < 0.5) return sign * floor
  if (frac > 0.5) return sign * (floor + 1)
  return sign * (floor % 2 === 0 ? floor : floor + 1)
}

function normalizeBrlNumericToken(raw: string): string {
  let t = raw.trim().replace(/\s/g, '').replace(/R\$\s?/gi, '')
  if (t === '') {
    return '0'
  }

  const lastComma = t.lastIndexOf(',')
  const lastDot = t.lastIndexOf('.')

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      t = t.replace(/\./g, '').replace(',', '.')
    } else {
      t = t.replace(/,/g, '')
    }
  } else if (lastComma >= 0) {
    t = t.replace(',', '.')
  } else if (lastDot >= 0) {
    if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
      t = t.replace(/\./g, '')
    }
  }

  return t
}

/** Valor monetário em centavos (inteiro) — entrada/saída e formatação BRL. */
export class Money {
  private readonly centavos: number

  private constructor(centavos: number) {
    this.centavos = centavos
  }

  static zero(): Money {
    return new Money(0)
  }

  /** Interpreta string no estilo pt-BR (vírgula decimal, ponto milhar). */
  static fromBRLString(value: string): Money {
    const normalized = normalizeBrlNumericToken(value)
    const n = Number(normalized)
    if (!Number.isFinite(n)) {
      return Money.zero()
    }
    const cents = roundHalfAwayFromZero(n * 100)
    return new Money(cents)
  }

  static fromCentavos(n: number): Money {
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      return Money.zero()
    }
    return new Money(n)
  }

  /**
   * Converte número em reais para centavos.
   * Arredondamento em centavos: half-even (banker's rounding) no último dígito.
   */
  static fromNumberBRL(n: number): Money {
    if (!Number.isFinite(n)) {
      return Money.zero()
    }
    const scaled = n * 100
    const truncated = scaled >= 0 ? Math.floor(scaled) : Math.ceil(scaled)
    const frac = Math.abs(scaled - truncated)
    if (frac < 0.5) {
      return new Money(truncated)
    }
    if (frac > 0.5) {
      const dir = scaled >= 0 ? 1 : -1
      return new Money(truncated + dir)
    }
    const even = truncated % 2 === 0
    return new Money(even ? truncated : truncated + (scaled >= 0 ? 1 : -1))
  }

  toCentavos(): number {
    return this.centavos
  }

  /** Reais com precisão de 2 casas (para contratos existentes no app). */
  toNumber(): number {
    return this.centavos / 100
  }

  toBRL(): string {
    return formatCurrencyBRL(this.toNumber())
  }

  add(other: Money): Money {
    return new Money(this.centavos + other.centavos)
  }

  sub(other: Money): Money {
    return new Money(this.centavos - other.centavos)
  }

  mul(factor: number): Money {
    if (!Number.isFinite(factor)) {
      return Money.zero()
    }
    return Money.fromCentavos(roundHalfAwayFromZero(this.centavos * factor))
  }

  divide(divisor: number): Money {
    if (!Number.isFinite(divisor) || divisor === 0) {
      return Money.zero()
    }
    return Money.fromCentavos(roundHalfAwayFromZero(this.centavos / divisor))
  }
}
