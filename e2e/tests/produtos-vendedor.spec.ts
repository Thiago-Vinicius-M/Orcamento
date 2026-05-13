import { test, expect } from "@playwright/test"
import { LoginVendedorPage } from "../pages/LoginVendedorPage"

const companyCode = process.env.PLAYWRIGHT_VENDEDOR_COMPANY_CODE
const username = process.env.PLAYWRIGHT_VENDEDOR_USERNAME
const password = process.env.PLAYWRIGHT_VENDEDOR_PASSWORD

const hasVendedorCredentials = Boolean(companyCode && username && password)

test.describe("Produtos - vendedor (somente leitura)", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasVendedorCredentials,
      "Defina PLAYWRIGHT_VENDEDOR_COMPANY_CODE, PLAYWRIGHT_VENDEDOR_USERNAME e PLAYWRIGHT_VENDEDOR_PASSWORD para rodar os testes de vendedor.",
    )

    const loginPage = new LoginVendedorPage(page)
    await loginPage.goto()
    await loginPage.login(companyCode!, username!, password!)
    await loginPage.assertLoggedIn()
  })

  test("vendedor acessa /produtos em modo somente leitura", async ({ page }) => {
    await page.goto("/produtos")

    await expect(page).toHaveURL("/produtos")
    await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Lista de produtos" })).toBeVisible()

    await expect(page.getByRole("button", { name: "Novo", exact: true })).toHaveCount(0)

    await expect(page.getByRole("columnheader", { name: "Ações" })).toHaveCount(0)

    await expect(page.getByRole("button", { name: /^Editar produto/ })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /^Excluir produto/ })).toHaveCount(0)
  })

  test("vendedor não vê formulário de cadastro de produto", async ({ page }) => {
    await page.goto("/produtos")

    await expect(page.getByRole("heading", { name: "Novo produto" })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Editar produto" })).toHaveCount(0)
  })
})
