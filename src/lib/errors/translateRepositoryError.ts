/**
 * Quando Postgres/RLS devolve "permission denied", substitui por copy específica do recurso.
 */
export function translatePermissionDenied(message: string, permissionFallback: string): string {
  if (message.includes('permission denied')) {
    return permissionFallback
  }
  return message
}

export function repositoryErrorText(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message ?? '')
  }
  if (err instanceof Error) return err.message
  return ''
}
