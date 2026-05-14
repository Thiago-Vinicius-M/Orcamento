/**
 * E2E script that exercises the post-SMTP-fix auth flow against the remote
 * Supabase project configured in `.env`:
 *
 *   1. Chama a Edge Function `register-gerente` com TEST_EMAIL → valida que
 *      `success: true` + `login_code` retornam e que o e-mail de confirmacao
 *      eh emitido pelo SMTP custom (Gmail).
 *   2. Marca o usuario como confirmado via Admin API (`updateUserById`) para
 *      permitir o passo de login sem depender de clique manual.
 *   3. `signInWithPassword` para validar credenciais.
 *   4. `resetPasswordForEmail` para validar a entrega do e-mail de recovery.
 *
 * Por padrao mantem o usuario/company criados (KEEP_RECORDS=true) para o
 * usuario validar a entrega dos e-mails na caixa de entrada. Defina
 * `CLEANUP=true` para apagar tudo ao final.
 */
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function postJson(url: string, headers: Record<string, string>, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  let json: unknown
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { rawText: text }
  }
  return { status: response.status, json: json as Record<string, unknown> }
}

async function main() {
  loadDotEnvFallback()

  const SUPABASE_URL = requiredEnv('SUPABASE_URL')
  const SUPABASE_ANON_KEY = requiredEnv('SUPABASE_ANON_KEY')
  const SUPABASE_SERVICE_ROLE_KEY = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  const TEST_EMAIL = requiredEnv('TEST_EMAIL')
  const TEST_PASSWORD = requiredEnv('TEST_PASSWORD')
  const REDIRECT_BASE = process.env.TEST_EMAIL_REDIRECT_TO ?? 'http://localhost:5173/auth/confirm-callback'
  const cleanup = (process.env.CLEANUP ?? '').toLowerCase() === 'true'

  const runId = randomUUID().slice(0, 8)
  const razaoSocial = `E2E Auth ${runId}`
  const username = `e2e_${runId}`

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('========================================================')
  console.log(`[E2E] runId=${runId}`)
  console.log(`[E2E] email destino: ${TEST_EMAIL}`)
  console.log(`[E2E] redirect base: ${REDIRECT_BASE}`)
  console.log(`[E2E] cleanup ao final: ${cleanup ? 'SIM' : 'NAO (KEEP_RECORDS)'}`)
  console.log('========================================================')

  // ---------------------------------------------------------------
  // 1) Cadastro via Edge Function register-gerente
  // ---------------------------------------------------------------
  console.log('[1] Chamando register-gerente...')
  const registerResp = await postJson(
    `${SUPABASE_URL}/functions/v1/register-gerente`,
    {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    {
      razaoSocial,
      cnpj: null,
      username,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      emailRedirectTo: REDIRECT_BASE,
    },
  )

  ensure(registerResp.status === 200, `register-gerente status ${registerResp.status}: ${JSON.stringify(registerResp.json)}`)
  const { success, login_code: loginCode, user_id: userId } = registerResp.json as {
    success?: boolean
    login_code?: string
    user_id?: string
  }
  ensure(success === true, `register-gerente success != true: ${JSON.stringify(registerResp.json)}`)
  ensure(typeof loginCode === 'string' && loginCode.length > 0, 'login_code ausente na resposta')
  ensure(typeof userId === 'string' && userId.length > 0, 'user_id ausente na resposta')

  console.log(`[1] OK -> user_id=${userId}, login_code=${loginCode}`)
  console.log(`[1] E-mail de confirmacao deve estar no inbox (ou spam) de ${TEST_EMAIL}.`)

  // ---------------------------------------------------------------
  // 2) Confirmar e-mail via Admin API (para nao depender de clique manual)
  // ---------------------------------------------------------------
  console.log('[2] Confirmando e-mail via Admin API (email_confirm=true)...')
  const { data: confirmed, error: confirmError } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  })
  ensure(!confirmError && confirmed.user?.email_confirmed_at, `Falha ao confirmar e-mail: ${confirmError?.message ?? 'sem timestamp'}`)
  console.log(`[2] OK -> email_confirmed_at=${confirmed.user.email_confirmed_at}`)

  // ---------------------------------------------------------------
  // 3) Login via signInWithPassword
  // ---------------------------------------------------------------
  console.log('[3] Login via signInWithPassword...')
  const signIn = await publicClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  ensure(!signIn.error, `signInWithPassword falhou: ${signIn.error?.message}`)
  ensure(signIn.data.session, 'Sessao ausente apos login')
  const accessToken = signIn.data.session!.access_token
  const role = (signIn.data.user?.app_metadata as Record<string, unknown> | undefined)?.role
  const companyIdFromMeta = (signIn.data.user?.app_metadata as Record<string, unknown> | undefined)?.company_id
  ensure(role === 'gerente', `role esperado 'gerente', recebido ${JSON.stringify(role)}`)
  console.log(`[3] OK -> role=${role}, company_id=${companyIdFromMeta}`)

  // RPC current_role/current_company_id pela sessao do gerente
  const sessionClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  const rpcRole = await sessionClient.rpc('current_role')
  const rpcCompany = await sessionClient.rpc('current_company_id')
  ensure(!rpcRole.error && rpcRole.data === 'gerente', `current_role esperado 'gerente': ${JSON.stringify(rpcRole)}`)
  ensure(!rpcCompany.error && typeof rpcCompany.data === 'string', `current_company_id falhou: ${JSON.stringify(rpcCompany)}`)
  console.log(`[3] RPC current_role=${rpcRole.data}, current_company_id=${rpcCompany.data}`)

  // ---------------------------------------------------------------
  // 4) Recovery password (resetPasswordForEmail) - dispara e-mail real
  // ---------------------------------------------------------------
  console.log('[4] Disparando resetPasswordForEmail...')
  const { error: recoveryError } = await publicClient.auth.resetPasswordForEmail(TEST_EMAIL, {
    redirectTo: REDIRECT_BASE,
  })
  ensure(!recoveryError, `resetPasswordForEmail falhou: ${recoveryError?.message}`)
  console.log(`[4] OK -> e-mail de recovery enviado para ${TEST_EMAIL}.`)

  // ---------------------------------------------------------------
  // 5) Sumario
  // ---------------------------------------------------------------
  console.log('========================================================')
  console.log('[E2E] Resumo:')
  console.log(`  - user_id        : ${userId}`)
  console.log(`  - company_id     : ${companyIdFromMeta}`)
  console.log(`  - login_code     : ${loginCode}`)
  console.log(`  - email          : ${TEST_EMAIL}`)
  console.log(`  - razao_social   : ${razaoSocial}`)
  console.log(`  - username       : ${username}`)
  console.log('  - Confirmar visualmente os e-mails (Confirm sign up + Recovery)')
  console.log('    no inbox/spam de TEST_EMAIL.')
  console.log('========================================================')

  if (!cleanup) {
    console.log('[E2E] CLEANUP=false -> mantendo usuario/company para verificacao manual.')
    return
  }

  console.log('[E2E] CLEANUP=true -> apagando user + company...')
  await publicClient.auth.signOut()
  if (typeof companyIdFromMeta === 'string') {
    await admin.from('companies').delete().eq('id', companyIdFromMeta)
  }
  await admin.auth.admin.deleteUser(userId)
  console.log('[E2E] Cleanup OK.')
}

main().catch((error) => {
  console.error('[E2E] Falha:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
