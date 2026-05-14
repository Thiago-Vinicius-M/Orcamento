import { chromium, type FullConfig } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import fs from "node:fs/promises"
import path from "node:path"

import { e2eGerenteEmail, e2eGerentePassword } from "./credentials"
import { LoginPage } from "./pages/LoginPage"

const STORAGE_STATE_PATH = "e2e/.auth/admin.json"

dotenv.config()

async function assertGerenteCredentialsSignIn() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error(
      "E2E: defina SUPABASE_URL e SUPABASE_ANON_KEY (ou as variáveis VITE_*) para validar o login do gerente.",
    )
  }

  const client = createClient(url, anon)
  const { data, error } = await client.auth.signInWithPassword({
    email: e2eGerenteEmail,
    password: e2eGerentePassword,
  })

  if (error || !data.session) {
    await client.auth.signOut().catch(() => {})
    throw new Error(
      `E2E: credenciais de gerente inválidas para ${e2eGerenteEmail}: ${error?.message ?? "sem sessão"}. ` +
        "Ajuste PLAYWRIGHT_TEST_EMAIL e PLAYWRIGHT_TEST_PASSWORD no `.env` (conta gerente com e-mail confirmado).",
    )
  }

  const role = await client.rpc("current_role")
  await client.auth.signOut()

  if (role.error) {
    throw new Error(`E2E: RPC current_role falhou: ${role.error.message}`)
  }
  if (role.data !== "gerente") {
    throw new Error(
      `E2E: a conta ${e2eGerenteEmail} precisa ser gerente (current_role=${String(role.data)}).`,
    )
  }
}

export default async function globalSetup(config: FullConfig) {
  await assertGerenteCredentialsSignIn()

  const baseURL =
    config.projects[0]?.use?.baseURL ?? "http://localhost:5173"

  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()

  const loginPage = new LoginPage(page)

  await loginPage.goto()
  await loginPage.login(e2eGerenteEmail, e2eGerentePassword)
  await loginPage.assertLoggedIn()

  await fs.mkdir(path.dirname(STORAGE_STATE_PATH), { recursive: true })
  await context.storageState({ path: STORAGE_STATE_PATH })

  await browser.close()
}

