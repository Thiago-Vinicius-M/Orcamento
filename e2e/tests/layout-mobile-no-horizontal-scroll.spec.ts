import { expect, test, type Page } from "@playwright/test"

import { e2eGerenteEmail, e2eGerentePassword } from "../credentials"
import { LoginPage } from "../pages/LoginPage"

const ROUTES = ["/", "/clientes", "/orcamentos", "/orcamentos/novo"] as const

async function assertNoPageLevelHorizontalOverflow(page: Page) {
  const doc = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(
    doc.scrollWidth,
    "documentElement não deve ultrapassar a largura do viewport",
  ).toBeLessThanOrEqual(doc.clientWidth + 1)

  const body = await page.evaluate(() => ({
    scrollWidth: document.body.scrollWidth,
    clientWidth: document.body.clientWidth,
  }))
  expect(body.scrollWidth, "body não deve ultrapassar a largura do viewport").toBeLessThanOrEqual(
    body.clientWidth + 1,
  )
}

test.describe("layout mobile: sem overflow horizontal na página", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(e2eGerenteEmail, e2eGerentePassword)
    await loginPage.assertLoggedIn()
  })

  for (const route of ROUTES) {
    test(`${route}`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState("load")
      await assertNoPageLevelHorizontalOverflow(page)
    })
  }
})
