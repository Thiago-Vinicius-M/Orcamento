/**
 * Diagnostico isolado: dispara um signUp publico (mesma rota que `auth/signup`
 * usaria) para validar se o caminho "publico" entrega o e-mail de confirmacao.
 *
 * Se este e-mail chegar mas o do `register-gerente` nao chegar, confirmamos
 * que o bug esta no `admin.createUser` + `admin.generateLink` (que nao
 * dispara mailer) e nao no SMTP.
 *
 * Apaga o usuario criado ao final para nao poluir o banco.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

function loadDotEnvFallback() {
  const envPath = resolve(process.cwd(), '.env')
  let contents = ''
  try {
    contents = readFileSync(envPath, 'utf8')
  } catch {
    return
  }
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const sep = trimmed.indexOf('=')
    if (sep <= 0) continue
    const key = trimmed.slice(0, sep).trim()
    const value = trimmed.slice(sep + 1).trim()
    if (key && !(key in process.env)) {
      process.env[key] = value
    }
  }
}

function requiredEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

async function main() {
  loadDotEnvFallback()
  const SUPABASE_URL = requiredEnv('SUPABASE_URL')
  const SUPABASE_ANON_KEY = requiredEnv('SUPABASE_ANON_KEY')
  const SUPABASE_SERVICE_ROLE_KEY = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  const TEST_EMAIL = requiredEnv('TEST_EMAIL')
  const TEST_PASSWORD = requiredEnv('TEST_PASSWORD')

  const runId = randomUUID().slice(0, 6)
  const aliasEmail = TEST_EMAIL.replace('@', `+diag${runId}@`)
  const redirectTo = process.env.TEST_EMAIL_REDIRECT_TO ?? 'http://localhost:5173/auth/confirm-callback'

  console.log(`[DIAG] runId=${runId}`)
  console.log(`[DIAG] target email (alias com +): ${aliasEmail}`)
  console.log(`[DIAG] redirect: ${redirectTo}`)
  console.log('[DIAG] chamando supabase.auth.signUp() (rota publica /signup)...')

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await anon.auth.signUp({
    email: aliasEmail,
    password: TEST_PASSWORD,
    options: {
      data: { login_code: '999', diag_run_id: runId },
      emailRedirectTo: redirectTo,
    },
  })

  if (error) {
    console.error('[DIAG] signUp error:', error)
    process.exitCode = 1
    return
  }

  console.log(`[DIAG] signUp OK. user_id=${data.user?.id}, email_confirmed_at=${data.user?.email_confirmed_at}`)
  console.log('[DIAG] -> aguardando ~10s para GoTrue terminar o handshake SMTP...')
  await new Promise((r) => setTimeout(r, 10000))

  // Cleanup: apaga o usuario para nao bagunçar o banco
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  if (data.user?.id) {
    const { error: delErr } = await admin.auth.admin.deleteUser(data.user.id)
    if (delErr) {
      console.warn('[DIAG] falha ao apagar usuario (ignorando):', delErr.message)
    } else {
      console.log('[DIAG] usuario diagnostico removido.')
    }
  }

  console.log('========================================================')
  console.log(`[DIAG] Verifique o inbox/spam de ${aliasEmail} (Gmail entrega aliases +diag... no mesmo inbox de ${TEST_EMAIL}).`)
  console.log('  - Se chegar -> mailer Supabase funciona via /signup, mas /admin/generate_link nao envia.')
  console.log('  - Se NAO chegar -> bug eh mais profundo (SMTP/template/Gmail).')
  console.log('========================================================')
}

main().catch((err) => {
  console.error('[DIAG] erro:', err instanceof Error ? err.message : err)
  process.exitCode = 1
})
