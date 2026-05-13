/**
 * Normalização leve para busca em memória (sem bibliotecas externas).
 * Unidades com decimais por peso podem evoluir com o cadastro de produto.
 */
export function normalizeSearchQuery(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR')
}

/** `query` vazia após normalizar → sempre casa; senão, `haystack` normalizado deve conter a query normalizada. */
export function matchesSearch(haystack: string, query: string): boolean {
  const nq = normalizeSearchQuery(query)
  if (!nq) return true
  return normalizeSearchQuery(haystack).includes(nq)
}
