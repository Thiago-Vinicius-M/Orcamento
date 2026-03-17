export class InvalidIdError extends Error {
  constructor(message = 'Parâmetro "id" deve ser um número inteiro positivo válido.') {
    super(message)
    this.name = "InvalidIdError"
  }
}

export function parseNumericId(raw: unknown, fieldName = "id"): number {
  const value =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? raw[0]
        : raw != null
          ? String(raw)
          : ""

  const parsed = Number(value)

  if (!value || !Number.isInteger(parsed) || parsed <= 0) {
    throw new InvalidIdError(
      `Parâmetro "${fieldName}" deve ser um número inteiro positivo válido.`,
    )
  }

  return parsed
}

