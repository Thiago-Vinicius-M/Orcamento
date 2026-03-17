import { chromium, type FullConfig } from "@playwright/test"
import dotenv from "dotenv"
import fs from "node:fs/promises"
import path from "node:path"

import { LoginPage } from "./pages/LoginPage"

const STORAGE_STATE_PATH = "e2e/.auth/admin.json"

dotenv.config()

export default async function globalSetup(config: FullConfig) {
  const email =
    process.env.PLAYWRIGHT_TEST_EMAIL ??
    process.env.TEST_USER_EMAIL ??
    "e2e.teste@orcamento.local"
  const password =
    process.env.PLAYWRIGHT_TEST_PASSWORD ??
    process.env.TEST_USER_PASSWORD ??
    "playwright123"

  if (!email || !password) {
    throw new Error(
      "Defina PLAYWRIGHT_TEST_EMAIL e PLAYWRIGHT_TEST_PASSWORD (ou TEST_USER_EMAIL/TEST_USER_PASSWORD) para o usuário de teste.",
    )
  }

  const baseURL =
    config.projects[0]?.use?.baseURL ?? "http://localhost:5173"

  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()

  const loginPage = new LoginPage(page)

  await loginPage.goto()
  await loginPage.login(email, password)
  await loginPage.assertLoggedIn()

  await fs.mkdir(path.dirname(STORAGE_STATE_PATH), { recursive: true })
  await context.storageState({ path: STORAGE_STATE_PATH })

  await browser.close()
}

