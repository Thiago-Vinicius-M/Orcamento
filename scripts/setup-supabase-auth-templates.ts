import { loadEnv } from 'vite'

import { normalizeAuthRedirectBaseToOrigin } from '../src/lib/normalizeAuthRedirectBase'

/**
 * Mesma resolução de ficheiros `.env*` que o Vite usa em `vite build` / `vite dev`,
 * para `VITE_AUTH_REDIRECT_BASE` (e restantes prefixos) coincidir com o build da app.
 *
 * - Modo: `AUTH_TEMPLATES_VITE_MODE` (default `production`, como `vite build`).
 * - Variáveis já definidas no ambiente (CI, shell) não são sobrescritas.
 */
function mergeViteLoadEnvIntoProcessEnv() {
  const mode = process.env.AUTH_TEMPLATES_VITE_MODE?.trim() || 'production'
  const prefixes = ['VITE_', 'SUPABASE_', 'CONFIRMATION_'] as const
  const loaded = loadEnv(mode, process.cwd(), [...prefixes])

  for (const [key, value] of Object.entries(loaded)) {
    if (value !== undefined && !(key in process.env)) {
      process.env[key] = value
    }
  }
}

const requiredEnv = (name: string): string => {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

const getProjectRefFromSupabaseUrl = (supabaseUrl: string): string => {
  // Ex: https://<project-ref>.supabase.co
  const u = new URL(supabaseUrl)
  const host = u.hostname
  const m = host.match(/^(.+)\.supabase\./)
  if (!m) throw new Error(`Unable to parse project ref from SUPABASE_URL: ${supabaseUrl}`)
  return m[1]
}

const DEFAULT_CONFIRMATION_SUBJECT = 'Confirme seu e-mail — NewOrca'

/** Primário ~violeta; neutros e fundo — apenas hex (clientes de e-mail não suportam oklch). */
const EMAIL_PRIMARY = '#5b4db3'
const EMAIL_PRIMARY_DARK = '#4a3d8f'
const EMAIL_TEXT = '#111827'
const EMAIL_MUTED = '#4b5563'
const EMAIL_PAGE_BG = '#f4f4f8'
const EMAIL_CARD_BG = '#eef2ff'
const EMAIL_WHITE = '#ffffff'
const EMAIL_BORDER = '#e5e7eb'

function getAssetsOriginFromEnv(): string | null {
  return normalizeAuthRedirectBaseToOrigin(process.env.VITE_AUTH_REDIRECT_BASE)
}

function buildDefaultConfirmationContent(assetsOrigin: string | null): string {
  const logoBlock = assetsOrigin
    ? `<tr><td align="center" style="padding:28px 24px 8px;"><img src="${assetsOrigin}/email/logo-orca.png" alt="NewOrca" width="90" height="50" border="0" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;" /></td></tr>`
    : `<tr><td align="center" style="padding:28px 24px 8px;font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:${EMAIL_TEXT};letter-spacing:-0.02em;">NewOrca</td></tr>`

  return [
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${EMAIL_PAGE_BG};margin:0;padding:24px 12px;">`,
    '<tr><td align="center" style="padding:0;">',
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;margin:0 auto;background-color:${EMAIL_WHITE};border-radius:12px;border:1px solid ${EMAIL_BORDER};overflow:hidden;">`,
    logoBlock,
    `<tr><td style="padding:8px 32px 4px;font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:${EMAIL_TEXT};line-height:1.3;text-align:center;">Confirme seu cadastro</td></tr>`,
    `<tr><td style="padding:12px 32px 8px;font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;color:${EMAIL_MUTED};line-height:1.55;text-align:center;">Use o código da empresa abaixo e confirme seu e-mail para concluir o cadastro no NewOrca.</td></tr>`,
    '<tr><td style="padding:16px 32px;">',
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${EMAIL_CARD_BG};border:1px solid ${EMAIL_BORDER};border-radius:10px;">`,
    `<tr><td style="padding:18px 20px 6px;font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;color:${EMAIL_MUTED};text-transform:uppercase;letter-spacing:0.06em;">Código da empresa</td></tr>`,
    `<tr><td style="padding:0 20px 18px;font-family:ui-monospace,Consolas,Monaco,monospace;font-size:26px;font-weight:700;color:${EMAIL_PRIMARY_DARK};letter-spacing:0.12em;text-align:center;">{{ .Data.login_code }}</td></tr>`,
    '</table>',
    '</td></tr>',
    '<tr><td align="center" style="padding:8px 32px 24px;">',
    `<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" bgcolor="${EMAIL_PRIMARY}" style="background-color:${EMAIL_PRIMARY};border-radius:8px;mso-padding-alt:14px 28px;">`,
    `<a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:${EMAIL_WHITE};text-decoration:none;border-radius:8px;">Confirmar e-mail</a>`,
    '</td></tr></table>',
    '</td></tr>',
    `<tr><td style="padding:0 32px 28px;font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;color:${EMAIL_MUTED};line-height:1.6;">`,
    'Se o botão não funcionar, copie e cole este link no navegador:<br />',
    `<a href="{{ .ConfirmationURL }}" style="color:${EMAIL_PRIMARY};word-break:break-all;">{{ .ConfirmationURL }}</a>`,
    '</td></tr>',
    '</table>',
    '</td></tr></table>',
  ].join('')
}

const main = async () => {
  mergeViteLoadEnvIntoProcessEnv()

  const templatesMode = process.env.AUTH_TEMPLATES_VITE_MODE?.trim() || 'production'
  const assetsOrigin = getAssetsOriginFromEnv()
  console.log('[AUTH TEMPLATES] Vite env mode (AUTH_TEMPLATES_VITE_MODE):', templatesMode)
  console.log(
    '[AUTH TEMPLATES] VITE_AUTH_REDIRECT_BASE → assets origin:',
    assetsOrigin ?? '(não definido ou inválido — template sem <img> da logo)',
  )

  const SUPABASE_URL = requiredEnv('SUPABASE_URL')
  const SUPABASE_ACCESS_TOKEN = requiredEnv('SUPABASE_ACCESS_TOKEN')

  const CONFIRMATION_SUBJECT =
    process.env.CONFIRMATION_SUBJECT ?? DEFAULT_CONFIRMATION_SUBJECT
  const CONFIRMATION_CONTENT =
    process.env.CONFIRMATION_CONTENT ??
    buildDefaultConfirmationContent(getAssetsOriginFromEnv())

  if (!CONFIRMATION_CONTENT.includes('{{ .Data.login_code }}')) {
    throw new Error(
      'CONFIRMATION_CONTENT must include "{{ .Data.login_code }}" to show company login code.',
    )
  }

  if (!CONFIRMATION_CONTENT.includes('{{ .ConfirmationURL }}')) {
    throw new Error(
      'CONFIRMATION_CONTENT must include "{{ .ConfirmationURL }}" so users can open the confirmation link.',
    )
  }

  const projectRef = getProjectRefFromSupabaseUrl(SUPABASE_URL)
  const patchUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`

  const patchBody = {
    mailer_subjects_confirmation: CONFIRMATION_SUBJECT,
    mailer_templates_confirmation_content: CONFIRMATION_CONTENT,
  }

  console.log('[AUTH TEMPLATES] Project ref:', projectRef)
  console.log('[AUTH TEMPLATES] Patching Confirm sign up template...')

  const patchRes = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patchBody),
  })

  if (!patchRes.ok) {
    const text = await patchRes.text().catch(() => '')
    throw new Error(
      `[AUTH TEMPLATES] Patch failed: ${patchRes.status} ${patchRes.statusText}\n${text}`,
    )
  }

  console.log('[AUTH TEMPLATES] Patch OK. Template "Confirm sign up" atualizado.')
  console.log(
    '[AUTH TEMPLATES] Confirm sign up includes "{{ .Data.login_code }}" and "{{ .ConfirmationURL }}".',
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
