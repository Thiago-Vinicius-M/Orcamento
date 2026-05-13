import { expect, type Page } from "@playwright/test"

export class LoginVendedorPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/login-vendedor")
    await this.page.waitForLoadState("networkidle")
  }

  async login(companyCode: string, username: string, password: string) {
    await this.page.getByLabel("Código da empresa").fill(companyCode)
    await this.page.getByLabel("Usuário").fill(username)
    await this.page.getByLabel("Senha").fill(password)
    await this.page.getByRole("button", { name: "Entrar", exact: true }).click()
  }

  async assertLoggedIn() {
    await this.page.waitForURL((url) => !url.pathname.startsWith("/login"))
    await expect(this.page.getByRole("link", { name: "Dashboard" })).toBeVisible()
  }
}
