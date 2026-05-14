/**
 * Normaliza `VITE_AUTH_REDIRECT_BASE` para uma `origin` (sem path).
 * Partilhado entre a app (Vite) e scripts Node — sem `import.meta`.
 */
export function normalizeAuthRedirectBaseToOrigin(raw: string | undefined | null): string | null {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return null

  const cleaned = trimmed.replace(/^["']|["']$/g, '').trim()
  if (!cleaned) return null

  const withProtocol = ensureAbsoluteUrl(cleaned)

  try {
    return new URL(withProtocol).origin
  } catch {
    return null
  }
}

function ensureAbsoluteUrl(input: string): string {
  const t = input.trim()
  if (/^https?:\/\//i.test(t)) {
    return t
  }
  if (/^localhost\b|^127\.0\.0\.1\b/i.test(t)) {
    return `http://${t}`
  }
  return `https://${t}`
}
