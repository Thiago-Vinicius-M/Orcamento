export function parseDecimalInput(value: string): number {
  return Number(value.replace(',', '.')) || 0
}

export function parseNullableDecimalInput(value: string): number | null {
  if (value.trim() === '') {
    return null
  }

  return Number(value.replace(',', '.')) || null
}
