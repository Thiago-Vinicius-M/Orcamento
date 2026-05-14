import { normalizeAuthRedirectBaseToOrigin } from '@/lib/normalizeAuthRedirectBase'

/**
 * Origem usada no `emailRedirectTo` do cadastro (Supabase).
 *
 * `VITE_*` é substituído em **build time** pelo Vite: no Vercel, defina
 * `VITE_AUTH_REDIRECT_BASE` no ambiente **Production** e faça um deploy
 * (de preferência “Redeploy” sem cache se o valor mudou).
 */
export function resolveAuthRedirectBase(windowOrigin: string): string {
  const raw = import.meta.env.VITE_AUTH_REDIRECT_BASE as string | undefined
  const origin = normalizeAuthRedirectBaseToOrigin(raw)
  if (origin) {
    return origin
  }

  const rawForLog = String(raw ?? '').trim().replace(/^["']|["']$/g, '').trim()
  if (rawForLog) {
    console.warn('[auth] VITE_AUTH_REDIRECT_BASE inválido; usando a origem atual:', rawForLog)
  }
  return windowOrigin
}
