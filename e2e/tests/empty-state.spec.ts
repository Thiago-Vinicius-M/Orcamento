import { test, expect } from "@playwright/test"
import { ClientesPage } from "../pages/ClientesPage"
import { ProdutosPage } from "../pages/ProdutosPage"
import { OrcamentosListPage } from "../pages/OrcamentosListPage"
import { LoginPage } from "../pages/LoginPage"

test.describe("Empty state e navegação", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login("e2e.teste@orcamento.local", "playwright123")
    await loginPage.assertLoggedIn()
  })

  test("navegação: menu Clientes", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: "Clientes", exact: true }).first().click()
    await expect(page).toHaveURL("/clientes")
    await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible()
  })

  test("navegação: menu Produtos", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: "Produtos", exact: true }).first().click()
    await expect(page).toHaveURL("/produtos")
    await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible()
  })

  test("navegação: menu Orçamentos", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: "Orçamentos", exact: true }).first().click()
    await expect(page).toHaveURL("/orcamentos")
    await expect(page.getByRole("heading", { name: "Orçamentos" })).toBeVisible()
  })

  test("empty state: clientes sem dados exibe mensagem", async ({ page }) => {
    const clientesPage = new ClientesPage(page)
    await clientesPage.goto()
    await clientesPage.buscar("xyznonexistent123")
    await clientesPage.verificarEmptyState("Nenhum resultado")
  })
})
