/** Mantém apenas os dígitos 0–9 da entrada. */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, '')
}

/**
 * Formata até 14 dígitos no padrão `00.000.000/0000-00`.
 * Útil para máscara na UI; não valida dígitos verificadores.
 */
export function formatCnpjMask(digits: string): string {
  const d = digitsOnly(digits).slice(0, 14)
  const p1 = d.slice(0, 2)
  const p2 = d.slice(2, 5)
  const p3 = d.slice(5, 8)
  const p4 = d.slice(8, 12)
  const p5 = d.slice(12, 14)

  if (d.length <= 2) {
    return p1
  }
  if (d.length <= 5) {
    return `${p1}.${p2}`
  }
  if (d.length <= 8) {
    return `${p1}.${p2}.${p3}`
  }
  if (d.length <= 12) {
    return `${p1}.${p2}.${p3}/${p4}`
  }
  return `${p1}.${p2}.${p3}/${p4}-${p5}`
}

function cnpjDv(base: string, weights: number[]): number {
  let sum = 0
  for (let i = 0; i < base.length; i++) {
    sum += Number(base[i]) * weights[i]!
  }
  const mod = sum % 11
  return mod < 2 ? 0 : 11 - mod
}

/** `digits` deve conter exatamente 14 dígitos. */
export function isValidCnpj(digits: string): boolean {
  const d = digitsOnly(digits)
  if (d.length !== 14) {
    return false
  }
  if (/^(\d)\1{13}$/.test(d)) {
    return false
  }

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const base12 = d.slice(0, 12)
  const dv1 = cnpjDv(base12, w1)
  if (dv1 !== Number(d[12])) {
    return false
  }

  const base13 = d.slice(0, 13)
  const dv2 = cnpjDv(base13, w2)
  return dv2 === Number(d[13])
}
