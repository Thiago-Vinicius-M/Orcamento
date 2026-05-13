/** Em erros 4xx/5xx de `functions.invoke`, a mensagem útil pode vir no JSON de `error.context`. */
export async function parseFunctionsError(err: unknown): Promise<string | null> {
  if (!err || typeof err !== 'object' || !('context' in err)) return null
  const ctx = (err as { context?: unknown }).context
  if (!(ctx instanceof Response)) return null

  try {
    const body = (await ctx.json()) as {
      error?: string
      message?: string
      details?: string
      hint?: string
      code?: string
    }

    const parts: string[] = []
    if (typeof body?.error === 'string' && body.error.trim()) parts.push(body.error.trim())
    else if (typeof body?.message === 'string' && body.message.trim()) parts.push(body.message.trim())

    if (typeof body?.details === 'string' && body.details.trim()) {
      parts.push(`Detalhes: ${body.details.trim()}`)
    }
    if (typeof body?.hint === 'string' && body.hint.trim()) {
      parts.push(`Dica: ${body.hint.trim()}`)
    }
    if (typeof body?.code === 'string' && body.code.trim()) {
      parts.push(`Código: ${body.code.trim()}`)
    }

    if (parts.length > 0) return parts.join(' | ')
  } catch {
    try {
      const text = await ctx.text()
      if (text.trim()) return text.trim()
    } catch {
      // noop
    }
  }

  const statusInfo = ctx.status ? `HTTP ${ctx.status}${ctx.statusText ? ` ${ctx.statusText}` : ''}` : null
  return statusInfo
}
