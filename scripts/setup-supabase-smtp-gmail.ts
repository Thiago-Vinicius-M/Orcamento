import { createClient } from '@supabase/supabase-js'

const requiredEnv = (name: string): string => {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

const getProjectRefFromSupabaseUrl = (supabaseUrl: string): string => {
  // Ex: https://<project-ref>.supabase.co
  const u = new URL(supabaseUrl)
  const host = u.hostname
  // Match "<project-ref>.supabase.<tld>"
  const m = host.match(/^(.+)\.supabase\./)
  if (!m) throw new Error(`Unable to parse project ref from SUPABASE_URL: ${supabaseUrl}`)
  return m[1]
}

const main = async () => {
  const SUPABASE_URL = requiredEnv('SUPABASE_URL')
  const SUPABASE_ANON_KEY = requiredEnv('SUPABASE_ANON_KEY')
  const SUPABASE_ACCESS_TOKEN = requiredEnv('SUPABASE_ACCESS_TOKEN')

  const SMTP_HOST = requiredEnv('SMTP_HOST')
  const SMTP_PORT_RAW = requiredEnv('SMTP_PORT')
  const SMTP_PORT_NUM = Number(SMTP_PORT_RAW)
  const SMTP_USERNAME = requiredEnv('SMTP_USERNAME')
  const SMTP_APP_PASSWORD = requiredEnv('SMTP_APP_PASSWORD')
  const SMTP_FROM_ADDRESS = requiredEnv('SMTP_FROM_ADDRESS')
  const SMTP_SENDER_NAME = process.env.SMTP_SENDER_NAME ?? 'NewOrca'
  const TEST_EMAIL = process.env.TEST_EMAIL
  const TEST_PASSWORD = process.env.TEST_PASSWORD
  const TEST_EMAIL_REDIRECT_TO = process.env.TEST_EMAIL_REDIRECT_TO ?? 'http://localhost:5173/auth/confirm-callback'
  const SKIP_SIGNUP_TEST = (process.env.SKIP_SIGNUP_TEST ?? '').toLowerCase() === 'true'

  if (!Number.isFinite(SMTP_PORT_NUM) || SMTP_PORT_NUM <= 0 || !Number.isInteger(SMTP_PORT_NUM)) {
    throw new Error(`Invalid SMTP_PORT: ${SMTP_PORT_RAW}`)
  }
  // A Mgmt API espera smtp_port como string (ex: "587"), mas validamos o valor
  // numericamente para evitar enviar lixo. Mantemos a forma canônica string.
  const SMTP_PORT = String(SMTP_PORT_NUM)

  const projectRef = getProjectRefFromSupabaseUrl(SUPABASE_URL)

  console.log('[SMTP] Project ref:', projectRef)

  // Configuração do SMTP via Management API (Supabase Auth SMTP).
  // Fonte: https://supabase.com/docs/guides/auth/auth-smtp
  const patchUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`
  const patchBody = {
    external_email_enabled: true,
    mailer_secure_email_change_enabled: true,
    mailer_autoconfirm: false,
    smtp_admin_email: SMTP_FROM_ADDRESS,
    smtp_host: SMTP_HOST,
    smtp_port: SMTP_PORT,
    smtp_user: SMTP_USERNAME,
    smtp_pass: SMTP_APP_PASSWORD,
    smtp_sender_name: SMTP_SENDER_NAME,
  }

  console.log('[SMTP] Patching auth SMTP config...')
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
    throw new Error(`[SMTP] Patch failed: ${patchRes.status} ${patchRes.statusText}\n${text}`)
  }

  console.log('[SMTP] Patch OK.')

  if (SKIP_SIGNUP_TEST) {
    console.log('[TEST] SKIP_SIGNUP_TEST=true; pulando teste de signup.')
    return
  }

  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error('Provide TEST_EMAIL and TEST_PASSWORD to run the signup test (or set SKIP_SIGNUP_TEST=true).')
  }

  // Dispara um signup via Supabase client (anon key) para gerar/solicitar o e-mail.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  console.log('[TEST] Calling supabase.auth.signUp() for:', TEST_EMAIL)

  const { data, error } = await supabase.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    options: {
      emailRedirectTo: TEST_EMAIL_REDIRECT_TO,
    },
  })

  if (error) {
    // Ex: "User already registered" ou erros de confirmação.
    console.error('[TEST] signUp error:', error)
    throw error
  }

  console.log('[TEST] signUp response OK.')
  console.log('[TEST] data:', data)
  console.log('[TEST] Verifique inbox/spam do TEST_EMAIL_REDIRECT_TO/TEST_EMAIL para confirmar o envio.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

