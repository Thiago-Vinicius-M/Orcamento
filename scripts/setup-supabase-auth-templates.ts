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

const DEFAULT_CONFIRMATION_SUBJECT = 'Confirme seu cadastro no NewOrca'

const DEFAULT_CONFIRMATION_CONTENT = [
  '<h2>Confirme seu cadastro</h2>',
  '<p>Seu código da empresa é: <strong>{{ .Data.login_code }}</strong></p>',
  '<p>Use esse código para acessar o sistema junto com seu usuário e senha.</p>',
  '<p><a href="{{ .ConfirmationURL }}">Clique aqui para confirmar seu e-mail</a></p>',
].join('\n')

const main = async () => {
  const SUPABASE_URL = requiredEnv('SUPABASE_URL')
  const SUPABASE_ACCESS_TOKEN = requiredEnv('SUPABASE_ACCESS_TOKEN')

  const CONFIRMATION_SUBJECT =
    process.env.CONFIRMATION_SUBJECT ?? DEFAULT_CONFIRMATION_SUBJECT
  const CONFIRMATION_CONTENT =
    process.env.CONFIRMATION_CONTENT ?? DEFAULT_CONFIRMATION_CONTENT

  if (!CONFIRMATION_CONTENT.includes('{{ .Data.login_code }}')) {
    throw new Error(
      'CONFIRMATION_CONTENT must include "{{ .Data.login_code }}" to show company login code.',
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
  console.log('[AUTH TEMPLATES] Confirm sign up now includes "{{ .Data.login_code }}".')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
