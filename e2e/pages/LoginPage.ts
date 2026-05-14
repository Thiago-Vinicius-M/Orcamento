import { type Page } from "@playwright/test"

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/login")
    await this.page.waitForLoadState("networkidle")
  }

  async login(email: string, senha: string) {
    await this.page.getByLabel("E-mail").fill(email)
    await this.page.getByLabel("Senha").fill(senha)
    await this.page
      .getByRole("button", { name: "Entrar", exact: true })
      .click()
  }

  async assertLoggedIn() {
    const loginPaths = new Set(["/login", "/login-gerente", "/login-vendedor"])
    await this.page.waitForURL((url) => !loginPaths.has(url.pathname))

    // Garante que o layout autenticado foi carregado
    await this.page.getByRole("link", { name: "Dashboard" }).waitFor()
  }
}

