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
    await this.page.getByRole("button", { name: "Entrar" }).click()
  }

  async assertLoggedIn() {
    // Aguarda redirecionamento para qualquer rota que não seja /login
    await this.page.waitForURL((url) => !url.pathname.startsWith("/login"))

    // Garante que o layout autenticado foi carregado
    await this.page.getByRole("link", { name: "Dashboard" }).waitFor()
  }
}

