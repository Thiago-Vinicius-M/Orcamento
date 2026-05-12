/**
 * Script de uso único: apaga todos os usuários em auth.users do projeto Supabase
 * remoto (configurado em .env via SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 *
 * Usado uma vez como parte do plano de reset do banco remoto para a refatoração
 * `companies.login_code` -> bigint generated as identity. Pode ser executado
 * novamente em ambientes de teste sem efeito colateral.
 */
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

async function main() {
  loadDotEnvFallback()
  const supabaseUrl = requiredEnv('SUPABASE_URL')
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let page = 1
  const perPage = 200
  let totalDeleted = 0
  const failures: { id: string; email: string | null; error: string }[] = []

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(`listUsers (page=${page}) falhou: ${error.message}`)
    }
    const users = data?.users ?? []
    if (users.length === 0) break

    console.log(`[reset-auth-users] page ${page}: ${users.length} usuario(s)`)
    for (const user of users) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
      if (deleteError) {
        failures.push({ id: user.id, email: user.email ?? null, error: deleteError.message })
      } else {
        totalDeleted += 1
      }
    }

    if (users.length < perPage) break
  }

  console.log(`[reset-auth-users] total apagados: ${totalDeleted}`)
  if (failures.length > 0) {
    console.error(`[reset-auth-users] falhas (${failures.length}):`)
    for (const f of failures) {
      console.error(`  - ${f.id} (${f.email ?? 'sem email'}): ${f.error}`)
    }
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('[reset-auth-users] erro fatal:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
