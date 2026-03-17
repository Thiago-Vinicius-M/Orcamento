export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET não configurado. Defina a variável de ambiente JWT_SECRET.")
  }
  return secret
}

